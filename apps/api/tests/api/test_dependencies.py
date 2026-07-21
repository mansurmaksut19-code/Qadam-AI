from qadam_api.analysis.document_qa import (
    DeterministicQuestionProvider,
    ResilientQuestionProvider,
)
from qadam_api.api.dependencies import build_explanation_provider, build_question_provider
from qadam_api.providers.explanations import (
    DeterministicExplanationProvider,
    ResilientExplanationProvider,
)
from qadam_api.settings import Settings


def test_explanation_provider_is_deterministic_without_complete_llm_configuration() -> None:
    assert isinstance(
        build_explanation_provider(Settings(_env_file=None)),  # type: ignore[call-arg]
        DeterministicExplanationProvider,
    )
    assert isinstance(
        build_explanation_provider(
            Settings(  # type: ignore[call-arg]
                _env_file=None,
                llm_base_url="https://example.test/v1/",
                llm_model="qadam-explainer",
            )
        ),
        DeterministicExplanationProvider,
    )


def test_complete_llm_configuration_enables_resilient_provider() -> None:
    provider = build_explanation_provider(
        Settings(  # type: ignore[call-arg]
            _env_file=None,
            llm_base_url="https://example.test/v1/",
            llm_api_key="secret",
            llm_model="qadam-explainer",
        )
    )

    assert isinstance(provider, ResilientExplanationProvider)


def test_question_provider_is_deterministic_without_complete_configuration() -> None:
    assert isinstance(
        build_question_provider(Settings(_env_file=None)),  # type: ignore[call-arg]
        DeterministicQuestionProvider,
    )
    assert isinstance(
        build_question_provider(
            Settings(  # type: ignore[call-arg]
                _env_file=None,
                llm_base_url="https://example.test/v1/",
                llm_model="qadam-qa",
            )
        ),
        DeterministicQuestionProvider,
    )


def test_complete_llm_configuration_enables_resilient_question_provider() -> None:
    provider = build_question_provider(
        Settings(  # type: ignore[call-arg]
            _env_file=None,
            llm_base_url="https://example.test/v1/",
            llm_api_key="secret",
            llm_model="qadam-qa",
        )
    )

    assert isinstance(provider, ResilientQuestionProvider)
