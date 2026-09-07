import os

from dotenv import load_dotenv


load_dotenv()


DB_HOST = os.getenv(
    "DB_HOST",
    "localhost",
)

DB_PORT = int(
    os.getenv(
        "DB_PORT",
        "5432",
    )
)

DB_NAME = os.getenv(
    "DB_NAME",
    "ai_document_generator",
)

DB_USER = os.getenv(
    "DB_USER",
    "aidoc",
)

DB_PASSWORD = os.getenv(
    "DB_PASSWORD",
    "aidoc123",
)


OPENAI_API_KEY = os.getenv(
    "OPENAI_API_KEY",
)
CHAT_MODEL = os.getenv(
    "CHAT_MODEL",
    "gpt-4o-mini",
)

JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "change-me",
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)

JWT_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_EXPIRE_MINUTES",
        "60",
    )
)


DATABASE_URL = (
    f"postgresql://"
    f"{DB_USER}:"
    f"{DB_PASSWORD}@"
    f"{DB_HOST}:"
    f"{DB_PORT}/"
    f"{DB_NAME}"
)