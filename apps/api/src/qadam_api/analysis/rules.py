"""Explainable deterministic pre-checks for high-value rental risks."""

from __future__ import annotations

import re
from dataclasses import dataclass

from qadam_api.domain import Clause, ClauseType, Severity


@dataclass(frozen=True, slots=True)
class RuleMatch:
    """Evidence emitted by a deterministic rule before prose generation."""

    rule_id: str
    severity: Severity
    category: ClauseType
    title: str
    reason: str
    action: str
    landlord_question: str
    legal_query: str
    clause: Clause | None
    confidence: float


def _match(
    *,
    rule_id: str,
    severity: Severity,
    category: ClauseType,
    title: str,
    reason: str,
    action: str,
    landlord_question: str,
    legal_query: str,
    clause: Clause | None,
    confidence: float = 0.9,
) -> RuleMatch:
    return RuleMatch(
        rule_id=rule_id,
        severity=severity,
        category=category,
        title=title,
        reason=reason,
        action=action,
        landlord_question=landlord_question,
        legal_query=legal_query,
        clause=clause,
        confidence=confidence,
    )


def _tenant_pays_major_repairs(text: str) -> bool:
    """Keep minor tenant repairs separate from landlord-funded capital repairs."""
    scope = re.compile(
        r"капитальн|любой\s+ремонт|күрделі\s+жөндеу|кез\s+келген\s+жөндеу",
        re.IGNORECASE,
    )
    assignment = re.compile(
        r"\b(?:арендатор|наниматель|жалға\s+алушы)\b.{0,45}"
        r"(?:оплачивает|выполняет|төлейді|орындайды)|"
        r"(?:оплачивает|выполняет|төлейді|орындайды).{0,45}"
        r"\b(?:арендатор|наниматель|жалға\s+алушы)\b|"
        r"(?:за\s+сч[её]т\s+(?:арендатора|нанимателя)|жалға\s+алушының\s+есебінен)",
        re.IGNORECASE,
    )
    sentences = re.split(r"(?<=[.!?;])\s+|\n+", text)
    return any(scope.search(sentence) and assignment.search(sentence) for sentence in sentences)


def evaluate_rules(clauses: list[Clause]) -> list[RuleMatch]:
    """Evaluate source clauses without making unsupported legal conclusions."""

    by_type: dict[ClauseType, list[Clause]] = {}
    for clause in clauses:
        by_type.setdefault(clause.type, []).append(clause)

    matches: list[RuleMatch] = []
    if ClauseType.PROPERTY not in by_type:
        matches.append(
            _match(
                rule_id="property_identity_missing",
                severity=Severity.HIGH,
                category=ClauseType.PROPERTY,
                title="Объект аренды определён недостаточно",
                reason="Не найден пункт, позволяющий однозначно установить арендуемое жильё.",
                action="Добавьте точный адрес и описание объекта до подписания.",
                landlord_question="Укажем в договоре полный адрес и точное описание объекта?",
                legal_query="данные позволяющие установить объект имущественного найма",
                clause=None,
                confidence=0.82,
            )
        )

    if ClauseType.TERM not in by_type:
        matches.append(
            _match(
                rule_id="lease_term_missing",
                severity=Severity.ATTENTION,
                category=ClauseType.TERM,
                title="Не найден срок договора",
                reason="В извлечённых пунктах не указан срок найма или режим бессрочного договора.",
                action="Укажите дату начала, дату окончания и порядок продления.",
                landlord_question="На какой срок заключается договор и как он продлевается?",
                legal_query="срок договора имущественного найма неопределенный срок",
                clause=None,
                confidence=0.8,
            )
        )

    if ClauseType.UTILITIES not in by_type:
        matches.append(
            _match(
                rule_id="utilities_allocation_missing",
                severity=Severity.ATTENTION,
                category=ClauseType.UTILITIES,
                title="Не распределена оплата коммунальных услуг",
                reason=(
                    "В извлечённых пунктах не указано, кто и как оплачивает коммунальные услуги."
                ),
                action="Зафиксируйте перечень платежей и способ расчёта.",
                landlord_question=(
                    "Какие коммунальные платежи оплачиваю я и как они рассчитываются?"
                ),
                legal_query="порядок сроки форма оплаты по договору имущественного найма",
                clause=None,
                confidence=0.78,
            )
        )

    for deposit in by_type.get(ClauseType.DEPOSIT, []):
        safe_deadline = re.search(
            r"(?:в\s+течение|не\s+позднее|до)\s+(?:\d+|[а-яёәіңғүұқөһ]+)\s+(?:рабоч|календар|дн)",
            deposit.text,
            re.IGNORECASE,
        )
        explicitly_missing = re.search(
            r"(?:срок|мерзім).{0,20}(?:не\s+установ|не\s+указ)", deposit.text, re.IGNORECASE
        )
        if not safe_deadline or explicitly_missing:
            matches.append(
                _match(
                    rule_id="deposit_return_unclear",
                    severity=Severity.ATTENTION,
                    category=ClauseType.DEPOSIT,
                    title="Неясен срок возврата депозита",
                    reason="Пункт не даёт проверяемого срока возврата обеспечительного платежа.",
                    action="Добавьте срок, основания удержания и подтверждающие документы.",
                    landlord_question=(
                        "В какой срок и при каких подтверждённых удержаниях вернётся депозит?"
                    ),
                    legal_query="порядок сроки форма платежа по договору найма депозит",
                    clause=deposit,
                    confidence=0.88,
                )
            )

    for rent_change in by_type.get(ClauseType.RENT_CHANGE, []):
        if re.search(r"односторонн|в\s+любое\s+время|біржақты", rent_change.text, re.IGNORECASE):
            matches.append(
                _match(
                    rule_id="unilateral_rent_change",
                    severity=Severity.HIGH,
                    category=ClauseType.RENT_CHANGE,
                    title="Одностороннее изменение арендной платы",
                    reason="Пункт позволяет владельцу менять цену без согласованной процедуры.",
                    action="Зафиксируйте периодичность, предел и письменное уведомление.",
                    landlord_question=(
                        "Можно ли менять плату только по письменному соглашению сторон?"
                    ),
                    legal_query="плата порядок сроки форма установленные договором найма",
                    clause=rent_change,
                )
            )

    for access in by_type.get(ClauseType.LANDLORD_ACCESS, []):
        if re.search(r"без\s+(?:предварительного\s+)?уведомлен", access.text, re.IGNORECASE):
            matches.append(
                _match(
                    rule_id="landlord_entry_without_notice",
                    severity=Severity.HIGH,
                    category=ClauseType.LANDLORD_ACCESS,
                    title="Доступ владельца без уведомления",
                    reason="Пункт допускает вход владельца без согласованного предупреждения.",
                    action="Добавьте срок уведомления и исключение только для аварии.",
                    landlord_question="Установим уведомление за 24 часа, кроме аварийной ситуации?",
                    legal_query="условия договора пользование нанятым жилищем доступ наймодателя",
                    clause=access,
                    confidence=0.86,
                )
            )

    for repairs in by_type.get(ClauseType.REPAIRS, []):
        if _tenant_pays_major_repairs(repairs.text):
            matches.append(
                _match(
                    rule_id="tenant_pays_capital_repairs",
                    severity=Severity.HIGH,
                    category=ClauseType.REPAIRS,
                    title="Капитальный ремонт переложен на арендатора",
                    reason="Пункт возлагает капитальный ремонт на студента без ограничения причин.",
                    action="Разделите текущий и капитальный ремонт и ответственность за ущерб.",
                    landlord_question="Оставим капитальный ремонт обязанностью владельца?",
                    legal_query="статья 552 капитальный ремонт обязанность наймодателя",
                    clause=repairs,
                )
            )

    for termination in by_type.get(ClauseType.TERMINATION, []):
        if re.search(
            r"немедленно|без\s+(?:предварительного\s+)?уведомлен|в\s+любое\s+время",
            termination.text,
            re.IGNORECASE,
        ):
            matches.append(
                _match(
                    rule_id="immediate_termination",
                    severity=Severity.HIGH,
                    category=ClauseType.TERMINATION,
                    title="Немедленное одностороннее расторжение",
                    reason="Пункт не оставляет арендатору предсказуемого срока на выезд.",
                    action="Согласуйте взаимный письменный срок уведомления.",
                    landlord_question=(
                        "Можно установить одинаковое уведомление за 30 дней для обеих сторон?"
                    ),
                    legal_query="срок договора отказ уведомление недвижимое имущество",
                    clause=termination,
                )
            )

    return matches
