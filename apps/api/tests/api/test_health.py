from fastapi.testclient import TestClient


def test_health_and_openapi_identify_qadam_api(client: TestClient) -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert client.get("/openapi.json").json()["info"]["title"] == "QADAM AI API"
