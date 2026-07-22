"""Small SQLite-backed account and session store for the public MVP."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from contextlib import closing
from datetime import UTC, datetime, timedelta
from pathlib import Path


class AuthStore:
    def __init__(self, path: Path, session_days: int = 30) -> None:
        self.path = path
        self.session_days = session_days
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as connection, connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'Student',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
                """
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    @staticmethod
    def _hash_password(password: str, salt: bytes | None = None) -> str:
        salt = salt or secrets.token_bytes(16)
        digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
        return f"scrypt${salt.hex()}${digest.hex()}"

    @classmethod
    def _verify_password(cls, password: str, stored: str) -> bool:
        try:
            algorithm, salt_hex, digest_hex = stored.split("$", 2)
            if algorithm != "scrypt":
                return False
            candidate = cls._hash_password(password, bytes.fromhex(salt_hex)).split("$", 2)[2]
            return hmac.compare_digest(candidate, digest_hex)
        except (ValueError, TypeError):
            return False

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def create_user(self, email: str, password: str, role: str) -> dict[str, str | int]:
        now = datetime.now(UTC).isoformat()
        with closing(self._connect()) as connection, connection:
            cursor = connection.execute(
                "INSERT INTO users(email, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                (email.lower(), self._hash_password(password), role, now),
            )
            return {"id": int(cursor.lastrowid), "email": email.lower(), "role": role, "created_at": now}

    def authenticate(self, email: str, password: str) -> tuple[dict[str, str | int], str] | None:
        with closing(self._connect()) as connection, connection:
            user = connection.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        if user is None or not self._verify_password(password, user["password_hash"]):
            return None
        token = secrets.token_urlsafe(32)
        now = datetime.now(UTC)
        with closing(self._connect()) as connection, connection:
            connection.execute(
                "INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (self._token_hash(token), user["id"], (now + timedelta(days=self.session_days)).isoformat(), now.isoformat()),
            )
        return {"id": user["id"], "email": user["email"], "role": user["role"], "created_at": user["created_at"]}, token

    def get_user(self, token: str) -> dict[str, str | int] | None:
        now = datetime.now(UTC).isoformat()
        with closing(self._connect()) as connection:
            row = connection.execute(
                "SELECT u.id, u.email, u.role, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
                (self._token_hash(token), now),
            ).fetchone()
        return dict(row) if row else None

    def revoke(self, token: str) -> None:
        with closing(self._connect()) as connection, connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (self._token_hash(token),))
