CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL
        CHECK (
            role IN (
                'admin',
                'user'
            )
        ),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,

    admin_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    original_filename TEXT NOT NULL,

    template_path TEXT NOT NULL,

    file_type TEXT NOT NULL
        CHECK (file_type IN ('docx', 'pdf')),

    document_type TEXT,

    status TEXT NOT NULL
        DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'analyzed',
                'published',
                'archived'
            )
        ),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS template_fields (
    id SERIAL PRIMARY KEY,

    template_id INTEGER NOT NULL
        REFERENCES templates(id)
        ON DELETE CASCADE,

    field_key TEXT NOT NULL,
        CHECK (field_key IN (
            'full_name', 'email', 'phone_number', 'gender',
            'cnic', 'date_of_birth', 'address', 'signature'
        )),

    label TEXT NOT NULL,

    field_type TEXT NOT NULL
        DEFAULT 'text'
        CHECK (
            field_type IN (
                'text',
                'email',
                'number',
                'date',
                'textarea',
                'signature',
                'select'
            )
        ),

    required BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    placeholder_text TEXT,

    field_order INTEGER
        NOT NULL
        DEFAULT 0,

    UNIQUE (
        template_id,
        field_key
    )
);


CREATE TABLE IF NOT EXISTS generated_documents (
    id SERIAL PRIMARY KEY,

    template_id INTEGER NOT NULL
        REFERENCES templates(id),

    user_id INTEGER NOT NULL
        REFERENCES users(id),

    generated_filename TEXT NOT NULL,

    generated_path TEXT NOT NULL,

    file_type TEXT NOT NULL
        CHECK (file_type IN ('docx', 'pdf')),

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS document_field_values (
    id SERIAL PRIMARY KEY,

    generated_document_id INTEGER NOT NULL
        REFERENCES generated_documents(id)
        ON DELETE CASCADE,

    field_id INTEGER NOT NULL
        REFERENCES template_fields(id),

    value TEXT,

    UNIQUE (
        generated_document_id,
        field_id
    )
);


CREATE INDEX IF NOT EXISTS idx_templates_admin_id
ON templates(admin_id);


CREATE INDEX IF NOT EXISTS idx_templates_status
ON templates(status);


CREATE INDEX IF NOT EXISTS idx_template_fields_template_id
ON template_fields(template_id);


CREATE INDEX IF NOT EXISTS idx_generated_documents_user_id
ON generated_documents(user_id);


CREATE INDEX IF NOT EXISTS idx_generated_documents_template_id
ON generated_documents(template_id);

-- Safe upgrades for databases created by earlier versions.
ALTER TABLE templates ADD COLUMN IF NOT EXISTS file_type TEXT;
UPDATE templates SET file_type = LOWER(SUBSTRING(original_filename FROM '\.([^.]*)$'))
WHERE file_type IS NULL;
ALTER TABLE templates ALTER COLUMN file_type SET NOT NULL;

ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS file_type TEXT;
UPDATE generated_documents SET file_type = LOWER(SUBSTRING(generated_filename FROM '\.([^.]*)$'))
WHERE file_type IS NULL;
ALTER TABLE generated_documents ALTER COLUMN file_type SET NOT NULL;

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_status_check;
ALTER TABLE templates ADD CONSTRAINT templates_status_check
CHECK (status IN ('draft', 'analyzed', 'published', 'archived'));

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_file_type_check;
ALTER TABLE templates ADD CONSTRAINT templates_file_type_check
CHECK (file_type IN ('docx', 'pdf'));

ALTER TABLE generated_documents DROP CONSTRAINT IF EXISTS generated_documents_file_type_check;
ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_file_type_check
CHECK (file_type IN ('docx', 'pdf'));

ALTER TABLE template_fields DROP CONSTRAINT IF EXISTS template_fields_field_key_check;
ALTER TABLE template_fields ADD CONSTRAINT template_fields_field_key_check
CHECK (field_key IN (
    'full_name', 'email', 'phone_number', 'gender',
    'cnic', 'date_of_birth', 'address', 'signature'
));

ALTER TABLE template_fields DROP CONSTRAINT IF EXISTS template_fields_field_type_check;
ALTER TABLE template_fields ADD CONSTRAINT template_fields_field_type_check
CHECK (field_type IN ('text', 'email', 'number', 'date', 'textarea', 'signature', 'select'));
