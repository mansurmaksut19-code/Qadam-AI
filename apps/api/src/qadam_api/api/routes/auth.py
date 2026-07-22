"""Public account endpoints for the QADAM MVP."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from qadam_api.auth import AuthStore
from qadam_api.settings import get_settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
store = AuthStore(get_settings().auth_database_path, get_settings().auth_session_days)
BearerToken = Annotated[str | None, Header(alias="Authorization")]


class Credentials(BaseModel):
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$", min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="Student", min_length=2, max_length=40)


def _session(user: dict[str, str | int], token: str) -> dict[str, object]:
    return {"user": user, "access_token": token, "token_type": "bearer"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: Credentials) -> dict[str, object]:
    try:
        user = store.create_user(payload.email, payload.password, payload.role)
    except Exception as error:
        if "UNIQUE" in str(error).upper():
            raise HTTPException(status_code=409, detail="Аккаунт с этим email уже существует.") from error
        raise
    authenticated = store.authenticate(payload.email, payload.password)
    if authenticated is None:
        raise HTTPException(status_code=500, detail="Не удалось создать сессию.")
    user, token = authenticated
    return _session(user, token)


@router.post("/login")
def login(payload: Credentials) -> dict[str, object]:
    authenticated = store.authenticate(payload.email, payload.password)
    if authenticated is None:
        raise HTTPException(status_code=401, detail="Неверный email или пароль.")
    user, token = authenticated
    return _session(user, token)


@router.get("/me")
def me(authorization: BearerToken) -> dict[str, object]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Требуется активная сессия.")
    user = store.get_user(authorization[7:].strip())
    if user is None:
        raise HTTPException(status_code=401, detail="Сессия истекла. Войдите снова.")
    return {"user": user}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: BearerToken) -> None:
    if authorization and authorization.lower().startswith("bearer "):
        store.revoke(authorization[7:].strip())
