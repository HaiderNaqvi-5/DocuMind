# Documind — AI Document Generator

> Turn reusable DOCX and PDF templates into validated, signed documents through a guided web workflow.

Repository: [HaiderNaqvi-5/DocuMind](https://github.com/HaiderNaqvi-5/DocuMind)

Documind is a FastAPI and PostgreSQL application for turning DOCX and PDF templates into guided, validated, signed documents. Administrators upload and review templates; users fill published templates, preview the result, and download their generated document.

## Features

- Controlled AI-assisted detection of supported personal fields
- DOCX and PDF template filling
- Original document layout preservation where supported
- Pakistan-specific CNIC and phone-number validation
- E-signature capture and insertion
- Role-based admin and user workflows
- Generated-document history and secure file access
- Automated tests for validation and document handlers

## How it works

```text
Admin uploads a template → Documind detects supported fields → Admin reviews and publishes it
User completes the published form → values are validated → signed document is generated and stored
```

## Supported fields

Full Name, Email, Phone Number, Gender, CNIC, Date of Birth, Address, and E-Signature.

The analyzer uses an explicit allowlist. Resume sections such as experience, summary, skills, projects, education, LinkedIn, and GitHub are not treated as editable fields.

## Requirements

- Python 3.10+
- PostgreSQL 14+
- An OpenAI API key for AI-assisted template analysis

## Local setup

1. Create and activate a virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

3. Create a local environment file from the example:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your PostgreSQL credentials, OpenAI API key, and a long random `JWT_SECRET`.

   **Never commit `.env`.** It is ignored by Git. Only `.env.example`, which contains placeholders, belongs in the repository.

4. Create the database and apply the schema:

   ```bash
   psql -U aidoc -d ai_document_generator -f db/schema.sql
   ```

5. Start the development server:

   ```bash
   python -m uvicorn app.main:api --host 0.0.0.0 --port 8000 --reload
   ```

6. Open the application:

   - Landing page: <http://127.0.0.1:8000/>
   - Unified login: <http://127.0.0.1:8000/login>
   - API documentation: <http://127.0.0.1:8000/docs>
   - Health check: <http://127.0.0.1:8000/api/health>

## Main API areas

The interactive API reference at `/docs` is the source of truth for request and response schemas.

| Area | Base path | Purpose |
| --- | --- | --- |
| Authentication | `/api/auth` | Register, sign in, and manage access tokens. |
| Administration | `/api/admin` | Upload templates, review field mappings, and publish templates. |
| User documents | `/api/user` | Browse published templates, generate documents, and access document history. |
| Health | `/api/health` | Confirm that the API and database are available. |

## Test

Run the test suite with:

```bash
pytest
```

## Application flow

1. An admin uploads a DOCX or PDF template.
2. The analyzer identifies only supported fields.
3. The admin reviews and publishes the field mapping.
4. A user selects a published template and enters their information.
5. The application validates the values and captures an e-signature when required.
6. A completed document is generated, previewed, and stored in the user's document history.

## Security and repository hygiene

- Secrets belong in `.env`, never in source code or commits.
- Uploaded templates and generated documents are local runtime data and are ignored by Git.
- Public registration creates regular user accounts; administrator access is controlled separately.
- File access is restricted to the owning user or authorized administrator.

## Limitations

- Only DOCX and PDF templates are accepted; uploads are limited to 25 MB.
- Field detection is deliberately limited to the supported personal fields listed above. It does not turn arbitrary resume content into editable fields.
- Document fidelity depends on the input format and template complexity; review generated output before using it as a final document.

## Project structure

```text
app/          FastAPI application, routes, services, validators, and frontend assets
db/           PostgreSQL schema
tests/        Automated tests
storage/      Runtime document storage (ignored except for .gitkeep files)
```
