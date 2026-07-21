from uuid import UUID

from fastapi.testclient import TestClient

from qadam_api.repositories.memory import InMemoryRepository


def test_grounded_question_returns_answer_and_existing_citations(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Когда мне должны вернуть депозит?"},
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "document"
    assert response.json()["supported"] is True
    assert response.json()["citations"][0]["source_id"] == "civil-lease-552"
    assert response.json()["evidence"][0]["excerpt"].startswith("Депозит")
    assert "депозит" in response.json()["answer"].casefold()


def test_question_about_unseen_fact_returns_document_evidence(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Какой город указан в договоре?"},
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["supported"] is True
    assert payload["mode"] == "document"
    assert payload["confidence"] >= 0.35
    assert payload["evidence"][0]["excerpt"].endswith("Караганда.")
    assert payload["evidence"][0]["block_index"] == 0


def test_unsupported_question_refuses_to_invent_an_answer(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Какие акции купить завтра?"},
    )

    assert response.status_code == 200
    assert response.json()["mode"] == "unsupported"
    assert response.json()["supported"] is False
    assert response.json()["confidence"] == 0.0
    assert response.json()["evidence"] == []
    assert response.json()["citations"] == []
    assert "договор" in response.json()["answer"].casefold()


def test_action_question_returns_exact_finding_evidence_and_citations(
    client: TestClient,
    uploaded_analysis: tuple[UUID, str],
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Как решить эти проблемы?"},
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["mode"] == "action"
    assert payload["supported"] is True
    assert "Зафиксируйте срок возврата" in payload["answer"]
    assert payload["evidence"][0]["block_index"] == 1
    assert payload["evidence"][0]["excerpt"].startswith("Депозит")
    assert [citation["source_id"] for citation in payload["citations"]] == [
        "civil-lease-552"
    ]


def test_question_audit_masks_identifier(
    client: TestClient,
    repository: InMemoryRepository,
    uploaded_analysis: tuple[UUID, str],
) -> None:
    analysis_id, token = uploaded_analysis

    client.post(
        f"/api/v1/analyses/{analysis_id}/questions",
        headers={"X-Analysis-Token": token},
        json={"question": "Есть ли в договоре ИИН 020101501234?"},
    )

    assert "020101501234" not in repository.questions[-1].question
    assert "[ИИН_1]" in repository.questions[-1].question


def test_negotiation_message_is_derived_from_selected_finding(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis
    findings = client.get(
        f"/api/v1/analyses/{analysis_id}/findings",
        headers={"X-Analysis-Token": token},
    ).json()

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/negotiation",
        headers={"X-Analysis-Token": token},
        json={"finding_id": findings[0]["id"], "tone": "polite"},
    )

    assert response.status_code == 200
    assert "возвращается депозит" in response.json()["message"].casefold()
    assert response.json()["finding_id"] == findings[0]["id"]


def test_feedback_is_recorded_without_echoing_free_text(
    client: TestClient, uploaded_analysis: tuple[UUID, str]
) -> None:
    analysis_id, token = uploaded_analysis

    response = client.post(
        f"/api/v1/analyses/{analysis_id}/feedback",
        headers={"X-Analysis-Token": token},
        json={"rating": 4, "comment": "Понятный результат"},
    )

    assert response.status_code == 201
    assert response.json() == {"accepted": True}
