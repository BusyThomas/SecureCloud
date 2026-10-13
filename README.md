# SecureCloud

SecureCloud is a CS543 web-services project for private file storage. It is intended for organization members who need to store, organize, and share files.

## Project status

The project contains a React frontend and a Node.js/Express backend. The frontend demonstrates login, registration, and a storage dashboard. The backend includes the Assignment 4–6 File Service API and a local Identity Service demo used for its dependency check. File metadata is stored in memory for this assignment; database-backed file management is future work.

## Team Members
- Shirish Meshram
- Deepamoni Boro
- Aman Chouhan
- Sanu Sawarnakar

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Assignment documentation

Submission overview: [ReadMe.pdf](ReadMe.pdf)

Completed assignment documentation:

- [Project brief](docs/assignments/assignment-01/brief.md)
- [HTTP request and response log](docs/assignments/assignment-01/http-log.md)
- [Browser network analysis](docs/assignments/assignment-01/network-analysis.md)
- [Assignment 2 design and contracts](docs/assignments/assignment-02/design.md)
- [Assignment 2 design PDF](docs/assignments/assignment-02/design.pdf)
- [Service diagram (editable)](docs/assignments/assignment-02/services.drawio) · [PNG](docs/assignments/assignment-02/services.png)
- [Schema diagram (editable)](docs/assignments/assignment-02/schema.drawio) · [PNG](docs/assignments/assignment-02/schema.png)
- [Assignment 2 SQL schema](database/schemas/assignment-02-schema.sql)
- [Assignment 3 integration write-up](docs/assignments/assignment-03/integration.md)
- [Assignment 3 integration PDF](docs/assignments/assignment-03/integration.pdf)
- [Assignment 3 SOAP partner WSDL](docs/assignments/assignment-03/partner.wsdl)
- [Assignment 3 SOAP request, response and fault](docs/assignments/assignment-03/)
- [Assignment 3 submission ZIP](docs/assignments/assignment-03/assignment-03-submission.zip)
- [Assignment 4–6 File Service notes](backend/NOTES.md)
- [Assignment 4–6 OpenAPI contract](backend/openapi.yaml)
- [Assignment 4–6 backend tests](backend/tests/files.test.js)
- [Assignment 4 curl transcript](backend/assignment-04-curl-transcript.txt)
- [Assignment 5 curl transcript](backend/curl-transcript.txt)
- [Assignment 4–6 test output](backend/test-results.txt)
- [Assignment 4–6 OpenAPI validation output](backend/openapi-validation.txt)
- [Assignment 5 submission ZIP](docs/assignments/assignment-05-submission.zip)
- [Assignment 6 answers and status map](backend/NOTES.md#assignment-6-honest-statuses-validation-and-formats)
- [Assignment 6 live curl transcript](backend/transcript.txt)
- [Assignment 6 backend test results](backend/test-results.txt)
- [Assignment 6 submission ZIP](docs/assignments/assignment-06-submission.zip)

GitHub repository: <https://github.com/si-rish/SecureCloud>

## Main folders

- `frontend/` - React user interface
- `backend/` - Express API
- `database/` - Database setup
- `docs/` - Project and assignment documentation
