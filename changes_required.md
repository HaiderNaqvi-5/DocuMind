# Changes Required — AI Document Generator

## 1. Objective

The AI Document Generator should be redesigned into a polished, competitive, easy-to-demonstrate product with a strong focus on user experience, clear role-based workflows, controlled AI field extraction, DOCX/PDF support, validation, e-signatures, preview, and downloads.

The project should remain modular and easy to explain. Avoid unnecessary overengineering, microservices, or complex infrastructure that does not directly improve the product demo or reliability.

---

# 2. Core Product Flow

The intended high-level flow is:

```text
Landing Page
    ↓
Unified Login
    ↓
Role Detection
    ├── Admin Dashboard
    └── User Dashboard
```

The same application shell and visual design should be used for both roles.

Admin and user should not have separate login pages.

---

# 3. Frontend Redesign — Highest Priority

The frontend must feel like a complete product rather than a collection of backend endpoints.

The visual design should be modern, clean, responsive, consistent, and suitable for a competitive university/project demonstration.

## 3.1 Landing Page

Create a proper landing page at:

```text
/
```

The landing page should explain the product clearly before asking the visitor to log in.

### Suggested Hero Section

**AI Document Generator**

Smart document filling without destroying the original formatting.

Suggested supporting text:

> Upload DOCX or PDF templates, automatically detect supported personal fields, validate user input, add e-signatures, preview the result, and download a completed document while preserving the original layout.

Primary actions:

- Get Started
- Sign In

### Landing Page Sections

Include visually strong sections such as:

#### How It Works

1. Admin uploads a template.
2. AI identifies supported fields.
3. Admin reviews and publishes the template.
4. User selects a template.
5. User fills the required fields.
6. The system validates input.
7. User signs where required.
8. A completed document is generated.
9. User previews and downloads the result.

#### Key Features

Use modern feature cards for:

- Smart Field Detection
- DOCX + PDF Support
- Original Format Preservation
- Pakistan-Specific Validation
- E-Signature
- Role-Based Access
- Preview & Download
- Secure Document History

#### Supported Fields

Show supported personal field types such as:

- Full Name
- Email
- Phone Number
- Gender
- CNIC
- Date of Birth
- Address
- E-Signature

#### Product CTA

End the page with:

- Sign In
- Start Using the Platform

---

# 4. Unified Authentication

There must be one login page:

```text
/login
```

Do not maintain separate:

```text
/admin/login
/user/login
```

Both admin and normal users authenticate from the same form.

The backend checks the authenticated user's role and sends them to the correct dashboard experience.

Conceptually:

```text
Unified Login
     ↓
Authentication
     ↓
Check Role
     ├── Admin
     │     ↓
     │  Admin Dashboard
     │
     └── User
           ↓
        User Dashboard
```

## 4.1 Registration

Normal public registration must always create a user account.

The public form must not allow a visitor to select:

```text
admin
```

Admin accounts should be seeded or created through an authorized admin-only mechanism.

---

# 5. Shared Application Layout

Admin and user dashboards should share the same design system.

Reuse:

- navigation
- sidebar
- top bar
- cards
- tables
- buttons
- form elements
- empty states
- notifications
- modal design
- file upload components

The interface should adapt based on the current user's role rather than loading a completely different frontend application.

---

# 6. Admin Dashboard

After login, an admin should see a dedicated admin dashboard inside the same application shell.

## 6.1 Admin Dashboard Overview

Show useful summary cards:

- Total Templates
- Published Templates
- Draft Templates
- Generated Documents
- Recent Uploads

Provide a clear primary action:

```text
+ Upload Template
```

## 6.2 Admin Navigation

Suggested admin menu:

```text
Dashboard
Templates
Upload Template
Generated Documents
Users
Profile
Logout
```

Keep navigation simple.

---

# 7. Admin Template Management

Create a strong template management screen.

Admin should be able to:

- upload DOCX
- upload PDF
- analyze template
- review detected fields
- edit field configuration
- remove incorrectly detected fields
- publish template
- unpublish template
- delete template
- view template status
- preview template
- view usage/history

## 7.1 Template List

Each template should display:

- title
- original filename
- file type
- inferred document type
- number of detected fields
- status
- upload date
- actions

Suggested status badges:

```text
Draft
Analyzed
Published
Archived
```

Actions:

```text
Analyze
Review
Preview
Publish
Delete
```

## 7.2 Upload Experience

Do not use a plain HTML file input alone.

Use a polished drag-and-drop area:

```text
Drop your DOCX or PDF here

or

[ Browse Files ]

Supported formats: DOCX, PDF
```

Show:

- selected filename
- file size
- upload progress/loading state
- success/error state

---

# 8. Controlled AI Field Detection

The current universal extraction approach should be removed.

The AI must not extract arbitrary editable sections.

For example, when a resume is uploaded, the system must ignore:

- Summary
- Experience
- Skills
- Projects
- Education Description
- Achievements
- Certifications
- Job History
- LinkedIn
- GitHub
- Biography
- Arbitrary paragraphs

Only explicitly supported generic personal/form fields should be returned.

---

# 9. Supported Field Schema

Use one centralized field definition file as the source of truth.

Initial supported fields:

```text
full_name
email
phone_number
gender
cnic
date_of_birth
address
signature
```

Do not allow the LLM to invent new field categories.

## 9.1 Field Aliases

The AI/rule layer may map variations such as:

```text
Applicant Name → full_name
Candidate Name → full_name
Student Name → full_name

E-mail Address → email

Mobile No. → phone_number
Contact Number → phone_number

Sex → gender

CNIC No. → cnic

DOB → date_of_birth
Birth Date → date_of_birth

Residential Address → address
Mailing Address → address

Applicant Signature → signature
Candidate Signature → signature
Sign Here → signature
```

---

# 10. Hybrid AI + Deterministic Validation

The LLM should be used only where ambiguity exists.

Example:

```text
"Applicant's Electronic Mail"
            ↓
           LLM
            ↓
          email
```

After AI output, deterministic code must verify that the returned field belongs to the supported allowlist.

If the AI returns:

```text
experience
summary
skills
projects
education
linkedin_url
```

the backend must discard them.

Design principle:

> Use AI where interpretation is useful; use deterministic code where correctness matters.

---

# 11. Dynamic Form Generation

When a user chooses a template, the frontend should automatically generate the correct input form based on the template's detected fields.

Example mapping:

```text
full_name       → text input
email           → email input
phone_number    → phone input
gender          → select/radio
cnic            → formatted input
date_of_birth   → date picker
address         → textarea
signature       → signature pad
```

The frontend should not manually hardcode a different form for every template.

---

# 12. Gender Input

Gender should not be a free text field.

Use a select or radio group.

Suggested values:

```text
Male
Female
Other
Prefer not to say
```

The UI should clearly show the available options.

---

# 13. Pakistan-Specific Input Validation

Create a separate validation module.

Suggested structure:

```text
app/
└── validators/
    ├── email.py
    ├── phone.py
    ├── cnic.py
    ├── date.py
    └── common.py
```

Do not scatter regex validation throughout route files.

## 13.1 Email Validation

Use proper email validation, preferably Pydantic `EmailStr` / `email-validator`.

Reject malformed addresses.

## 13.2 Pakistani Phone Validation

Support common Pakistani formats:

```text
03001234567
+923001234567
923001234567
```

Normalize stored/generated output where practical.

## 13.3 CNIC Validation

Support:

```text
35202-1234567-1
3520212345671
```

Validate structure and normalize display format.

## 13.4 Date of Birth

Use a date picker in the frontend.

Backend must validate that the date is valid and not a future date.

## 13.5 Terminology

Describe these rules as:

> Pakistan-specific input validation

Do not claim that regex validation makes the document legally compliant with Pakistani law.

---

# 14. E-Signature

E-signature should be a prominent user-facing feature.

Use a browser signature pad.

Expected flow:

```text
User draws signature
       ↓
Canvas
       ↓
PNG/base64
       ↓
Backend
       ↓
Inserted into document
```

The frontend should provide:

- Draw Signature
- Clear Signature
- Confirm Signature

Optional later enhancement:

- Upload signature image

Do not overengineer this into cryptographic digital signing unless specifically required.

---

# 15. Original Document Format Preservation

The system must preserve the uploaded document as closely as possible.

Do not regenerate documents from plain extracted text.

The expected workflow is:

```text
Original Template
      ↓
Identify supported field locations
      ↓
Collect user values
      ↓
Replace/fill those locations
      ↓
Preserve layout / fonts / tables / spacing
      ↓
Save generated document
```

For DOCX:

- preserve existing runs when possible
- preserve tables
- preserve paragraph formatting
- preserve document structure
- insert signature images without rebuilding the entire document

For PDF:

- preserve the original PDF page layout
- place filled values at the corresponding field coordinates/locations
- save a new completed PDF

---

# 16. DOCX Support

Admin must be able to:

- upload DOCX
- analyze DOCX
- review fields
- publish DOCX templates

User must be able to:

- choose a DOCX template
- fill required fields
- sign
- generate
- preview
- download completed DOCX

---

# 17. PDF Support

Add full PDF support for both admin and user workflows.

## Admin

```text
Upload PDF
    ↓
Analyze
    ↓
Review detected fields
    ↓
Publish
```

## User

```text
Select PDF Template
    ↓
Fill Fields
    ↓
Validate
    ↓
Generate
    ↓
Preview PDF
    ↓
Download PDF
```

DOCX and PDF should be handled by separate document handlers internally.

Suggested structure:

```text
services/
└── handlers/
    ├── docx_handler.py
    └── pdf_handler.py
```

Both should expose a consistent interface where practical.

---

# 18. User Dashboard

The user dashboard should feel like a personal workspace.

## 18.1 User Dashboard Overview

Suggested summary cards:

- Available Templates
- Documents Completed
- Documents In Progress
- Recent Documents

Main CTA:

```text
Browse Templates
```

## 18.2 User Navigation

Suggested navigation:

```text
Dashboard
Templates
My Documents
Profile
Logout
```

---

# 19. User Template Browser

Users should be able to browse only published templates.

Each template card should show:

- title
- file type
- short document type/description
- number of fields
- preview option
- "Use Template" button

Suggested card action:

```text
[Preview]   [Use Template]
```

Use visually clean cards rather than a plain table where possible.

---

# 20. Template Completion Flow

When user clicks:

```text
Use Template
```

show a clear multi-step experience.

Suggested stepper:

```text
1. Template
2. Personal Information
3. Signature
4. Preview
5. Download
```

Only display the signature step if the selected template requires a signature.

## Step 1 — Template

Show:

- document title
- file type
- preview
- number of fields

## Step 2 — Personal Information

Render dynamic fields.

Provide inline validation.

## Step 3 — Signature

Show signature pad when required.

## Step 4 — Preview

Show the generated document or a preview view.

## Step 5 — Completion

Display:

```text
Document Generated Successfully
```

Buttons:

```text
Preview Document
Download Document
Back to My Documents
```

---

# 21. User "My Documents"

Create a dedicated:

```text
My Documents
```

screen.

Show documents created by the current user.

Each row/card should include:

- document/template title
- file type
- generated date
- status
- preview
- download

Example:

```text
Employment Form
PDF
Generated Sep 07, 2026

[Preview] [Download]
```

This allows users to return to previously generated files instead of losing them after generation.

---

# 22. Document Preview

Users should be able to preview generated documents before downloading.

For PDF:

- display inside an embedded viewer/modal/page

For DOCX:

Possible simple approaches:

- convert to preview-friendly PDF if already available
- provide a generated document information view with download
- use OnlyOffice if keeping browser editing/preview functionality

Do not let preview functionality overcomplicate the core implementation.

---

# 23. Download Functionality

Every completed user document must have a download action.

Examples:

```text
Download DOCX
Download PDF
```

Do not expose arbitrary server filesystem paths.

Downloads should use protected backend endpoints tied to the current authenticated user.

---

# 24. Generated Document History

Keep existing generated-document database functionality and improve its UI.

Store:

- user ID
- template ID
- output filename
- output path
- generated timestamp
- relevant field values if already part of current design

Users must only be able to access their own generated documents.

Admins may have a broader read-only view if useful for the project demo.

---

# 25. Frontend Visual Design Direction

The project is competitive, so frontend polish matters.

The design should look modern but believable.

Avoid:

- excessive animations
- overly flashy gradients everywhere
- huge amounts of JavaScript
- complex SPA architecture unless already used
- visual clutter

Prefer:

- clean typography
- consistent spacing
- modern cards
- soft borders/shadows
- subtle gradients where appropriate
- clear primary buttons
- strong empty states
- polished loading states
- responsive layout
- reusable form controls
- clear status badges
- icons where useful

---

# 26. Frontend Components to Standardize

Build reusable frontend components/styles for:

```text
Button
Input
Select
Textarea
File Upload
Signature Pad
Card
Template Card
Document Card
Modal
Badge
Toast/Alert
Loading Spinner
Empty State
Sidebar
Top Navigation
Dashboard Stat Card
Stepper
```

This keeps the interface visually consistent.

---

# 27. Error and Loading States

Every important action should show feedback.

Examples:

## Upload

```text
Uploading document...
Analyzing fields...
Template analyzed successfully.
```

## Generation

```text
Validating information...
Generating document...
Document generated successfully.
```

## Errors

Use clear messages:

```text
Please enter a valid Pakistani mobile number.
CNIC must contain 13 digits.
This template has not been published yet.
Document generation failed. Please try again.
```

Avoid exposing raw backend stack traces to users.

---

# 28. Empty States

Use polished empty states.

Example:

```text
No templates yet

Upload your first DOCX or PDF template to begin.

[Upload Template]
```

User example:

```text
No documents generated yet

Choose a published template and create your first document.

[Browse Templates]
```

---

# 29. Existing Frontend Files

The current separate admin/user frontend should eventually be replaced.

Files such as:

```text
admin.html
admin-app.js
admin-api.js
```

should not be deleted until the replacement unified interface is working.

Implementation approach:

1. Build the new unified frontend.
2. Verify both roles.
3. Remove/deprecate old duplicate frontend code.

Do not remove working code prematurely.

---

# 30. Backend Role Separation

The frontend should be unified, but backend role authorization should remain modular.

Keeping routes such as:

```text
/api/admin/...
/api/user/...
```

is acceptable and preferred.

The unified frontend simply calls the correct API based on authenticated role.

Do not merge every route into one giant backend file.

---

# 31. Recommended Backend Structure

Keep a simple modular architecture.

```text
app/
│
├── main.py
├── config.py
├── db.py
│
├── models/
│   ├── user.py
│   └── template.py
│
├── routes/
│   ├── auth.py
│   ├── admin.py
│   └── user.py
│
├── services/
│   ├── field_schema.py
│   ├── field_detector.py
│   ├── template_analyzer.py
│   ├── document_service.py
│   │
│   └── handlers/
│       ├── docx_handler.py
│       └── pdf_handler.py
│
├── validators/
│   ├── email.py
│   ├── phone.py
│   ├── cnic.py
│   ├── date.py
│   └── common.py
│
└── static/
    ├── index.html
    ├── login.html
    ├── dashboard.html
    ├── css/
    └── js/
```

Do not introduce microservices.

---

# 32. Features to Remove or Simplify

Remove/simplify the following ideas from the existing project:

## Remove universal editable-content extraction

The analyzer must no longer detect:

```text
summary
experience
projects
skills
certifications
achievements
education sections
large text blocks
arbitrary editable paragraphs
```

## Remove resume-specific detectors

Do not detect:

```text
LinkedIn
GitHub
```

as user-fillable document fields.

## Simplify multi-pass LLM analysis

The current multi-pass universal analyzer should be reduced to a controlled field-mapping workflow.

Preferred flow:

```text
Extract document content
        ↓
Find candidate labels/values
        ↓
LLM maps ambiguity
        ↓
Strict supported-field allowlist
        ↓
Exact source validation
        ↓
Save fields
```

## Keep deterministic logic for correctness

Validation, permissions, file access, downloads, and replacement must not depend on AI.

---

# 33. Database

Keep the current main tables where practical:

```text
users
templates
template_fields
generated_documents
document_field_values
```

Avoid unnecessary migrations during early phases.

Only add schema changes when a feature genuinely requires them.

Potential later additions may include:

- file_type
- preview_path
- updated_at
- template description

but only if needed.

---

# 34. Competition Demo Flow

The final demonstration should be designed carefully.

Recommended demo:

## Admin

1. Open polished landing page.
2. Click Sign In.
3. Login as admin.
4. Show admin dashboard.
5. Upload a resume DOCX.
6. Analyze it.
7. Demonstrate that:
   - Name is detected.
   - Email is detected.
   - Phone is detected.
   - Summary is ignored.
   - Experience is ignored.
   - Skills are ignored.
   - Projects are ignored.
8. Upload a proper application form.
9. Detect:
   - Name
   - Email
   - Phone
   - Gender
   - CNIC
   - DOB
   - Address
   - Signature
10. Review fields.
11. Publish the template.

## User

1. Logout.
2. Use the same login screen.
3. Login as normal user.
4. Show personal dashboard.
5. Browse published templates.
6. Select the application form.
7. Fill personal fields.
8. Demonstrate invalid Pakistani phone/CNIC validation.
9. Correct the values.
10. Select gender from a dropdown.
11. Draw an e-signature.
12. Generate the document.
13. Preview it.
14. Show that original formatting is retained.
15. Download it.
16. Open "My Documents".
17. Show the generated document history.

## PDF Demo

Repeat a shorter version using PDF to prove both supported formats.

---

# 35. Project Differentiators

The project should stand out because of the complete workflow rather than unrealistic complexity.

Core differentiators:

```text
Controlled AI extraction
        +
Strict supported-field schema
        +
Pakistan-specific validation
        +
DOCX support
        +
PDF support
        +
Format preservation
        +
E-signature
        +
Unified role-based interface
        +
Preview
        +
Secure downloads
        +
Document history
        +
Professional landing page
```

This is enough to make the project competitive while remaining understandable and believable.

---

# 36. Implementation Order

Follow this order.

## Phase 0 — Baseline

- Docker/PostgreSQL running
- schema loaded
- backend starts
- existing endpoints tested

## Phase 1 — Controlled Fields

- create central supported field schema
- simplify AI analyzer
- strict field allowlist
- remove summary/experience/etc.
- test with resume edge case

## Phase 2 — Validation

- email
- Pakistani phone
- CNIC
- DOB
- gender options
- frontend inline errors

## Phase 3 — DOCX

- improve field replacement
- preserve layout/formatting
- integrate controlled fields

## Phase 4 — E-Signature

- polished signature component
- backend insertion
- generated DOCX verification

## Phase 5 — PDF

- PDF upload
- field detection
- PDF filling
- preservation
- preview/download

## Phase 6 — Unified Authentication

- one login
- no role selection during public registration
- role-aware dashboard routing

## Phase 7 — Frontend Redesign

- landing page
- shared application shell
- admin dashboard
- user dashboard
- reusable components
- responsive design

## Phase 8 — Template/User Flows

- admin template manager
- user template browser
- dynamic form
- stepper
- document completion flow

## Phase 9 — Preview & Downloads

- preview
- protected download
- My Documents
- history

## Phase 10 — Polish

- loading states
- empty states
- toasts
- validation feedback
- responsive layout
- visual consistency

## Phase 11 — Testing & Demo Preparation

Test all main workflows and edge cases.

---

# 37. Non-Goals

To keep the project manageable, do not add unless explicitly required:

- microservices
- Kubernetes
- blockchain
- complex cryptographic signing
- complex workflow engines
- real-time collaboration beyond existing OnlyOffice capability
- excessive LLM agents
- multiple databases
- unnecessary message queues
- overly complex frontend framework migrations

---

# 38. Design Principle

The guiding principle for the entire project is:

> **Modular, simple, reliable, polished, and easy to demonstrate.**

And for AI usage:

> **Use AI where ambiguity exists; use deterministic logic where correctness matters.**

The final result should feel like a real product that an evaluator can understand immediately, while the backend remains simple enough for the developer to explain confidently.
