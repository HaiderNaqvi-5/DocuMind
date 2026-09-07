from datetime import (
    datetime,
    timedelta,
    timezone,
)

from jose import JWTError, jwt
from passlib.context import CryptContext

from app import db
from app.config import (
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
    JWT_SECRET,
)


password_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)


def hash_password(
    password: str,
) -> str:
    return password_context.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_context.verify(
        plain_password,
        hashed_password,
    )


def get_user_by_email(
    email: str,
) -> dict | None:
    rows = db.query(
        """
        SELECT
            id,
            name,
            email,
            password_hash,
            role
        FROM users
        WHERE email = %s
        LIMIT 1
        """,
        (
            email.lower().strip(),
        ),
    )

    if not rows:
        return None

    return rows[0]


def get_user_by_id(
    user_id: int,
) -> dict | None:
    rows = db.query(
        """
        SELECT
            id,
            name,
            email,
            password_hash,
            role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (
            user_id,
        ),
    )

    if not rows:
        return None

    return rows[0]


def create_user(
    name: str,
    email: str,
    password: str,
    role: str,
) -> dict:
    existing = get_user_by_email(
        email
    )

    if existing:
        raise ValueError(
            "A user with this email already exists."
        )

    password_hash = hash_password(
        password
    )

    rows = db.query(
        """
        INSERT INTO users (
            name,
            email,
            password_hash,
            role
        )
        VALUES (
            %s,
            %s,
            %s,
            %s
        )
        RETURNING
            id,
            name,
            email,
            role
        """,
        (
            name.strip(),
            email.lower().strip(),
            password_hash,
            role,
        ),
    )

    return rows[0]


def authenticate_user(
    email: str,
    password: str,
) -> dict | None:
    user = get_user_by_email(
        email
    )

    if not user:
        return None

    if not verify_password(
        password,
        user["password_hash"],
    ):
        return None

    return user


def create_access_token(
    user: dict,
) -> str:
    expires_at = (
        datetime.now(
            timezone.utc
        )
        + timedelta(
            minutes=JWT_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(
            user["id"]
        ),
        "role":
            user["role"],
        "exp":
            expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(
    token: str,
) -> dict:
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[
                JWT_ALGORITHM
            ],
        )

    except JWTError as exc:
        raise ValueError(
            "Invalid or expired token."
        ) from exc