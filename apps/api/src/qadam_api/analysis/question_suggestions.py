"""Safe contextual questions derived only from extracted report structure."""

from qadam_api.domain import Clause, ClauseType, Finding, Severity

RU_FACTS = {
    ClauseType.DEPOSIT: "Когда и при каких условиях вернут депозит?",
    ClauseType.RENT: "Какая ежемесячная плата?",
    ClauseType.TERM: "Какой срок указан в договоре?",
    ClauseType.PROPERTY: "Какой объект и адрес указаны?",
    ClauseType.UTILITIES: "Кто оплачивает коммунальные услуги?",
    ClauseType.LANDLORD_ACCESS: "Когда арендодатель может посещать жильё?",
    ClauseType.OCCUPANCY: "Кто может проживать в квартире?",
    ClauseType.REPAIRS: "Кто отвечает за ремонт?",
    ClauseType.TERMINATION: "Какой порядок расторжения указан?",
    ClauseType.RENT_CHANGE: "Может ли арендодатель изменить цену?",
}
KZ_FACTS = {
    ClauseType.DEPOSIT: "Депозит қашан және қандай шартпен қайтарылады?",
    ClauseType.RENT: "Ай сайынғы жалдау ақысы қанша?",
    ClauseType.TERM: "Шарттың мерзімі қандай?",
    ClauseType.PROPERTY: "Қандай нысан және мекенжай көрсетілген?",
    ClauseType.UTILITIES: "Коммуналдық қызметтерді кім төлейді?",
    ClauseType.LANDLORD_ACCESS: "Жалға беруші тұрғын үйге қашан кіре алады?",
    ClauseType.OCCUPANCY: "Пәтерде кім тұра алады?",
    ClauseType.REPAIRS: "Жөндеуге кім жауап береді?",
    ClauseType.TERMINATION: "Шартты бұзу тәртібі қандай?",
    ClauseType.RENT_CHANGE: "Жалға беруші бағаны өзгерте ала ма?",
}
RU_ACTIONS = {
    ClauseType.DEPOSIT: "Как изменить условие о депозите?",
    ClauseType.RENT_CHANGE: "Как изменить условие об изменении цены?",
    ClauseType.TERMINATION: "Как изменить условие о расторжении?",
    ClauseType.LANDLORD_ACCESS: "Как исправить условие о доступе арендодателя?",
    ClauseType.REPAIRS: "Как уточнить обязанности по ремонту?",
}
KZ_ACTIONS = {
    ClauseType.DEPOSIT: "Депозит талабын қалай өзгертуге болады?",
    ClauseType.RENT_CHANGE: "Бағаны өзгерту талабын қалай түзетуге болады?",
    ClauseType.TERMINATION: "Шартты бұзу талабын қалай өзгертуге болады?",
    ClauseType.LANDLORD_ACCESS: "Жалға берушінің кіру талабын қалай түзетуге болады?",
    ClauseType.REPAIRS: "Жөндеу міндеттерін қалай нақтылауға болады?",
}
FACT_ORDER = (
    ClauseType.DEPOSIT,
    ClauseType.RENT,
    ClauseType.TERM,
    ClauseType.PROPERTY,
    ClauseType.UTILITIES,
    ClauseType.LANDLORD_ACCESS,
    ClauseType.OCCUPANCY,
    ClauseType.REPAIRS,
    ClauseType.TERMINATION,
    ClauseType.RENT_CHANGE,
)


def build_question_suggestions(
    *,
    clauses: list[Clause],
    findings: list[Finding],
    language: str,
) -> list[str]:
    """Return at most four grounded question templates for one report."""

    facts = KZ_FACTS if language == "kz" else RU_FACTS
    actions = KZ_ACTIONS if language == "kz" else RU_ACTIONS
    severity_order = {Severity.HIGH: 0, Severity.ATTENTION: 1, Severity.INFO: 2}
    suggestions: list[str] = []
    for item in sorted(
        findings,
        key=lambda value: (severity_order[value.severity], -value.confidence),
    ):
        template = actions.get(item.category)
        if template and item.clause is not None and template not in suggestions:
            suggestions.append(template)

    available = {item.type for item in clauses}
    for category in FACT_ORDER:
        if category not in available:
            continue
        template = facts.get(category)
        if template and template not in suggestions:
            suggestions.append(template)

    return suggestions[:4]
