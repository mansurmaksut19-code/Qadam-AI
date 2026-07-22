from qadam_api.auth import AuthStore


def test_auth_store_register_login_session_and_revoke(tmp_path):
    store = AuthStore(tmp_path / "auth.sqlite3")

    user = store.create_user("Judge@Example.com", "strong-password", "Judge demo")
    assert user["email"] == "judge@example.com"

    authenticated = store.authenticate("judge@example.com", "strong-password")
    assert authenticated is not None
    logged_user, token = authenticated
    assert logged_user["role"] == "Judge demo"
    assert store.get_user(token)["email"] == "judge@example.com"

    assert store.authenticate("judge@example.com", "wrong-password") is None
    store.revoke(token)
    assert store.get_user(token) is None
