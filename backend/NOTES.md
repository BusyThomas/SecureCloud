# Assignments 4–5 — SecureCloud File Service

## Team details

- Team ID: To be added
- Team members (roll number and name): To be added

## What this service does

The File Service registers file metadata, reads one file, lists files with query filters, and changes a file between active and deleted states. It stores metadata in an in-process demonstration store; file bytes are not uploaded by this assignment. Internal storage keys are not returned to API callers.

This follows the existing Node.js/Express project. The Python files in the original worksheet are examples of responsibilities, not a requirement to replace this project's stack.

## Run locally

Open two terminals from `backend/`.

Terminal 1 — start the Identity Service demo:

```powershell
npm run start:identity-demo
```

Terminal 2 — start the File Service:

```powershell
$env:IDENTITY_SERVICE_URL = "http://localhost:5001"
npm start
```

The demo Identity Service recognizes the example owner UUID `8c71c880-fcb8-4ea8-a4e1-10c2118bd864`. It returns an active status for that account and 404 for other user IDs. In a deployment, point `IDENTITY_SERVICE_URL` at the real Identity Service. Both services use HTTP APIs and separate application modules; no service reads another service's store.

Run the tests with:

```powershell
npm test
```

The `Authorization` check in this assignment only requires a non-empty header.
It does not authenticate or validate a token; the header exists to demonstrate
HTTP authorization signaling, not to secure a production service.

## Resource table

| Method | URL | What it does | Safe | Idempotent |
|---|---|---|---|---|
| POST | `/api/files` | Register file metadata after checking the owner | No | No; same `Idempotency-Key` safely replays the original create |
| GET | `/api/files?ownerId=...&search=...&sortBy=name&sortOrder=asc&page=...&pageSize=...` | Filter, sort and page a pure read | Yes | Yes |
| GET | `/api/files/{fileId}` | Read one active file, optionally with `If-None-Match` | Yes | Yes |
| PATCH | `/api/files/{fileId}` | Change the name or folder, protected by `If-Match` | No | Sets the same values; stale retries receive 412 |
| POST (fallback) | `/api/files/{fileId}` | Apply `PATCH` or `DELETE` using `X-HTTP-Method-Override` | Same as overridden method | Same as overridden method |
| DELETE | `/api/files/{fileId}` | Mark a file deleted | No | Yes for the resulting deleted state; repeat reports 404 |
| POST | `/api/files/{fileId}/restore` | Restore a deleted file action | No | No; a repeat reports 409 |
| OPTIONS | Collection, file, and restore URLs | Show allowed methods and answer browser preflight | Yes | Yes |

List filters, sorting and pagination are query parameters; supported sort
fields are `name`, `createdAt`, `updatedAt` and `sizeBytes`, with `asc` or
`desc` order. GET does not modify state. Restore is an action sub-resource,
not a verb in the URL. `PUT` is not used because this metadata API does not
expose full-resource replacement.
`X-HTTP-Method-Override: PATCH` or `DELETE` is supported only as a fallback
for constrained clients sending POST.

Unsupported methods return 405 with `Allow`. Collection methods are
`GET, HEAD, POST, OPTIONS`; file methods are `GET, HEAD, PATCH, DELETE,
OPTIONS`; the restore sub-resource accepts `POST, OPTIONS`.

| Result | Status |
|---|---|
| Create / read / update / restore succeeded | 201 / 200 / 200 / 200 |
| Delete / OPTIONS succeeded | 204 |
| Matching cached representation | 304 |
| Invalid request / missing token / missing resource / unsupported method | 400 / 401 / 404 / 405 |
| Unsupported response format / state conflict / stale ETag | 406 / 409 / 412 |
| Missing update precondition / rate limit / oversized body | 428 / 429 / 413 |
| Owner rejected / dependency unavailable | 422 / 503 |

## HTTP headers

| Endpoint | Request headers | Response headers and behavior |
|---|---|---|
| `POST /api/files` | `Authorization`, `Content-Type: application/json`, `Accept`, `Idempotency-Key` | `201`, `Location`, `ETag`, JSON content type; rate-limit, CORS, security and `Vary: Accept` headers |
| `GET /api/files?...` | `Authorization`, `Accept`; filters, sorting and paging in query | `200`, JSON content type, `Cache-Control: no-store`; rate-limit, CORS and security headers |
| `GET /api/files/{fileId}` | `Authorization`, `Accept`, optional `If-None-Match` | `200` + `ETag` and `Cache-Control: private, max-age=60, must-revalidate`, or bodyless `304`; rate-limit, CORS and security headers |
| `PATCH /api/files/{fileId}` | `Authorization`, `Content-Type: application/json`, current `If-Match` | `200`, updated `ETag`, JSON content type; stale ETag gives `412` |
| `DELETE /api/files/{fileId}` | `Authorization` | `204` and no body |
| `POST /api/files/{fileId}/restore` | `Authorization` | `200`, JSON content type and current `ETag` |
| `OPTIONS` / browser preflight | `Origin`, `Access-Control-Request-Method`, `Access-Control-Request-Headers`; no authorization token required | `204`, `Allow`, `Access-Control-Allow-Origin`, allowed methods and headers |

All `/api/files` responses include `X-RateLimit-Limit` and
`X-RateLimit-Remaining`. The demonstration limit is 100 requests per client IP
per 60 seconds; an exceeded budget returns `429` with `Retry-After`. This
in-memory counter is per application process, so a production multi-instance
service should use a shared limiter. JSON error bodies use
`application/problem+json`.

Helmet sets `X-Content-Type-Options: nosniff` and
`Strict-Transport-Security`; CORS currently allows any origin for the class
demo and exposes headers browser clients need. Production should restrict
origins and serve the API over HTTPS. Node supplies `Date`; Express does not
send a `Server` header, and Helmet removes the `X-Powered-By` header. Gzip is
enabled for JSON bodies large enough to benefit from compression.

## Conditional requests and retries

The single-file GET returns a strong ETag based on the public representation.
When `If-None-Match` matches, it returns `304` with no body. A metadata PATCH
requires that current ETag in `If-Match`; a stale value returns `412` without
overwriting the newer version. Missing `If-Match` returns `428`.

| Operation | Retry mechanism | Reason |
|---|---|---|
| Create file | `Idempotency-Key` | Prevents duplicate records and duplicate Identity checks when the original response is lost. |
| Read one file | `If-None-Match` | A matching validator saves the response body; GET is already safe and idempotent. |
| Update file metadata | `If-Match` | Prevents a delayed editor from overwriting a newer update. On 412, read the latest file and decide whether to retry. |
| Delete file | Naturally idempotent state change | Repeating deletion cannot delete a second resource; the API reports 404 once it is already deleted. |
| Restore file | No automatic retry | POST is neither safe nor idempotent in its response. After a timeout, read the file state before deciding what to do. |
| Identity access-status check | One-second timeout and limited retry with backoff and jitter | This read-only dependency request can be retried on network errors, 408, 429 and 5xx, but not other 4xx responses. |

## Assignment 5 answers

1. `POST /api/files` returns 201 with `Location` so the client can address the created resource. `GET /api/files/{fileId}` returns 200 with `ETag` so a client can validate its cached copy. `DELETE /api/files/{fileId}` returns 204 because the state change succeeded and the response needs no body.
2. The list and single-file GETs are safe and idempotent. PATCH is not safe; setting a field to the same value has the same resulting state, although a stale conditional retry receives 412. DELETE is not safe but is idempotent in its resulting state. Create is neither without a key; `Idempotency-Key` makes a repeated same create return the original result.
3. The actual ETag, conditional GET that returns 304, and stale update that returns 412 are shown in [`curl-transcript.txt`](curl-transcript.txt). The 304 avoids transferring an unchanged representation; the 412 prevents a stale editor from overwriting a newer value.
4. The transcript sections **“Valid request rejected by the owner-status rule (422)”** and **“Invalid create body (400 Bad Request)”** contain the exact requests. The first has valid file metadata but owner `38d2f9e1-2506-4a1b-85b5-692e0c110972`, which the Identity check refuses, so it returns 422. The second has `sizeBytes: -1`, which is invalid request data, so it returns 400 before the Identity call.
5. The browser blocked the cross-origin response; the server can still log a 200 because CORS is enforced by browsers, not by the server. `Access-Control-Allow-Origin` allows the browser to expose the response. This demonstration uses `*`; production should set the specific trusted origin.
6. A single-file GET can be cached privately for 60 seconds and revalidated using ETag. A personalized file list uses `Cache-Control: no-store` to avoid retaining a user's list.
7. POST can be appropriate for a complex search body with sensitive or very long criteria that do not fit safely in a URL. Switching from GET gives up safe/read-only semantics, natural idempotence, ordinary URL bookmarking, and common HTTP caching.
8. On 201, `Location` identifies the newly created file. On a 3xx response, it identifies the redirect target; this API does not currently issue redirects.

## Complete HTTP exchange

This is a real create exchange captured with `curl -v` over HTTP/1.1. The
Authorization value is a fake coursework placeholder; only header presence is
checked.

**Request (HTTP/1.1):**

```http
POST /api/files HTTP/1.1
Host: localhost:5000
User-Agent: curl/8.21.0
Accept: */*
Authorization: Bearer assignment-demo-token
Content-Type: application/json
Idempotency-Key: assignment5-final-20261013-002
Content-Length: 220

{"ownerId":"8c71c880-fcb8-4ea8-a4e1-10c2118bd864","name":"assignment5-live-example.pdf","contentType":"application/pdf","sizeBytes":128,"checksumSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
```

**Response:**

```http
HTTP/1.1 201 Created
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: Allow,ETag,Location,Retry-After,X-RateLimit-Limit,X-RateLimit-Remaining
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
Vary: Accept, Accept-Encoding
Cache-Control: no-store
Location: /api/files/33b5f622-5d65-4e98-8ba7-d46f90e3116f
ETag: "da60dcedb5b90bfd7bd0d8787c55e4880c32b50459c61b8e899ff513e02999a1"
Content-Type: application/json; charset=utf-8
Content-Length: 376
Date: Tue, 13 Oct 2026 17:19:11 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"33b5f622-5d65-4e98-8ba7-d46f90e3116f","ownerId":"8c71c880-fcb8-4ea8-a4e1-10c2118bd864","folderId":null,"name":"assignment5-live-example.pdf","contentType":"application/pdf","sizeBytes":128,"checksumSha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","status":"active","createdAt":"2026-10-13T17:19:11.687Z","updatedAt":"2026-10-13T17:19:11.687Z"}
```

The unabridged `curl -v` evidence, including the repeat, 304, 412, 400, 404
and 401 cases, is in [`curl-transcript.txt`](curl-transcript.txt).

## Hard resource-design choice

Restoring a deleted file is an action rather than ordinary CRUD. I modelled it as `POST /api/files/{fileId}/restore`, a sub-resource of the file, so the URL still names the file being changed. A verb URL such as `/restoreFile` and a state-changing `GET` were rejected.

## Dependency call and fallback

When a new file is registered, the File Service makes an HTTP `GET` to the Identity Service's `/users/{userId}/access-status` contract and creates the record only if the owner is active. The URL is read from `IDENTITY_SERVICE_URL`; the call has a one-second timeout and retries only network failures, 408, 429, and 5xx with exponential backoff and jitter. It never retries 4xx responses. Since this is a read-only check, it is safe to retry.

If Identity is unavailable after the retries, the file create fails with 503. The service fails closed rather than creating an ownerless file or bypassing the active-account check; it does not return a success-shaped fallback. The caller can safely retry the create with the same `Idempotency-Key`.

## Idempotency

`POST /api/files` requires an `Idempotency-Key`. Repeating the same owner, key, and request body returns the original 201 response and `Location` without creating another file or repeating the Identity call. Concurrent requests with the same key also share one create operation. Reusing the key with a different body returns 409. This protects against duplicate metadata records if a client loses the create response and retries. The demonstration store is in memory, so records and idempotency history reset when the service restarts.

## Assignment 4 answers

1. The Assignment 3 WSDL is **104 lines**. The original Assignment 4 OpenAPI contract was **285 lines**; the current Assignment 5 version is **664 lines** because it documents method override, conditional requests, authorization signaling, rate limiting, CORS and their responses. WSDL spends lines describing XML namespaces and types, SOAP messages, SOAP port type, HTTP binding, SOAPAction and endpoint; OpenAPI describes HTTP paths and JSON schemas directly, without SOAP envelopes/messages or a SOAP binding.
2. The Assignment 3 SOAP fault `THREAT_DETECTED` would map to HTTP **422** and the common Problem response `{"type":"https://securecloud.example.com/problems/invalid-file","title":"Invalid file","status":422,"detail":"The file failed the security scan."}`. This assignment's running File Service does not call the design-only scanner yet. Returning the scanner fault as HTTP 200 would make network clients, gateways, and retry logic treat a failed operation as a successful response.
3. UDDI's **publish**, **find**, and **bind** jobs map to deployment/configuration publishing an API contract, locating the Identity Service through configuration/service discovery, and calling its HTTP contract. No UDDI registry is run; this project uses `IDENTITY_SERVICE_URL` for the local integration.
4. `validateCreateFile()` in `src/files/models.js` validates the request before the handler reads file fields or calls Identity. Without it, a missing/invalid owner, malformed media type, negative size, or bad checksum could be stored or forwarded.
5. SOAP remains a reasonable choice for SecureCloud's external malware scanner when a partner requires a WSDL-defined XML contract and message-level security. The guarantee to buy is a formally agreed XML message/operation/fault contract (and the partner's chosen message-security policy), not automatic security just from choosing SOAP.

## Evidence

- [`assignment-04-curl-transcript.txt`](assignment-04-curl-transcript.txt) preserves Assignment 4 create, replay, list, malformed-body, missing-file and state-conflict evidence.
- [`curl-transcript.txt`](curl-transcript.txt) records Assignment 5 live HTTP/1.1 requests and responses, including retries, caching, conditional updates, sorting and required failures.
- [`test-results.txt`](test-results.txt) contains the passing Node test output (the Express project's equivalent to the worksheet's pytest run).
- [`openapi-validation.txt`](openapi-validation.txt) contains the OpenAPI validation output: zero errors and one informational metadata warning because no project license was supplied.
- [`openapi.yaml`](openapi.yaml) is the API contract.
- [Assignment 5 submission ZIP](../docs/assignments/assignment-05-submission.zip) contains the service source, contract, tests and evidence.

## Assignment 6: honest statuses, validation and formats

The worksheet names an Orders service. SecureCloud implements a File Service, so
this submission applies the same requirements to the matching create, list,
read, update, delete and restore file operations; it does not add a separate
Orders service. The API still uses the Assignment 5 service and keeps its
idempotency and retry behavior.

Successful responses use JSON by default. Send `Accept: application/xml` to
receive an XML file or file-list representation. Every error uses the same
Problem Details JSON shape and `application/problem+json; charset=utf-8`,
regardless of the requested success format. Validation is performed before
the Identity Service check or any file-state change.

### Request validation

`POST /api/files` accepts a JSON object with required `ownerId` (UUID), `name`
(1–255 non-blank characters), `contentType` (media type), `sizeBytes`
(non-negative safe integer), and `checksumSha256` (64 hexadecimal SHA-256
characters); `folderId` is optional and may be null or a UUID. Unknown fields
are rejected. The server collects every field error and returns one 422 before
checking the owner or creating a record. `PATCH` similarly checks all
provided `name` and `folderId` fields before looking up/changing a record.

### Status map

| Endpoint | Success | Failure statuses and why |
|---|---|---|
| `POST /api/files` | 201 Created, `Location`, ETag, representation | 400 malformed JSON or missing/invalid idempotency key; 401 missing Authorization header; 405 unsupported method; 406 unacceptable response format; 409 key reused for different data; 413 body over 1 MB; 422 invalid fields or inactive/unknown owner; 429 request limit; 502 invalid Identity response; 503 Identity unavailable after safe retries; 500 unexpected server failure. |
| `GET /api/files?ownerId=...` | 200 page of files | 400 invalid filter, sort or pagination; 401 missing Authorization header; 405 unsupported method; 406 unacceptable response format; 429 request limit; 500 unexpected server failure. |
| `GET /api/files/{fileId}` | 200 file, or 304 when its selected representation's ETag matches | 400 invalid ID; 401 missing Authorization header; 404 missing or deleted file; 405 unsupported method; 406 unacceptable response format; 429 request limit; 500 unexpected server failure. |
| `PATCH /api/files/{fileId}` | 200 updated file and ETag | 400 malformed JSON or invalid ID; 401 missing Authorization header; 404 missing/deleted file; 405 unsupported method; 406 unacceptable response format; 412 stale `If-Match`; 422 field validation; 428 missing `If-Match`; 429 request limit; 500 unexpected server failure. |
| `DELETE /api/files/{fileId}` | 204, no response body | 400 invalid ID; 401 missing Authorization header; 404 missing/already-deleted file; 405 unsupported method; 406 unacceptable response format; 429 request limit; 500 unexpected server failure. |
| `POST /api/files/{fileId}/restore` | 200 restored file and ETag | 400 invalid ID; 401 missing Authorization header; 404 missing file; 405 unsupported method; 406 unacceptable response format; 409 file is not deleted; 429 request limit; 500 unexpected server failure. |

`OPTIONS` returns 204 and `Allow`; its browser preflight does not require the
Authorization header. `HEAD` follows the corresponding GET route without a
response body. The File Service returns 204 for DELETE because it has no result
representation to send. It returns a real failure status, never 200 with
`{"ok":false}`.

### Stable Problem Details type catalogue

All type values are stable URI suffixes under
`https://securecloud.example.com/problems/`.

| Type suffix | Trigger |
|---|---|
| `invalid-file` | One or more invalid fields on file creation. |
| `invalid-file-update` | One or more invalid fields on a metadata update. |
| `idempotency-key-required` | Missing, empty or oversized create key. |
| `idempotency-key-reused` | The same key is reused with a different request body. |
| `invalid-file-id` / `file-not-found` | Invalid ID format / no active file at that ID. |
| `invalid-filter` / `invalid-pagination` / `invalid-sort` | Invalid file-list query parameters. |
| `precondition-required` / `precondition-failed` | Missing or stale `If-Match` on PATCH. |
| `file-state-conflict` | Restore requested for a file that is not deleted. |
| `authentication-required` | Authorization header is missing or empty; its token is not validated in this coursework demo. |
| `not-acceptable` | Accept does not allow JSON or XML. |
| `rate-limit-exceeded` | Per-client request budget exceeded; includes `Retry-After`. |
| `owner-unavailable` | Identity says the owner does not exist or is inactive. |
| `identity-service-unavailable` | Identity cannot be reached or remains unavailable after retries; includes `Retry-After`. |
| `invalid-identity-response` / `identity-service-rejected` | Identity returns malformed data / a non-retryable error. |
| `malformed-json` / `request-too-large` | Invalid JSON / request body over 1 MB. |
| `method-not-allowed` / `route-not-found` | Unsupported method / unknown API route. |
| `internal-error` | Unexpected server failure; only a generic message reaches the client. |

### Answers

1. The complete endpoint status map is above. Each status represents the
   operation result; error responses use non-2xx status codes.
2. The catalogue above documents each stable type suffix and its trigger.
3. A Problem Details response has `type` (stable category URI), `title`
   (short summary), `status` (same HTTP status), and `detail` (safe explanation).
   Validation responses also include `errors`, an array of `{field, message}`.
4. This actual validation response reports four invalid fields at once; the
   request and full headers are in [`transcript.txt`](transcript.txt):

   ```json
   {
     "type": "https://securecloud.example.com/problems/invalid-file",
     "title": "Invalid file",
     "status": 422,
     "detail": "ownerId: A valid user UUID is required. name: A file name between 1 and 255 characters is required. sizeBytes: The file size must be a non-negative safe integer. checksumSha256: A 64-character SHA-256 checksum is required.",
     "errors": [
       {"field": "ownerId", "message": "A valid user UUID is required."},
       {"field": "name", "message": "A file name between 1 and 255 characters is required."},
       {"field": "sizeBytes", "message": "The file size must be a non-negative safe integer."},
       {"field": "checksumSha256", "message": "A 64-character SHA-256 checksum is required."}
     ]
   }
   ```

5. GET and the Identity status check are safe to retry after transient network
   failures, 408, 429 or 503. A create can be retried with exactly the same
   `Idempotency-Key` and body. 429 and 503 include `Retry-After`; do not resend
   an unchanged 4xx request. PATCH requires the current ETag; after an uncertain
   result, read the file and retry only if the condition still holds. DELETE
   does not delete a second file, but a repeat after deletion returns 404.
   Restore is a POST action, so check the file state before retrying after a
   timeout.
6. `errorHandler()` logs unexpected server errors and returns a generic 500
   Problem Details response. Identity response parsing and failures are mapped
   to safe 502/503 responses. Stack traces, database messages and upstream
   response bodies are not sent to the caller.
7. The same file is shown as JSON with the default `Accept: */*` and as XML
   with `Accept: application/xml` in the transcript. JSON and XML have distinct
   ETags, so a validator from one representation cannot incorrectly produce a
   304 for the other. Unsupported `Accept: text/plain` returns 406.

429 rate-limit responses and 503 Identity failures both carry `Retry-After`.
The server produces all validation errors in one 422 response before calling
Identity. CORS, security headers, authentication-header signaling, conditional
requests, idempotent creates and retries from Assignment 5 remain covered.

### Assignment 6 evidence

- [`transcript.txt`](transcript.txt) contains live `curl -i` success, JSON/XML
  negotiation, two-or-more field validation, unknown file, illegal restore
  transition, rate limiting, unsupported format, 503 retry guidance and
  Assignment 5 idempotency/conditional-request checks.
- [`test-results.txt`](test-results.txt) records all passing automated checks.
- [`openapi.yaml`](openapi.yaml) documents success formats, status codes,
  field-level Problem Details, and retry headers.
- [Assignment 6 submission ZIP](../docs/assignments/assignment-06-submission.zip)
  contains the updated service, tests, contract, notes and evidence.
