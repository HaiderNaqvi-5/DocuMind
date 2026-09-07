from pathlib import Path
from uuid import uuid4
import traceback

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse

from app import db
from app.models.template import (
    AnalyzeTemplateResponse,
    CreateTemplateField,
    TemplateResponse,
    UpdateTemplateField,
)
from app.routes.auth import require_admin
from app.services.document_parser import extract_document_content
from app.services.field_schema import SUPPORTED_FIELDS
from app.services.storage import TEMPLATE_ROOT, safe_stored_path
from app.services.template_analyzer import (
    analyze_template_content,
)


router = APIRouter()
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

TEMPLATE_DIR = TEMPLATE_ROOT
TEMPLATE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def _get_admin_template(
    template_id: int,
    admin: dict,
) -> dict:
    rows = db.query(
        """
        SELECT
            id,
            admin_id,
            title,
            original_filename,
            template_path,
            file_type,
            document_type,
            status
        FROM templates
        WHERE id = %s
        LIMIT 1
        """,
        (template_id,),
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Template not found.",
        )

    template = rows[0]

    if template["admin_id"] != admin["id"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this template.",
        )

    return template


def _get_template_field(
    template_id: int,
    field_id: int,
) -> dict:
    rows = db.query(
        """
        SELECT
            id,
            template_id,
            field_key,
            label,
            field_type,
            required,
            placeholder_text,
            field_order
        FROM template_fields
        WHERE id = %s
          AND template_id = %s
        LIMIT 1
        """,
        (
            field_id,
            template_id,
        ),
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Template field not found.",
        )

    return rows[0]


@router.post(
    "/templates/upload",
    response_model=TemplateResponse,
)
async def upload_template(
    title: str = Form(...),
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    clean_title = title.strip()

    if not clean_title:
        raise HTTPException(
            status_code=400,
            detail="Template title is required.",
        )

    if len(clean_title) > 200:
        raise HTTPException(
            status_code=400,
            detail="Template title is too long.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    original_filename = Path(
        file.filename
    ).name

    suffix = Path(original_filename).suffix.lower()
    if suffix not in {".docx", ".pdf"}:
        raise HTTPException(
            status_code=400,
            detail="Only DOCX and PDF templates are supported.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Template files must be 25 MB or smaller.",
        )

    valid_magic = (suffix == ".docx" and contents.startswith(b"PK")) or (
        suffix == ".pdf" and contents.startswith(b"%PDF-")
    )
    if not valid_magic:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not a valid {suffix[1:].upper()} file.",
        )

    stored_filename = (
        f"{uuid4().hex}_{original_filename}"
    )

    template_path = (
        TEMPLATE_DIR / stored_filename
    )

    try:
        template_path.write_bytes(
            contents
        )

        extract_document_content(
            template_path
        )

    except Exception as exc:
        if template_path.exists():
            template_path.unlink()

        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded file could not be "
                    "processed as a DOCX or PDF document."
            ),
        ) from exc

    try:
        rows = db.query(
            """
            INSERT INTO templates (
                admin_id,
                title,
                original_filename,
                template_path,
                file_type,
                document_type,
                status
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'draft'
            )
            RETURNING
                id,
                title,
                original_filename,
                file_type,
                document_type,
                status
            """,
            (
                admin["id"],
                clean_title,
                original_filename,
                str(template_path),
                suffix[1:],
                None,
            ),
        )

    except Exception as exc:
        if template_path.exists():
            template_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Could not create template record.",
        ) from exc

    return rows[0]


@router.get("/stats")
def admin_stats(admin: dict = Depends(require_admin)):
    template_counts = db.query(
        """
        SELECT COUNT(*) AS total_templates,
               COUNT(*) FILTER (WHERE status = 'published') AS published_templates,
               COUNT(*) FILTER (WHERE status <> 'published') AS draft_templates
        FROM templates WHERE admin_id = %s
        """,
        (admin["id"],),
    )[0]
    generated = db.query(
        """SELECT COUNT(*) AS generated_documents FROM generated_documents gd
           JOIN templates t ON t.id = gd.template_id WHERE t.admin_id = %s""",
        (admin["id"],),
    )[0]
    return {**template_counts, **generated}


@router.get("/templates")
def list_templates(admin: dict = Depends(require_admin)):
    templates = db.query(
        """
        SELECT t.id, t.title, t.original_filename, t.file_type, t.document_type,
               t.status, t.created_at, COUNT(tf.id) AS field_count
        FROM templates t
        LEFT JOIN template_fields tf ON tf.template_id = t.id
        WHERE t.admin_id = %s
        GROUP BY t.id
        ORDER BY t.created_at DESC
        """,
        (admin["id"],),
    )
    return {"templates": templates}


@router.get(
    "/templates/{template_id}/extract"
)
def extract_template(
    template_id: int,
    admin: dict = Depends(require_admin),
):
    template = _get_admin_template(
        template_id,
        admin,
    )

    try:
        content = extract_document_content(
            template["template_path"]
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail="Template file not found.",
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return {
        "template": {
            "id": template["id"],
            "title": template["title"],
            "original_filename":
                template["original_filename"],
            "status": template["status"],
        },
        "content": content,
    }


@router.get("/templates/{template_id}")
def get_template_detail(template_id: int, admin: dict = Depends(require_admin)):
    template = _get_admin_template(template_id, admin)
    fields = db.query(
        """SELECT id, field_key, label, field_type, required,
                  placeholder_text AS source_text, field_order
           FROM template_fields WHERE template_id = %s ORDER BY field_order, id""",
        (template_id,),
    )
    for field in fields:
        field["options"] = SUPPORTED_FIELDS[field["field_key"]].get("options")
    return {"template": template, "fields": fields}


@router.get("/templates/{template_id}/preview")
def preview_template(template_id: int, admin: dict = Depends(require_admin)):
    template = _get_admin_template(template_id, admin)
    try:
        path = safe_stored_path(template["template_path"], TEMPLATE_ROOT)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Template file not found.")
    media_type = "application/pdf" if template["file_type"] == "pdf" else (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(path, media_type=media_type, filename=template["original_filename"],
                        content_disposition_type="inline")


@router.post("/templates/{template_id}/unpublish")
def unpublish_template(template_id: int, admin: dict = Depends(require_admin)):
    _get_admin_template(template_id, admin)
    rows = db.query(
        """UPDATE templates SET status = 'analyzed' WHERE id = %s
           RETURNING id, title, file_type, document_type, status""",
        (template_id,),
    )
    return {"success": True, "template": rows[0]}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, admin: dict = Depends(require_admin)):
    template = _get_admin_template(template_id, admin)
    usage = db.query("SELECT COUNT(*) AS count FROM generated_documents WHERE template_id = %s", (template_id,))[0]
    if usage["count"]:
        raise HTTPException(status_code=409, detail="Templates with generated document history cannot be deleted.")
    db.query("DELETE FROM templates WHERE id = %s", (template_id,))
    try:
        safe_stored_path(template["template_path"], TEMPLATE_ROOT).unlink(missing_ok=True)
    except ValueError:
        pass
    return {"success": True}


@router.get("/documents")
def generated_history(admin: dict = Depends(require_admin)):
    documents = db.query(
        """SELECT gd.id, gd.user_id, u.name AS user_name, gd.template_id,
                  t.title AS template_title, gd.generated_filename, gd.file_type, gd.created_at
           FROM generated_documents gd
           JOIN templates t ON t.id = gd.template_id
           JOIN users u ON u.id = gd.user_id
           WHERE t.admin_id = %s ORDER BY gd.created_at DESC""",
        (admin["id"],),
    )
    return {"documents": documents}


@router.get("/users")
def list_users(admin: dict = Depends(require_admin)):
    users = db.query(
        """SELECT u.id, u.name, u.email, u.role, u.created_at,
                  COUNT(gd.id) AS generated_document_count
           FROM users u LEFT JOIN generated_documents gd ON gd.user_id = u.id
           GROUP BY u.id ORDER BY u.created_at DESC"""
    )
    return {"users": users}


@router.post(
    "/templates/{template_id}/analyze",
    response_model=AnalyzeTemplateResponse,
)
def analyze_template(
    template_id: int,
    admin: dict = Depends(require_admin),
):
    template = _get_admin_template(
        template_id,
        admin,
    )

    if template["status"] == "published":
        raise HTTPException(
            status_code=400,
            detail="Unpublish the template before analyzing it again.",
        )

    try:
        extracted_content = (
            extract_document_content(
                template["template_path"]
            )
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail="Template file not found.",
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    try:
        print(
            "\n========== ANALYZE TEMPLATE =========="
        )
        print(
            f"Template ID: {template_id}"
        )
        print(
            f"Template path: {template['template_path']}"
        )
        print(
            "Calling controlled template analyzer..."
        )

        analysis = analyze_template_content(
            extracted_content
        )

        print(
            "Analyzer returned successfully."
        )
        print(
            f"Document type: {analysis.document_type}"
        )
        print(
            f"Detected fields: {len(analysis.fields)}"
        )
        print(
            "======================================\n"
        )

    except ValueError as exc:
        print(
            "\n========== ANALYZER VALUE ERROR =========="
        )
        print(
            f"Exception type: {type(exc).__name__}"
        )
        print(
            f"Exception message: {exc}"
        )
        traceback.print_exc()
        print(
            "==========================================\n"
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "\n========== ANALYZE ROUTE ERROR =========="
        )
        print(
            f"Exception type: {type(exc).__name__}"
        )
        print(
            f"Exception message: {exc}"
        )
        traceback.print_exc()
        print(
            "=========================================\n"
        )

        raise HTTPException(
            status_code=500,
            detail="Template analysis failed.",
        ) from exc

    try:
        db.query(
            """
            DELETE FROM template_fields
            WHERE template_id = %s
            """,
            (template_id,),
        )

        for index, field in enumerate(
            analysis.fields
        ):
            db.query(
                """
                INSERT INTO template_fields (
                    template_id,
                    field_key,
                    label,
                    field_type,
                    required,
                    placeholder_text,
                    field_order
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    template_id,
                    field.field_key,
                    field.label,
                    field.field_type,
                    field.required,
                    field.source_text,
                    index,
                ),
            )

        db.query(
            """
            UPDATE templates
            SET document_type = %s,
                status = CASE WHEN status = 'published' THEN status ELSE 'analyzed' END
            WHERE id = %s
            """,
            (
                analysis.document_type,
                template_id,
            ),
        )

    except Exception as exc:
        print(
            "\n========== ANALYSIS DATABASE ERROR =========="
        )
        print(
            f"Exception type: {type(exc).__name__}"
        )
        print(
            f"Exception message: {exc}"
        )
        print(
            f"Template ID: {template_id}"
        )
        print(
            f"Document type: {analysis.document_type}"
        )
        print(
            f"Field count: {len(analysis.fields)}"
        )
        traceback.print_exc()
        print(
            "=============================================\n"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not save detected template fields.",
        ) from exc

    response_payload = {
        "template_id": template_id,
        "document_type":
            analysis.document_type,
        "fields":
            analysis.fields,
    }

    print(
        "\n========== ANALYZE RESPONSE READY =========="
    )
    print(
        f"Template ID: {template_id}"
    )
    print(
        f"Document type: {analysis.document_type}"
    )
    print(
        f"Fields returned: {len(analysis.fields)}"
    )
    print(
        "============================================\n"
    )

    return response_payload


@router.get(
    "/templates/{template_id}/fields"
)
def get_template_fields(
    template_id: int,
    admin: dict = Depends(require_admin),
):
    _get_admin_template(
        template_id,
        admin,
    )

    fields = db.query(
        """
        SELECT
            id,
            field_key,
            label,
            field_type,
            required,
            placeholder_text AS source_text,
            field_order
        FROM template_fields
        WHERE template_id = %s
        ORDER BY
            field_order ASC,
            id ASC
        """,
        (template_id,),
    )

    return {
        "template_id": template_id,
        "fields": fields,
    }


@router.post(
    "/templates/{template_id}/fields"
)
def create_template_field(
    template_id: int,
    body: CreateTemplateField,
    admin: dict = Depends(require_admin),
):
    template = _get_admin_template(
        template_id,
        admin,
    )

    if template["status"] == "published":
        raise HTTPException(
            status_code=400,
            detail=(
                "Published templates cannot be modified."
            ),
        )

    duplicate = db.query(
        """
        SELECT id
        FROM template_fields
        WHERE template_id = %s
          AND field_key = %s
        LIMIT 1
        """,
        (
            template_id,
            body.field_key,
        ),
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=(
                "A field with this field_key "
                "already exists."
            ),
        )

    count_rows = db.query(
        """
        SELECT COUNT(*) AS count
        FROM template_fields
        WHERE template_id = %s
        """,
        (template_id,),
    )

    field_order = count_rows[0]["count"]

    rows = db.query(
        """
        INSERT INTO template_fields (
            template_id,
            field_key,
            label,
            field_type,
            required,
            placeholder_text,
            field_order
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        RETURNING
            id,
            template_id,
            field_key,
            label,
            field_type,
            required,
            placeholder_text AS source_text,
            field_order
        """,
        (
            template_id,
            body.field_key,
            body.label.strip(),
            body.field_type,
            body.required,
            body.source_text.strip(),
            field_order,
        ),
    )

    return rows[0]


@router.put(
    "/templates/{template_id}/fields/{field_id}"
)
def update_template_field(
    template_id: int,
    field_id: int,
    body: UpdateTemplateField,
    admin: dict = Depends(require_admin),
):
    template = _get_admin_template(
        template_id,
        admin,
    )

    if template["status"] == "published":
        raise HTTPException(
            status_code=400,
            detail=(
                "Published templates cannot be modified."
            ),
        )

    _get_template_field(
        template_id,
        field_id,
    )

    duplicate = db.query(
        """
        SELECT id
        FROM template_fields
        WHERE template_id = %s
          AND field_key = %s
          AND id <> %s
        LIMIT 1
        """,
        (
            template_id,
            body.field_key,
            field_id,
        ),
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=(
                "Another field already uses "
                "this field_key."
            ),
        )

    rows = db.query(
        """
        UPDATE template_fields
        SET
            field_key = %s,
            label = %s,
            field_type = %s,
            required = %s,
            placeholder_text = %s
        WHERE id = %s
          AND template_id = %s
        RETURNING
            id,
            template_id,
            field_key,
            label,
            field_type,
            required,
            placeholder_text AS source_text,
            field_order
        """,
        (
            body.field_key,
            body.label.strip(),
            body.field_type,
            body.required,
            body.source_text.strip(),
            field_id,
            template_id,
        ),
    )

    return rows[0]


@router.delete(
    "/templates/{template_id}/fields/{field_id}"
)
def delete_template_field(
    template_id: int,
    field_id: int,
    admin: dict = Depends(require_admin),
):
    template = _get_admin_template(
        template_id,
        admin,
    )

    if template["status"] == "published":
        raise HTTPException(
            status_code=400,
            detail=(
                "Published templates cannot be modified."
            ),
        )

    _get_template_field(
        template_id,
        field_id,
    )

    db.query(
        """
        DELETE FROM template_fields
        WHERE id = %s
          AND template_id = %s
        """,
        (
            field_id,
            template_id,
        ),
    )

    return {
        "success": True,
        "message": "Template field deleted.",
    }


@router.post(
    "/templates/{template_id}/publish"
)
def publish_template(
    template_id: int,
    admin: dict = Depends(require_admin),
):
    template = _get_admin_template(
        template_id,
        admin,
    )

    if template["status"] == "published":
        return {
            "success": True,
            "template_id": template_id,
            "status": "published",
        }

    fields = db.query(
        """
        SELECT id
        FROM template_fields
        WHERE template_id = %s
        """,
        (template_id,),
    )

    if not fields:
        raise HTTPException(
            status_code=400,
            detail=(
                "Template cannot be published "
                "without fields."
            ),
        )

    if not template["document_type"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Analyze the template before publishing."
            ),
        )

    rows = db.query(
        """
        UPDATE templates
        SET status = 'published'
        WHERE id = %s
        RETURNING
            id,
            title,
            document_type,
            status
        """,
        (template_id,),
    )

    return {
        "success": True,
        "template":
            rows[0],
    }
