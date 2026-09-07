from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from fastapi.responses import FileResponse

from app import db
from app.models.template import GenerateDocumentRequest
from app.routes.auth import require_user
from app.services.document_service import generate_document
from app.services.field_schema import SUPPORTED_FIELDS
from app.services.storage import GENERATED_ROOT, TEMPLATE_ROOT, safe_stored_path
from app.validators import validate_and_normalize


router = APIRouter()


# =========================================================
# PUBLISHED TEMPLATES
# =========================================================


@router.get("/templates")
def list_published_templates(
    user: dict = Depends(require_user),
):
    templates = db.query(
        """
        SELECT
            id,
            title,
            original_filename,
            file_type,
            document_type,
            status,
            (SELECT COUNT(*) FROM template_fields tf WHERE tf.template_id = templates.id) AS field_count
        FROM templates
        WHERE status = 'published'
        ORDER BY id DESC
        """
    )

    return {
        "templates": templates,
    }


@router.get("/templates/{template_id}")
def get_published_template(
    template_id: int,
    user: dict = Depends(require_user),
):
    rows = db.query(
        """
        SELECT
            id,
            title,
            original_filename,
            file_type,
            document_type,
            status
        FROM templates
        WHERE id = %s
          AND status = 'published'
        LIMIT 1
        """,
        (template_id,),
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Published template not found.",
        )

    template = rows[0]

    fields = db.query(
        """
        SELECT
            id,
            field_key,
            label,
            field_type,
            required,
            field_order
        FROM template_fields
        WHERE template_id = %s
        ORDER BY
            field_order ASC,
            id ASC
        """,
        (template_id,),
    )
    for field in fields:
        field["options"] = SUPPORTED_FIELDS[field["field_key"]].get("options")

    return {
        "template_id": template["id"],
        "title": template["title"],
        "original_filename": template[
            "original_filename"
        ],
        "document_type": template[
            "document_type"
        ],
        "file_type": template["file_type"],
        "status": template["status"],
        "fields": fields,
    }


@router.get("/templates/{template_id}/preview")
def preview_published_template(
    template_id: int,
    user: dict = Depends(require_user),
):
    rows = db.query(
        """
        SELECT
            id,
            original_filename,
            template_path,
            file_type
        FROM templates
        WHERE id = %s
          AND status = 'published'
        LIMIT 1
        """,
        (template_id,),
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Published template not found.",
        )

    template = rows[0]

    try:
        file_path = safe_stored_path(
            template["template_path"],
            TEMPLATE_ROOT,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Template file not found.",
        )

    media_type = (
        "application/pdf"
        if template["file_type"] == "pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=template["original_filename"],
        content_disposition_type="inline",
    )


# =========================================================
# GENERATE DOCUMENT
# =========================================================


@router.post("/templates/{template_id}/generate")
def generate_user_document(
    template_id: int,
    body: GenerateDocumentRequest,
    user: dict = Depends(require_user),
):
    templates = db.query(
        """
        SELECT
            id,
            title,
            original_filename,
            template_path,
            file_type,
            document_type,
            status
        FROM templates
        WHERE id = %s
          AND status = 'published'
        LIMIT 1
        """,
        (template_id,),
    )

    if not templates:
        raise HTTPException(
            status_code=404,
            detail="Published template not found.",
        )

    template = templates[0]

    fields = db.query(
        """
        SELECT
            id,
            field_key,
            label,
            field_type,
            required,
            placeholder_text,
            field_order
        FROM template_fields
        WHERE template_id = %s
        ORDER BY
            field_order ASC,
            id ASC
        """,
        (template_id,),
    )

    if not fields:
        raise HTTPException(
            status_code=400,
            detail="Template has no configurable fields.",
        )

    allowed_keys = {
        field["field_key"]
        for field in fields
    }

    submitted_keys = set(
        body.values.keys()
    )

    unknown_keys = (
        submitted_keys
        - allowed_keys
    )

    if unknown_keys:
        raise HTTPException(
            status_code=400,
            detail={
                "message":
                    "Unknown template fields submitted.",
                "fields":
                    sorted(unknown_keys),
            },
        )

    missing_fields = []
    validation_errors = {}

    replacements = {}

    signature_replacements = {}

    submitted_values = {}


    for field in fields:
        key = field["field_key"]

        raw_value = body.values.get(
            key
        )

        if raw_value is None:
            value = ""
        else:
            value = str(
                raw_value
            ).strip()


        if (
            field["required"]
            and not value
        ):
            missing_fields.append(
                key
            )


        if value and field["field_type"] != "signature":
            try:
                value = validate_and_normalize(key, value)
            except ValueError as exc:
                validation_errors[key] = str(exc)

        # Do NOT store the huge base64
        # signature in document history.
        if (
            field["field_type"]
            == "signature"
        ):
            if len(value) > 3_000_000:
                validation_errors[key] = "Signature image is too large."
            if value:
                submitted_values[
                    field["id"]
                ] = "[signature]"
            else:
                submitted_values[
                    field["id"]
                ] = ""

            signature_replacements[
                field["placeholder_text"]
            ] = value

        else:
            submitted_values[
                field["id"]
            ] = value

            replacements[
                field["placeholder_text"]
            ] = value


    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail={
                "message":
                    "Required fields are missing.",
                "fields":
                    missing_fields,
            },
        )

    if validation_errors:
        raise HTTPException(
            status_code=400,
            detail={"message": "One or more fields are invalid.", "fields": validation_errors},
        )


    # -----------------------------------------------------
    # Generate in the template's native format.
    # -----------------------------------------------------

    try:
        try:
            template_path = safe_stored_path(template["template_path"], TEMPLATE_ROOT)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        result = generate_document(
            template_path=template_path,
            replacements=replacements,
            signature_replacements=(
                signature_replacements
            ),
            output_name=(
                f"{template['title']}_"
                f"user_{user['id']}"
            ),
        )

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail="Template file not found.",
        ) from exc

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not generate document.",
        ) from exc


    # -----------------------------------------------------
    # Save generated document history
    # -----------------------------------------------------

    try:
        generated_rows = db.query(
            """
            INSERT INTO generated_documents (
                template_id,
                user_id,
                generated_filename,
                generated_path
                , file_type
            )
            VALUES (
                %s,
                %s,
                %s,
                %s
                , %s
            )
            RETURNING
                id,
                created_at
            """,
            (
                template_id,
                user["id"],
                result["filename"],
                result["path"],
                template["file_type"],
            ),
        )

        if not generated_rows:
            raise RuntimeError(
                "Could not save generated document."
            )

        generated_document = (
            generated_rows[0]
        )

        generated_document_id = (
            generated_document["id"]
        )


        # Save each submitted field value.
        for field_id, value in (
            submitted_values.items()
        ):
            db.execute(
                """
                INSERT INTO document_field_values (
                    generated_document_id,
                    field_id,
                    value
                )
                VALUES (
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    generated_document_id,
                    field_id,
                    value,
                ),
            )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Document was generated, "
                "but history could not be saved."
            ),
        ) from exc


    return {
        "success": True,
        "generated_document_id":
            generated_document_id,
        "template_id":
            template_id,
        "template_title":
            template["title"],
        "filename":
            result["filename"],
        "replacement_count":
            result["replacement_count"],
        "signature_count":
            result["signature_count"],
        "created_at":
            generated_document[
                "created_at"
            ],
        "download_url": (
            "/api/user/documents/"
            f"{generated_document_id}/download"
        ),
        "preview_url": f"/api/user/documents/{generated_document_id}/preview",
        "file_type": template["file_type"],
    }


# =========================================================
# MY GENERATED DOCUMENTS
# =========================================================


@router.get("/documents")
def list_my_documents(
    user: dict = Depends(require_user),
):
    documents = db.query(
        """
        SELECT
            gd.id,
            gd.template_id,
            t.title AS template_title,
            t.document_type,
            gd.generated_filename,
            gd.file_type,
            gd.created_at
        FROM generated_documents gd

        JOIN templates t
          ON t.id = gd.template_id

        WHERE gd.user_id = %s

        ORDER BY gd.created_at DESC
        """,
        (user["id"],),
    )

    return {
        "documents": documents,
    }


# =========================================================
# SINGLE GENERATED DOCUMENT
# =========================================================


@router.get("/documents/{document_id}")
def get_my_document(
    document_id: int,
    user: dict = Depends(require_user),
):
    rows = db.query(
        """
        SELECT
            gd.id,
            gd.template_id,
            t.title AS template_title,
            t.document_type,
            gd.generated_filename,
            gd.file_type,
            gd.created_at
        FROM generated_documents gd

        JOIN templates t
          ON t.id = gd.template_id

        WHERE gd.id = %s
          AND gd.user_id = %s

        LIMIT 1
        """,
        (
            document_id,
            user["id"],
        ),
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Generated document not found.",
        )

    document = rows[0]

    values = db.query(
        """
        SELECT
            tf.field_key,
            tf.label,
            tf.field_type,
            dfv.value
        FROM document_field_values dfv

        JOIN template_fields tf
          ON tf.id = dfv.field_id

        WHERE
            dfv.generated_document_id = %s

        ORDER BY
            tf.field_order ASC,
            tf.id ASC
        """,
        (document_id,),
    )

    return {
        "document": document,
        "values": values,
        "download_url": (
            "/api/user/documents/"
            f"{document_id}/download"
        ),
        "preview_url": f"/api/user/documents/{document_id}/preview",
    }


# =========================================================
# DOWNLOAD GENERATED DOCUMENT
# =========================================================


def _generated_file(document_id: int, user: dict) -> tuple[dict, object]:
    rows = db.query(
        """SELECT id, generated_filename, generated_path, file_type
           FROM generated_documents WHERE id = %s AND user_id = %s LIMIT 1""",
        (document_id, user["id"]),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Generated document not found.")
    document = rows[0]
    try:
        file_path = safe_stored_path(document["generated_path"], GENERATED_ROOT)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    expected_suffix = ".pdf" if document["file_type"] == "pdf" else ".docx"
    if not file_path.is_file() or file_path.suffix.lower() != expected_suffix:
        raise HTTPException(status_code=404, detail="Generated document file does not exist.")
    return document, file_path


@router.get("/documents/{document_id}/download")
def download_generated_document(
    document_id: int,
    user: dict = Depends(require_user),
):
    document, file_path = _generated_file(document_id, user)
    media_type = "application/pdf" if document["file_type"] == "pdf" else (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(
        path=str(file_path),
        filename=document["generated_filename"],
        media_type=media_type,
    )


@router.get("/documents/{document_id}/preview")
def preview_generated_document(document_id: int, user: dict = Depends(require_user)):
    document, file_path = _generated_file(document_id, user)
    media_type = "application/pdf" if document["file_type"] == "pdf" else (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    return FileResponse(path=str(file_path), filename=document["generated_filename"],
                        media_type=media_type, content_disposition_type="inline")
