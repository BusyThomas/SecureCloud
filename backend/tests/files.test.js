const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createApp } = require("../src/app");
const { createIdentityDemoApp, DEMO_USER_ID } = require("../src/identity-demo");
const { FileStore } = require("../src/files/store");
const { createRateLimiter } = require("../src/files/http");

const OTHER_USER_ID = "38d2f9e1-2506-4a1b-85b5-692e0c110972";
const SHA256 = "a".repeat(64);

let identityServer;
let filesServer;
let identityServiceUrl;
let filesBaseUrl;
let identityResponses;
let identityRequests;
let retryDelays;
let store;

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1");
    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function createInput(overrides = {}) {
  return {
    ownerId: DEMO_USER_ID,
    name: "assignment-report.pdf",
    contentType: "application/pdf",
    sizeBytes: 128,
    checksumSha256: SHA256,
    ...overrides,
  };
}

async function createFile(
  input = createInput(),
  key = crypto.randomUUID(),
  extraHeaders = {},
) {
  return fetch(`${filesBaseUrl}/api/files`, {
    method: "POST",
    headers: {
      Authorization: "Bearer assignment-test-token",
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      ...extraHeaders,
    },
    body: JSON.stringify(input),
  });
}

function fileRequest(path = "", options = {}) {
  return fetch(`${filesBaseUrl}/api/files${path}`, {
    ...options,
    headers: {
      Authorization: "Bearer assignment-test-token",
      ...(options.headers || {}),
    },
  });
}

const crypto = require("node:crypto");

before(async () => {
  identityRequests = [];
  retryDelays = [];
  identityResponses = [];

  const identityApp = require("express")();
  identityApp.get("/users/:userId/access-status", (req, res) => {
    identityRequests.push({ method: req.method, url: req.url });
    const next = identityResponses.shift();
    if (next && next.status !== 200) {
      return res.status(next.status).json({ status: "unavailable" });
    }
    return res.status(next && next.status === 200 ? 200 : 200).json({
      status: next && next.accountStatus ? next.accountStatus : "active",
    });
  });

  identityServer = await listen(identityApp);
  identityServiceUrl = `http://127.0.0.1:${identityServer.address().port}`;
  store = new FileStore();
  filesServer = await listen(
    createApp({
      store,
      identityServiceUrl,
      logRequests: false,
      retries: 2,
      timeoutMs: 250,
      baseDelayMs: 100,
      random: () => 0.5,
      sleep: async (ms) => retryDelays.push(ms),
    }),
  );
  filesBaseUrl = `http://127.0.0.1:${filesServer.address().port}`;
});

after(async () => {
  await close(filesServer);
  await close(identityServer);
});

test("create returns 201, Location, and a public representation", async () => {
  const response = await createFile();
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  assert.match(response.headers.get("content-type"), /charset=utf-8/i);
  assert.equal(response.headers.get("location"), `/api/files/${body.id}`);
  assert.equal(body.name, "assignment-report.pdf");
  assert.equal(body.status, "active");
  assert.equal("storageKey" in body, false);
  assert.equal("passwordHash" in body, false);
  assert.equal(identityRequests.at(-1).method, "GET");
});

test("a repeated create with the same key returns the original result", async () => {
  const key = crypto.randomUUID();
  const first = await createFile(createInput(), key);
  const firstBody = await first.json();
  const callsBeforeRepeat = identityRequests.length;

  const repeat = await createFile(createInput(), key);
  const repeatBody = await repeat.json();

  assert.equal(repeat.status, 201);
  assert.equal(repeat.headers.get("location"), first.headers.get("location"));
  assert.deepEqual(repeatBody, firstBody);
  assert.equal(identityRequests.length, callsBeforeRepeat);
});

test("an idempotency replay returns the original result after later changes", async () => {
  const key = crypto.randomUUID();
  const first = await createFile(createInput(), key);
  const original = await first.json();
  const originalEtag = first.headers.get("etag");
  const updated = await fileRequest(`/${original.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": originalEtag,
    },
    body: JSON.stringify({ name: "changed-after-create.pdf" }),
  });
  assert.equal(updated.status, 200);

  const replay = await createFile(createInput(), key);
  assert.equal(replay.status, 201);
  assert.equal(replay.headers.get("etag"), originalEtag);
  assert.deepEqual(await replay.json(), original);
});

test("concurrent creates with the same key create one file", async () => {
  const key = crypto.randomUUID();
  const filesBefore = store.files.size;
  const callsBefore = identityRequests.length;

  const [first, second] = await Promise.all([
    createFile(createInput(), key),
    createFile(createInput(), key),
  ]);
  const [firstBody, secondBody] = await Promise.all([
    first.json(),
    second.json(),
  ]);

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(firstBody.id, secondBody.id);
  assert.equal(store.files.size, filesBefore + 1);
  assert.equal(identityRequests.length, callsBefore + 1);
});

test("reusing an idempotency key with a different body returns 409", async () => {
  const key = crypto.randomUUID();
  await createFile(createInput(), key);
  const response = await createFile(
    createInput({ name: "different.pdf" }),
    key,
  );
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.status, 409);
  assert.match(body.type, /idempotency-key-reused$/);
});

test("validation collects every invalid field in one 422 problem response", async () => {
  const beforeInvalidRequest = identityRequests.length;
  const invalid = await createFile(
    createInput({
      ownerId: "not-a-uuid",
      name: "",
      sizeBytes: -1,
      checksumSha256: "bad",
    }),
  );
  const invalidBody = await invalid.json();

  assert.equal(invalid.status, 422);
  assert.equal(invalid.headers.get("content-type").split(";")[0], "application/problem+json");
  assert.match(invalid.headers.get("content-type"), /charset=utf-8/i);
  assert.equal(invalidBody.status, 422);
  assert.equal(invalidBody.type.endsWith("/invalid-file"), true);
  assert.match(invalidBody.detail, /sizeBytes/);
  assert.deepEqual(
    invalidBody.errors.map((error) => error.field),
    ["ownerId", "name", "sizeBytes", "checksumSha256"],
  );

  const malformed = await fetch(`${filesBaseUrl}/api/files`, {
    method: "POST",
    headers: {
      Authorization: "Bearer assignment-test-token",
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: '{"ownerId":',
  });
  const malformedBody = await malformed.json();
  assert.equal(malformed.status, 400);
  assert.equal(malformedBody.type.endsWith("/malformed-json"), true);
  assert.equal(identityRequests.length, beforeInvalidRequest);
});

test("XML negotiation returns an XML variant with its own ETag", async () => {
  const created = await createFile();
  const file = await created.json();
  const jsonRead = await fileRequest(`/${file.id}`);
  const jsonEtag = jsonRead.headers.get("etag");
  assert.match(jsonRead.headers.get("content-type"), /^application\/json; charset=utf-8$/);

  const xmlRead = await fileRequest(`/${file.id}`, {
    headers: { Accept: "application/xml" },
  });
  const xmlBody = await xmlRead.text();
  const xmlEtag = xmlRead.headers.get("etag");
  assert.equal(xmlRead.status, 200);
  assert.match(xmlRead.headers.get("content-type"), /^application\/xml; charset=utf-8$/);
  assert.match(xmlRead.headers.get("vary"), /Accept/i);
  assert.match(xmlBody, /^<\?xml version="1\.0" encoding="UTF-8"\?><file>/);
  assert.match(xmlBody, new RegExp(`<id>${file.id}</id>`));
  assert.notEqual(xmlEtag, jsonEtag);

  const xmlNotModified = await fileRequest(`/${file.id}`, {
    headers: { Accept: "application/xml", "If-None-Match": xmlEtag },
  });
  assert.equal(xmlNotModified.status, 304);
  assert.equal(await xmlNotModified.text(), "");

  const jsonStillModified = await fileRequest(`/${file.id}`, {
    headers: { "If-None-Match": xmlEtag },
  });
  assert.equal(jsonStillModified.status, 200);

  const xmlCreated = await createFile(
    createInput({ name: "A&B <brief>.pdf" }),
    crypto.randomUUID(),
    { Accept: "application/xml" },
  );
  assert.equal(xmlCreated.status, 201);
  assert.match(xmlCreated.headers.get("content-type"), /^application\/xml; charset=utf-8$/);
  assert.match(await xmlCreated.text(), /<name>A&amp;B &lt;brief&gt;\.pdf<\/name>/);

  const xmlList = await fileRequest(`?${new URLSearchParams({ ownerId: DEMO_USER_ID })}`, {
    headers: { Accept: "application/xml" },
  });
  assert.equal(xmlList.status, 200);
  assert.match(xmlList.headers.get("content-type"), /^application\/xml; charset=utf-8$/);
  assert.match(await xmlList.text(), /<files><items><item><id>/);
});

test("an unavailable Identity Service returns 503 with Retry-After", async () => {
  identityResponses = [{ status: 503 }];
  const unavailableServer = await listen(
    createApp({
      identityServiceUrl,
      retries: 0,
      logRequests: false,
    }),
  );
  try {
    const response = await fetch(
      `http://127.0.0.1:${unavailableServer.address().port}/api/files`,
      {
        method: "POST",
        headers: {
          Authorization: "******",
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(createInput()),
      },
    );
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "1");
    assert.equal(response.headers.get("content-type").split(";")[0], "application/problem+json");
    assert.equal(body.status, 503);
  } finally {
    await close(unavailableServer);
  }
});

test("Identity timeout retries once and succeeds on the next attempt", async () => {
  let attempts = 0;
  const fetchWithOneTimeout = (url, { signal }) => {
    attempts += 1;
    if (attempts > 1) {
      return Promise.resolve(
        new Response(JSON.stringify({ status: "active" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return new Promise((resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Request timed out", "AbortError")),
        { once: true },
      );
    });
  };
  const timeoutServer = await listen(
    createApp({
      identityServiceUrl: "http://identity.example",
      fetchImpl: fetchWithOneTimeout,
      retries: 1,
      timeoutMs: 10,
      baseDelayMs: 1,
      random: () => 0,
      sleep: async () => {},
      logRequests: false,
    }),
  );
  try {
    const response = await fetch(
      `http://127.0.0.1:${timeoutServer.address().port}/api/files`,
      {
        method: "POST",
        headers: {
          Authorization: "******",
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(createInput()),
      },
    );
    assert.equal(response.status, 201);
    assert.equal(attempts, 2);
  } finally {
    await close(timeoutServer);
  }
});

test("PATCH validation reports multiple field errors before resource lookup", async () => {
  const response = await fileRequest(`/${crypto.randomUUID()}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": '"unused"',
    },
    body: JSON.stringify({ name: "", folderId: "not-a-uuid" }),
  });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.errors.length, 2);
  assert.deepEqual(body.errors.map((error) => error.field), ["name", "folderId"]);
});

test("an unknown file returns 404", async () => {
  const response = await fileRequest(`/${crypto.randomUUID()}`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.status, 404);
  assert.match(body.type, /file-not-found$/);
});

test("list filters, sorts, and paginates through query parameters", async () => {
  const listOwnerId = crypto.randomUUID();
  await createFile(
    createInput({ ownerId: listOwnerId, name: "report-one.pdf" }),
  );
  await createFile(
    createInput({ ownerId: listOwnerId, name: "report-two.pdf" }),
  );
  await createFile(
    createInput({ ownerId: listOwnerId, name: "image.png", contentType: "image/png" }),
  );
  await createFile(
    createInput({ ownerId: OTHER_USER_ID, name: "report-other.pdf" }),
  );

  const query = new URLSearchParams({
    ownerId: listOwnerId,
    search: "report",
    page: "1",
    pageSize: "1",
    sortBy: "name",
    sortOrder: "desc",
  });
  const response = await fileRequest(`?${query}`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.total, 2);
  assert.equal(body.items.length, 1);
  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 1);
  assert.equal(body.items[0].name, "report-two.pdf");

  const invalidSort = await fileRequest(`?${new URLSearchParams({
    ownerId: listOwnerId,
    sortBy: "unsupported",
  })}`);
  assert.equal(invalidSort.status, 400);
});

test("delete and restore change file state and reject illegal transitions", async () => {
  const created = await createFile(createInput());
  const file = await created.json();

  const conflict = await fileRequest(`/${file.id}/restore`, {
    method: "POST",
  });
  assert.equal(conflict.status, 409);

  const deleted = await fileRequest(`/${file.id}`, {
    method: "DELETE",
  });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), "");

  const notFound = await fileRequest(`/${file.id}`);
  assert.equal(notFound.status, 404);

  const restored = await fileRequest(
    `/${file.id}/restore`,
    { method: "POST" },
  );
  const restoredBody = await restored.json();
  assert.equal(restored.status, 200);
  assert.equal(restoredBody.status, "active");
});

test("single-file reads support ETags and conditional GET", async () => {
  const created = await createFile();
  const file = await created.json();
  const response = await fileRequest(`/${file.id}`);
  const etag = response.headers.get("etag");

  assert.equal(response.status, 200);
  assert.ok(etag);
  assert.match(response.headers.get("cache-control"), /private/);
  assert.equal(response.headers.get("x-ratelimit-limit"), "100");
  assert.ok(Number(response.headers.get("x-ratelimit-remaining")) < 100);

  const notModified = await fileRequest(`/${file.id}`, {
    headers: { "If-None-Match": etag },
  });
  assert.equal(notModified.status, 304);
  assert.equal(await notModified.text(), "");
  assert.equal(notModified.headers.get("etag"), etag);
});

test("PATCH requires a current If-Match ETag and changes the ETag", async () => {
  const created = await createFile();
  const file = await created.json();
  const current = await fileRequest(`/${file.id}`);
  const originalEtag = current.headers.get("etag");

  const missingPrecondition = await fileRequest(`/${file.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "renamed-report.pdf" }),
  });
  assert.equal(missingPrecondition.status, 428);

  const updated = await fileRequest(`/${file.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": originalEtag,
    },
    body: JSON.stringify({ name: "renamed-report.pdf" }),
  });
  const updatedBody = await updated.json();
  const updatedEtag = updated.headers.get("etag");
  assert.equal(updated.status, 200);
  assert.equal(updatedBody.name, "renamed-report.pdf");
  assert.notEqual(updatedEtag, originalEtag);

  const staleUpdate = await fileRequest(`/${file.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": originalEtag,
    },
    body: JSON.stringify({ name: "stale-name.pdf" }),
  });
  assert.equal(staleUpdate.status, 412);
  assert.equal(staleUpdate.headers.get("etag"), updatedEtag);
  assert.match((await staleUpdate.json()).type, /precondition-failed$/);
});

test("authorization, content negotiation, method override, and OPTIONS are explicit", async () => {
  const unauthenticated = await fetch(`${filesBaseUrl}/api/files`);
  assert.equal(unauthenticated.status, 401);
  assert.equal(
    unauthenticated.headers.get("www-authenticate"),
    'Bearer realm="SecureCloud API"',
  );

  const emptyToken = await fetch(`${filesBaseUrl}/api/files`, {
    headers: { Authorization: "   " },
  });
  assert.equal(emptyToken.status, 401);

  const unsupported = await fileRequest("", {
    headers: { Accept: "text/plain" },
  });
  assert.equal(unsupported.status, 406);
  assert.equal(
    unsupported.headers.get("content-type").split(";")[0],
    "application/problem+json",
  );

  const options = await fetch(`${filesBaseUrl}/api/files/${crypto.randomUUID()}`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://client.example",
      "Access-Control-Request-Method": "PATCH",
      "Access-Control-Request-Headers": "authorization,content-type,if-match",
    },
  });
  assert.equal(options.status, 204);
  assert.equal(
    options.headers.get("allow"),
    "GET, HEAD, PATCH, DELETE, OPTIONS",
  );
  assert.equal(options.headers.get("access-control-allow-origin"), "*");
  assert.match(options.headers.get("access-control-allow-methods"), /PATCH/);
  assert.match(options.headers.get("access-control-allow-headers"), /if-match/i);
  assert.equal(options.headers.get("x-content-type-options"), "nosniff");
  assert.ok(options.headers.get("strict-transport-security"));
  assert.ok(options.headers.get("date"));
  assert.equal(options.headers.get("server"), null);
  assert.equal(options.headers.get("x-powered-by"), null);

  const created = await createFile();
  const file = await created.json();
  const current = await fileRequest(`/${file.id}`);
  const etag = current.headers.get("etag");
  const overridden = await fileRequest(`/${file.id}`, {
    method: "POST",
    headers: {
      "X-HTTP-Method-Override": "PATCH",
      "Content-Type": "application/json",
      "If-Match": etag,
    },
    body: JSON.stringify({ name: "override-update.pdf" }),
  });
  assert.equal(overridden.status, 200);
  assert.equal((await overridden.json()).name, "override-update.pdf");

  const deleteTarget = await createFile();
  const deleteFileBody = await deleteTarget.json();
  const overrideDelete = await fileRequest(`/${deleteFileBody.id}`, {
    method: "POST",
    headers: { "X-HTTP-Method-Override": "DELETE" },
  });
  assert.equal(overrideDelete.status, 204);
  assert.equal((await fileRequest(`/${deleteFileBody.id}`)).status, 404);
});

test("rate limits include retry headers and are tracked per client", async () => {
  const now = 1_000;
  const limiter = createRateLimiter({
    limit: 1,
    windowMs: 5_000,
    now: () => now,
  });
  const invoke = (ip) => {
    const headers = {};
    const result = { status: 200 };
    const res = {
      set(name, value) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      status(code) {
        result.status = code;
        return this;
      },
      type() {
        return this;
      },
      json(body) {
        result.body = body;
        return this;
      },
    };
    limiter({ ip, socket: { remoteAddress: ip } }, res, () => {
      result.next = true;
    });
    return { ...result, headers };
  };

  assert.equal(invoke("192.0.2.1").headers["x-ratelimit-remaining"], "0");
  const limited = invoke("192.0.2.1");
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["x-ratelimit-limit"], "1");
  assert.equal(limited.headers["retry-after"], "5");
  assert.equal(invoke("192.0.2.2").next, true);
});

test("the HTTP rate limit returns 429 and Retry-After", async () => {
  const limitedServer = await listen(
    createApp({ rateLimitLimit: 1, logRequests: false }),
  );
  try {
    const url = `http://127.0.0.1:${limitedServer.address().port}/api/files?ownerId=${DEMO_USER_ID}`;
    const first = await fetch(url, {
      headers: { Authorization: "Bearer assignment-test-token" },
    });
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("x-ratelimit-limit"), "1");
    assert.equal(first.headers.get("x-ratelimit-remaining"), "0");

    const second = await fetch(url, {
      headers: { Authorization: "Bearer assignment-test-token" },
    });
    assert.equal(second.status, 429);
    assert.equal(second.headers.get("x-ratelimit-remaining"), "0");
    assert.ok(Number(second.headers.get("retry-after")) >= 1);
    assert.match(second.headers.get("content-type"), /^application\/problem\+json; charset=utf-8$/);
  } finally {
    await close(limitedServer);
  }
});

test("OPTIONS reports supported collection and file methods", async () => {
  const collection = await fetch(`${filesBaseUrl}/api/files`, {
    method: "OPTIONS",
  });
  assert.equal(collection.status, 204);
  assert.equal(collection.headers.get("allow"), "GET, HEAD, POST, OPTIONS");

  const unsupportedMethod = await fileRequest(`/${crypto.randomUUID()}`, {
    method: "PUT",
  });
  assert.equal(unsupportedMethod.status, 405);
  assert.equal(
    unsupportedMethod.headers.get("allow"),
    "GET, HEAD, PATCH, DELETE, OPTIONS",
  );
});

test("large JSON responses use gzip when the client accepts compression", async () => {
  const ownerId = crypto.randomUUID();
  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      createFile(
        createInput({
          ownerId,
          name: `compressed-report-${String(index).padStart(2, "0")}.pdf`,
        }),
      ),
    ),
  );

  const query = new URLSearchParams({ ownerId, pageSize: "100" });
  const response = await fileRequest(`?${query}`, {
    headers: { "Accept-Encoding": "gzip" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.match(response.headers.get("vary"), /Accept-Encoding/i);
});

test("Identity 4xx is not retried", async () => {
  identityResponses = [{ status: 404 }, { status: 200 }];
  const callsBefore = identityRequests.length;

  const response = await createFile();
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.match(body.type, /owner-unavailable$/);
  assert.equal(identityRequests.length - callsBefore, 1);
});

test("Identity 5xx is retried with exponential backoff and jitter", async () => {
  identityResponses = [{ status: 503 }, { status: 200 }];
  const callsBefore = identityRequests.length;
  const delayCountBefore = retryDelays.length;

  const response = await createFile();

  assert.equal(response.status, 201);
  assert.equal(identityRequests.length - callsBefore, 2);
  assert.deepEqual(retryDelays.slice(delayCountBefore), [150]);
});

test("the local Identity Service demo exposes the Assignment 2 contract", async () => {
  const server = await listen(createIdentityDemoApp());
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const active = await fetch(
      `${baseUrl}/users/${DEMO_USER_ID}/access-status`,
    );
    assert.deepEqual(await active.json(), { status: "active" });

    const missing = await fetch(
      `${baseUrl}/users/${OTHER_USER_ID}/access-status`,
    );
    assert.equal(missing.status, 404);
  } finally {
    await close(server);
  }
});
