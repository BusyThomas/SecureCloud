# Assignment 3 — External SOAP File Scanner

## Team

- Team ID: To be added
- Team leader: To be added
- Team members (roll number and name): To be added

## Context

SecureCloud's File Service calls an external malware-scanning partner before making an uploaded file available. The partner exposes one SOAP operation, `ScanFile`. SOAP is used at this boundary because the partner contract is explicitly described by a WSDL, the request has a defined credential header, and the response and fault formats are agreed in advance. The rest of SecureCloud can continue to use REST; using SOAP for this one external integration does not require our internal APIs to change.

The endpoint and partner in this assignment are examples for the design. No real partner, credential, gateway, or running server is used.

## Data sent to the partner

SecureCloud sends the file reference, media type, checksum, and a short-lived HTTPS download URL. The partner does not receive SecureCloud's internal storage key or user credentials. In a real system, the URL would be single-use, expire quickly, and grant access only to that one file.

## HTTP binding

The SOAP binding is SOAP 1.1 over HTTPS. The operation uses HTTP `POST`, `Content-Type: text/xml; charset=utf-8`, and the SOAPAction declared by the WSDL.

```http
POST /soap/FileScanService HTTP/1.1
Host: scanner.partner.example.com
Content-Type: text/xml; charset=utf-8
SOAPAction: "https://api.securecloud.example.com/scan/ScanFile"
```

Full example endpoint: `https://scanner.partner.example.com/soap/FileScanService`

`.example.com` is reserved for examples. This URL is illustrative and is not a live scanner.

## Discovery

SecureCloud obtains and checks the WSDL using the partner's published contract URL, then records that contract and endpoint in its service catalogue. No UDDI server is required.

| Registry field | Example value |
|---|---|
| Business | Example Secure File Scanning Partner |
| Service | SecureCloud File Scan Service |
| Endpoint | `https://scanner.partner.example.com/soap/FileScanService` |
| WSDL / contract pointer | `https://scanner.partner.example.com/soap/FileScanService?wsdl` |
| Contract operation | `ScanFile` |
| tModel-style contract key | `securecloud:file-scan:wsdl:v1` |

The business name, endpoint, WSDL URL, and key above are illustrative catalogue data, not a claim that the partner exists.

## Fault mapping

If the scanner returns its SOAP fault `THREAT_DETECTED`, the File Service maps it to its own `invalid file` upload error. SecureCloud callers receive SecureCloud's error wording, not the partner's fault code or XML. Scanner credentials, stack traces, storage keys, and the SOAP response are never returned to the caller.

The fault example represents a rejected file, so retrying the same upload without changing the file would not help.

## Files

- `partner.wsdl` — editable SOAP contract.
- `soap-request.xml` — example request with placeholder credentials.
- `soap-response.xml` — successful clean scan.
- `soap-fault.xml` — threat-detected fault.
- `integration.pdf` — printable submission document.
- `assignment-03-submission.zip` — the PDF, WSDL, and three SOAP message examples together.
