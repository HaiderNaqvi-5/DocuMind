import pytest

from app.models.template import CreateTemplateField
from app.models.user import RegisterUser
from app.services.field_schema import SUPPORTED_FIELD_KEYS, field_metadata, normalize_field_key
from app.services.template_analyzer import normalize_analyzer_fields


def test_authoritative_schema_has_exactly_eight_fields_and_gender_metadata():
    assert SUPPORTED_FIELD_KEYS == {
        "full_name", "email", "phone_number", "gender", "cnic",
        "date_of_birth", "address", "signature",
    }
    assert field_metadata("gender")["field_type"] == "select"
    assert field_metadata("gender")["options"] == ["Male", "Female", "Other", "Prefer not to say"]


def test_aliases_and_analyzer_output_are_strictly_filtered():
    text = "Applicant Name: Jane Doe\nSummary: Expert engineer\nEmail: jane@example.com"
    fields = normalize_analyzer_fields([
        {"field_key": "applicant_name", "source_text": "Jane Doe"},
        {"field_key": "summary", "source_text": "Expert engineer"},
        {"field_key": "email", "source_text": "invented@example.com"},
    ], text)
    assert [(field["field_key"], field["source_text"]) for field in fields] == [("full_name", "Jane Doe")]
    assert normalize_field_key("LinkedIn") is None


def test_admin_field_models_reject_non_schema_fields_and_wrong_types():
    with pytest.raises(ValueError):
        CreateTemplateField(field_key="experience", label="Experience", field_type="textarea", source_text="old")
    with pytest.raises(ValueError):
        CreateTemplateField(field_key="gender", label="Gender", field_type="text", source_text="___")


def test_public_registration_payload_cannot_retain_admin_role():
    request = RegisterUser(name="Public User", email="user@example.com", password="secret", role="admin")
    assert "role" not in request.model_dump()
