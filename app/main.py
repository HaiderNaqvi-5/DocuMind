from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import db
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.user import router as user_router


STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    db.close_pool()


api = FastAPI(
    title="AI Document Generator",
    version="1.0.0",
    lifespan=lifespan,
)


# -----------------------------
# Static Files
# -----------------------------

api.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)


# -----------------------------
# Routers
# -----------------------------

api.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"],
)

api.include_router(
    admin_router,
    prefix="/api/admin",
    tags=["Admin"],
)

api.include_router(
    user_router,
    prefix="/api/user",
    tags=["User"],
)


# -----------------------------
# Health Check
# -----------------------------

@api.get("/api/health")
def health():
    rows = db.query(
        """
        SELECT
            current_database() AS database,
            current_user AS user
        """
    )

    return {
        "status": "ok",
        "database": rows[0]["database"],
        "database_user": rows[0]["user"],
    }


# -----------------------------
# Home
# -----------------------------

@api.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")


@api.get("/login", include_in_schema=False)
def login_page():
    return FileResponse(STATIC_DIR / "login.html")


@api.get("/dashboard", include_in_schema=False)
def dashboard_page():
    return FileResponse(STATIC_DIR / "dashboard.html")
