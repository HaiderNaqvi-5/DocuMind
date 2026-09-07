from datetime import date, timedelta

import pytest

from app.validators import validate_and_normalize


@pytest.mark.parametrize("raw", ["03001234567", "+923001234567", "923001234567"])
def test_pakistani_phone_formats_are_normalized(raw):
    assert validate_and_normalize("phone_number", raw) == "+923001234567"


def test_cnic_and_email_are_normalized():
    assert validate_and_normalize("cnic", "3520212345671") == "35202-1234567-1"
    assert validate_and_normalize("email", " USER@Example.COM ") == "user@example.com"


def test_future_birth_date_and_invalid_gender_are_rejected():
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    with pytest.raises(ValueError, match="future"):
        validate_and_normalize("date_of_birth", tomorrow)
    with pytest.raises(ValueError, match="gender"):
        validate_and_normalize("gender", "Custom")
