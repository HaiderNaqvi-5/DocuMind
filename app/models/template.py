from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.services.field_schema import SUPPORTED_FIELDS, normalize_field_key


FieldType = Literal[
    "text",
    "email",
    "number",
    "date",
    "textarea",
    "signature",
    "select",
]


class TemplateResponse(BaseModel):
    id: int

    title: str

    original_filename: str

    file_type: Literal["docx", "pdf"]

    document_type: str | None = None

    status: str


class DetectedTemplateField(BaseModel):
    """
    Field returned by the AI analyzer.

    source_text can represent either:
    - a short scalar value
    - a paragraph
    - multiple paragraphs
    - a complete semantic document section

    Therefore it must NOT be limited to 500 characters.
    """

    field_key: str = Field(
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_]*$",
    )

    label: str = Field(
        min_length=1,
        max_length=150,
    )

    field_type: FieldType

    required: bool = True

    source_text: str = Field(
        min_length=1,
    )

    @field_validator("field_key")
    @classmethod
    def supported_key(cls, value: str) -> str:
        key = normalize_field_key(value)
        if key not in SUPPORTED_FIELDS:
            raise ValueError("Field key is not supported.")
        return key

    @field_validator("field_type")
    @classmethod
    def schema_field_type(cls, value: str, info):
        key = info.data.get("field_key")
        if key and value != SUPPORTED_FIELDS[key]["field_type"]:
            raise ValueError("Field type does not match the supported field schema.")
        return value


class TemplateAnalysis(BaseModel):
    """
    Internal result produced by the controlled
    document field analyzer.
    """

    document_type: str = Field(
        min_length=1,
        max_length=100,
    )

    fields: list[
        DetectedTemplateField
    ] = Field(
        default_factory=list,
    )


class AnalyzeTemplateResponse(BaseModel):
    """
    API response returned after AI analysis.
    """

    template_id: int

    document_type: str

    fields: list[
        DetectedTemplateField
    ] = Field(
        default_factory=list,
    )


class CreateTemplateField(BaseModel):
    field_key: str = Field(
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_]*$",
    )

    label: str = Field(
        min_length=1,
        max_length=150,
    )

    field_type: FieldType

    required: bool = True

    source_text: str = Field(
        min_length=1,
    )

    @field_validator("field_key")
    @classmethod
    def supported_key(cls, value: str) -> str:
        key = normalize_field_key(value)
        if not key:
            raise ValueError("Field key is not supported.")
        return key

    @field_validator("field_type")
    @classmethod
    def schema_field_type(cls, value: str, info):
        key = info.data.get("field_key")
        if key and value != SUPPORTED_FIELDS[key]["field_type"]:
            raise ValueError("Field type does not match the supported field schema.")
        return value


class UpdateTemplateField(BaseModel):
    field_key: str = Field(
        min_length=1,
        max_length=100,
        pattern=r"^[a-z][a-z0-9_]*$",
    )

    label: str = Field(
        min_length=1,
        max_length=150,
    )

    field_type: FieldType

    required: bool

    source_text: str = Field(
        min_length=1,
    )

    @field_validator("field_key")
    @classmethod
    def supported_key(cls, value: str) -> str:
        key = normalize_field_key(value)
        if not key:
            raise ValueError("Field key is not supported.")
        return key

    @field_validator("field_type")
    @classmethod
    def schema_field_type(cls, value: str, info):
        key = info.data.get("field_key")
        if key and value != SUPPORTED_FIELDS[key]["field_type"]:
            raise ValueError("Field type does not match the supported field schema.")
        return value


class GenerateDocumentRequest(BaseModel):
    values: dict[
        str,
        str,
    ]
