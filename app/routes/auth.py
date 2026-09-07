from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.models.user import (
    LoginUser,
    RegisterUser,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    decode_access_token,
    get_user_by_id,
)


router = APIRouter()

security = HTTPBearer()


@router.post(
    "/register",
    response_model=UserResponse,
)
def register(
    body: RegisterUser,
):
    try:
        user = create_user(
            name=body.name,
            email=body.email,
            password=body.password,
            role="user",
        )

        return user

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    body: LoginUser,
):
    user = authenticate_user(
        body.email,
        body.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(
        user
    )

    return {
        "access_token":
            token,

        "token_type":
            "bearer",

        "user": {
            "id":
                user["id"],

            "name":
                user["name"],

            "email":
                user["email"],

            "role":
                user["role"],
        },
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
) -> dict:
    token = credentials.credentials

    try:
        payload = decode_access_token(
            token
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user_id = payload.get(
        "sub"
    )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )

    try:
        user_id = int(
            user_id
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        ) from exc

    user = get_user_by_id(
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    return user


def require_admin(
    current_user: dict = Depends(
        get_current_user
    ),
) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )

    return current_user


def require_user(
    current_user: dict = Depends(
        get_current_user
    ),
) -> dict:
    if current_user["role"] != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User access required.",
        )

    return current_user


@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    current_user: dict = Depends(
        get_current_user
    ),
):
    return {
        "id":
            current_user["id"],

        "name":
            current_user["name"],

        "email":
            current_user["email"],

        "role":
            current_user["role"],
    }
