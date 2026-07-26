from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_PDF = OUTPUT_DIR / "Qadam_TVEP_Tech_Vision.pdf"
LOGO = ROOT / "apps" / "web" / "public" / "qadam-logo.png"

NAVY = colors.HexColor("#12284A")
TEAL = colors.HexColor("#0B6B61")
GOLD = colors.HexColor("#B48A35")
INK = colors.HexColor("#1C2733")
MUTED = colors.HexColor("#5F686D")
LINE = colors.HexColor("#D7D1C6")
PAPER = colors.HexColor("#F5F0E7")
WHITE = colors.HexColor("#FFFDF9")
SOFT_TEAL = colors.HexColor("#E3EFEB")
SOFT_GOLD = colors.HexColor("#F1E7D1")
SOFT_RED = colors.HexColor("#F4E0DC")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
    pdfmetrics.registerFont(TTFont("Georgia", r"C:\Windows\Fonts\georgia.ttf"))
    pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))


register_fonts()


BASE = getSampleStyleSheet()
STYLES = {
    "kicker": ParagraphStyle(
        "kicker",
        parent=BASE["Normal"],
        fontName="Arial-Bold",
        fontSize=7.3,
        leading=9,
        textColor=TEAL,
        spaceAfter=2.5 * mm,
        uppercase=True,
        tracking=0.8,
    ),
    "title": ParagraphStyle(
        "title",
        parent=BASE["Title"],
        fontName="Georgia-Bold",
        fontSize=24,
        leading=26,
        textColor=NAVY,
        spaceAfter=2 * mm,
    ),
    "subtitle": ParagraphStyle(
        "subtitle",
        parent=BASE["Normal"],
        fontName="Arial-Bold",
        fontSize=8.2,
        leading=10,
        textColor=GOLD,
        spaceAfter=3.2 * mm,
    ),
    "h2": ParagraphStyle(
        "h2",
        parent=BASE["Heading2"],
        fontName="Georgia-Bold",
        fontSize=12,
        leading=14,
        textColor=NAVY,
        spaceBefore=2.2 * mm,
        spaceAfter=1.6 * mm,
    ),
    "h3": ParagraphStyle(
        "h3",
        parent=BASE["Heading3"],
        fontName="Arial-Bold",
        fontSize=8.8,
        leading=10.8,
        textColor=TEAL,
        spaceBefore=1.3 * mm,
        spaceAfter=0.8 * mm,
    ),
    "body": ParagraphStyle(
        "body",
        parent=BASE["BodyText"],
        fontName="Arial",
        fontSize=7.55,
        leading=9.55,
        textColor=INK,
        spaceAfter=1.4 * mm,
    ),
    "small": ParagraphStyle(
        "small",
        parent=BASE["BodyText"],
        fontName="Arial",
        fontSize=6.45,
        leading=8,
        textColor=MUTED,
        spaceAfter=0.8 * mm,
    ),
    "bullet": ParagraphStyle(
        "bullet",
        parent=BASE["BodyText"],
        fontName="Arial",
        fontSize=7.25,
        leading=9.15,
        leftIndent=3.7 * mm,
        firstLineIndent=-2.7 * mm,
        bulletIndent=0,
        textColor=INK,
        spaceAfter=0.7 * mm,
    ),
    "callout": ParagraphStyle(
        "callout",
        parent=BASE["BodyText"],
        fontName="Georgia-Bold",
        fontSize=10.4,
        leading=13,
        textColor=NAVY,
        spaceAfter=0,
    ),
    "label": ParagraphStyle(
        "label",
        parent=BASE["BodyText"],
        fontName="Arial-Bold",
        fontSize=6.5,
        leading=8,
        textColor=TEAL,
        uppercase=True,
        tracking=0.5,
    ),
    "formula": ParagraphStyle(
        "formula",
        parent=BASE["BodyText"],
        fontName="Arial-Bold",
        fontSize=7,
        leading=9,
        textColor=NAVY,
        alignment=TA_LEFT,
    ),
    "right": ParagraphStyle(
        "right",
        parent=BASE["BodyText"],
        fontName="Arial",
        fontSize=6.4,
        leading=8,
        textColor=MUTED,
        alignment=TA_RIGHT,
    ),
}


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text, STYLES[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(f"<b>•</b> {text}", STYLES["bullet"])


def section_title(number: str, title: str) -> Table:
    table = Table(
        [
            [
                Paragraph(number, STYLES["label"]),
                Paragraph(title, STYLES["h2"]),
            ]
        ],
        colWidths=[11 * mm, 170 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LINEABOVE", (0, 0), (-1, 0), 0.45, LINE),
            ]
        )
    )
    return table


def page_header(story: list[Flowable], page_number: int, label: str) -> None:
    logo = Image(str(LOGO), width=19 * mm, height=19 * mm)
    identity = Table(
        [
            [p("QADAM", "title"), p(f"TVEP / 0{page_number}", "right")],
            [p(label.upper(), "kicker"), p("TECH VISION 2026", "right")],
        ],
        colWidths=[120 * mm, 38 * mm],
    )
    identity.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    header = Table([[logo, identity]], colWidths=[23 * mm, 158 * mm])
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
                ("LINEBELOW", (0, 0), (-1, -1), 0.7, NAVY),
            ]
        )
    )
    story.extend([header, Spacer(1, 3 * mm)])


def card(content: list[Flowable], background=WHITE, border=LINE, padding=3.2 * mm) -> Table:
    inner = Table([[content]], colWidths=[174 * mm])
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.55, border),
                ("LEFTPADDING", (0, 0), (-1, -1), padding),
                ("RIGHTPADDING", (0, 0), (-1, -1), padding),
                ("TOPPADDING", (0, 0), (-1, -1), padding),
                ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
            ]
        )
    )
    return inner


class ArchitectureDiagram(Flowable):
    def __init__(self, width: float = 181 * mm, height: float = 31 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        stages = [
            ("WEB", "Next.js 16"),
            ("API", "FastAPI"),
            ("PIPELINE", "Mask + Rules"),
            ("RAG", "Retrieve + Gate"),
            ("DATA", "PostgreSQL"),
        ]
        gap = 4 * mm
        box_w = (self.width - gap * 4) / 5
        box_h = 18 * mm
        y = 8 * mm
        for index, (label, detail) in enumerate(stages):
            x = index * (box_w + gap)
            fill = SOFT_TEAL if index in {2, 3} else WHITE
            c.setFillColor(fill)
            c.setStrokeColor(TEAL if index in {2, 3} else LINE)
            c.roundRect(x, y, box_w, box_h, 3, fill=1, stroke=1)
            c.setFillColor(TEAL)
            c.setFont("Arial-Bold", 6.4)
            c.drawString(x + 2.5 * mm, y + 11.5 * mm, label)
            c.setFillColor(INK)
            c.setFont("Arial", 6.5)
            c.drawString(x + 2.5 * mm, y + 5.5 * mm, detail)
            if index < len(stages) - 1:
                c.setStrokeColor(GOLD)
                c.setLineWidth(1)
                start_x = x + box_w + 0.6 * mm
                end_x = x + box_w + gap - 0.6 * mm
                mid_y = y + box_h / 2
                c.line(start_x, mid_y, end_x, mid_y)
                c.line(end_x - 1.5 * mm, mid_y + 1.2 * mm, end_x, mid_y)
                c.line(end_x - 1.5 * mm, mid_y - 1.2 * mm, end_x, mid_y)
        c.setFillColor(MUTED)
        c.setFont("Arial", 5.8)
        c.drawString(0, 2 * mm, "Supabase Auth/RLS - identity and history")
        c.drawRightString(self.width, 2 * mm, "Official legal corpus + optional masked LLM")


class AlgorithmDiagram(Flowable):
    def __init__(self, width: float = 181 * mm, height: float = 24 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        labels = ["VALIDATE", "PARSE", "MASK", "CLASSIFY", "RETRIEVE", "GROUND"]
        gap = 2.2 * mm
        box_w = (self.width - gap * 5) / 6
        box_h = 13 * mm
        y = 6 * mm
        for index, label in enumerate(labels):
            x = index * (box_w + gap)
            fill = SOFT_GOLD if label in {"CLASSIFY", "RETRIEVE"} else SOFT_TEAL
            c.setFillColor(fill)
            c.setStrokeColor(GOLD if label in {"CLASSIFY", "RETRIEVE"} else TEAL)
            c.roundRect(x, y, box_w, box_h, 2.5, fill=1, stroke=1)
            c.setFillColor(NAVY)
            c.setFont("Arial-Bold", 5.9)
            c.drawCentredString(x + box_w / 2, y + 5.3 * mm, label)
            if index < len(labels) - 1:
                c.setStrokeColor(LINE)
                c.line(x + box_w, y + box_h / 2, x + box_w + gap, y + box_h / 2)


def cover_page(story: list[Flowable]) -> None:
    page_header(story, 1, "Продуктовая база")
    story.append(p("SOCIAL & HUMAN CAPITAL / CIVIC RIGHTS & LITERACY", "subtitle"))
    story.append(
        card(
            [
                p(
                    "Инженерный сервис защиты прав молодых арендаторов до подписания договора.",
                    "callout",
                ),
                Spacer(1, 1.5 * mm),
                p(
                    "Qadam принимает PDF/DOCX, выделяет рискованные условия, связывает их "
                    "с фрагментами договора и официальными нормами права Республики Казахстан, "
                    "после чего формирует проверяемый план действий.",
                    "body",
                ),
            ],
            background=SOFT_GOLD,
            border=GOLD,
        )
    )
    story.append(Spacer(1, 2.6 * mm))
    story.append(section_title("01", "Один пользователь - одна острая боль"))
    persona = Table(
        [
            [
                p("ПОЛЬЗОВАТЕЛЬ", "label"),
                p("Иногородний студент 18-22 лет, впервые снимающий квартиру в Алматы.", "body"),
            ],
            [
                p("БОЛЬ", "label"),
                p(
                    "До подписания договора студент не понимает юридические формулировки "
                    "и не способен определить условия, ведущие к потере депозита, "
                    "одностороннему повышению платы или незаконному выселению.",
                    "body",
                ),
            ],
            [
                p("МОМЕНТ РИСКА", "label"),
                p(
                    "Решение требуется за несколько часов, когда договор уже предоставлен "
                    "арендодателем, а доступ к юристу отсутствует или экономически нецелесообразен.",
                    "body",
                ),
            ],
        ],
        colWidths=[35 * mm, 146 * mm],
    )
    persona.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8 * mm),
            ]
        )
    )
    story.append(persona)
    story.append(Spacer(1, 2.4 * mm))
    story.append(section_title("02", "Уникальное ценностное предложение"))
    story.append(
        p(
            "<b>Qadam преобразует договор аренды в доказательный отчёт:</b> каждый вывод "
            "содержит исходный фрагмент, категорию риска, уровень критичности, применимую "
            "норму права и конкретный следующий шаг. Генеративная модель не определяет "
            "факты и нормы самостоятельно - она объясняет только уже найденные и разрешённые данные.",
            "body",
        )
    )
    usp_rows = [
        ("Проверяемость", "source span + официальный URL + версия правового корпуса"),
        ("Безопасность", "PII masking до внешнего AI; сырые байты не сохраняются"),
        ("Контроль вывода", "Pydantic JSON schema, citation allow-list и Grounding Gate"),
        ("Практический результат", "вопрос арендодателю, безопасная редакция, DOCX-протокол"),
        ("Доступность", "RU/KZ/mixed processing; бесплатный анализ для студента"),
    ]
    usp = Table(
        [[p(name, "h3"), p(value, "small")] for name, value in usp_rows],
        colWidths=[43 * mm, 138 * mm],
    )
    usp.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, colors.HexColor("#F9F6F0")]),
                ("LINEBELOW", (0, 0), (-1, -2), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.7 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2 * mm),
            ]
        )
    )
    story.append(usp)
    story.append(Spacer(1, 2.2 * mm))
    story.append(section_title("03", "Граница продукта и модель доступа"))
    story.extend(
        [
            bullet("<b>Free:</b> экспресс-анализ условий, рисков, доказательств и статей."),
            bullet("<b>Premium 490 ₸:</b> структурированный протокол разногласий .DOCX."),
            bullet(
                "<b>Sponsored Access:</b> Premium для студентов оплачивается университетом "
                "или грантовой программой."
            ),
            bullet(
                "<b>Ограничение:</b> информационная помощь, а не юридическое заключение; "
                "неподтверждённый вывод не показывается как правовой факт."
            ),
        ]
    )


def architecture_page(story: list[Flowable]) -> None:
    page_header(story, 2, "Архитектура и технологии")
    story.append(section_title("01", "Системная архитектура"))
    story.append(ArchitectureDiagram())
    story.append(
        p(
            "<b>Поток данных:</b> Browser загружает PDF/DOCX и получает приватный "
            "<font name='Arial-Bold'>analysis_id</font> и токен. FastAPI проверяет файл и "
            "передаёт его в Analysis Orchestrator. Pipeline извлекает текст, маскирует PII, "
            "классифицирует условия, запускает risk rules и hybrid retrieval. Grounding Gate "
            "разрешает только выводы с evidence. PostgreSQL хранит checksum, masked clauses, "
            "findings и lifecycle; Supabase Auth/RLS изолирует пользовательскую историю.",
            "body",
        )
    )
    story.append(section_title("02", "Стек и инженерное обоснование"))
    stack_data = [
        [p("СЛОЙ", "label"), p("ТЕХНОЛОГИИ", "label"), p("ОБОСНОВАНИЕ", "label")],
        [
            p("Frontend", "h3"),
            p("Next.js 16, React 19, TypeScript", "small"),
            p("Типизированный UI, SSR, адаптивность, быстрый MVP.", "small"),
        ],
        [
            p("API", "h3"),
            p("FastAPI 0.139, Python 3.12, Pydantic 2", "small"),
            p("Async I/O, OpenAPI, строгие схемы AI-ответов.", "small"),
        ],
        [
            p("Documents", "h3"),
            p("PyMuPDF, python-docx", "small"),
            p("Позиционное извлечение PDF/DOCX и проверка text layer.", "small"),
        ],
        [
            p("Data", "h3"),
            p("PostgreSQL, SQLAlchemy, pgvector, Supabase", "small"),
            p("Транзакционность, RLS, готовность к vector retrieval.", "small"),
        ],
        [
            p("Runtime", "h3"),
            p("Cloudflare Workers/Sites, Docker Compose", "small"),
            p("Edge delivery и воспроизводимый локальный контур.", "small"),
        ],
        [
            p("Quality", "h3"),
            p("Pytest, Vitest, Playwright, Ruff, MyPy", "small"),
            p("Unit, type, integration, accessibility и E2E gates.", "small"),
        ],
    ]
    stack = Table(stack_data, colWidths=[27 * mm, 66 * mm, 88 * mm], repeatRows=1)
    stack.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F8F5EF")]),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
            ]
        )
    )
    story.append(stack)
    story.append(Spacer(1, 2.1 * mm))
    story.append(section_title("03", "Логика AI-компонентов и защита данных"))
    ai_left = [
        p("ДОКУМЕНТНЫЙ КОНТУР", "label"),
        bullet("<b>Validate:</b> размер ≤10 МБ, MIME, сигнатура, шифрование."),
        bullet("<b>Parse:</b> страницы, абзацы, таблицы, block_id и source location."),
        bullet("<b>Privacy:</b> ИИН, телефон, email и карта заменяются placeholders."),
        bullet("<b>Clauses:</b> 14 RU/KZ-семейств условий аренды."),
        bullet("<b>Rules:</b> trigger, severity, confidence, action и query family."),
    ]
    ai_right = [
        p("RAG И GENERATION", "label"),
        bullet("<b>Retrieve:</b> lexical + vector + clause-family score, затем rerank."),
        bullet("<b>Prompt contract:</b> только masked context и разрешённые source IDs."),
        bullet("<b>Schema:</b> обязательный JSON, валидируемый Pydantic."),
        bullet("<b>Grounding:</b> запрет нерелевантной статьи и вывода без source span."),
        bullet("<b>Fallback:</b> deterministic report при timeout или invalid schema."),
    ]
    ai = Table([[ai_left, ai_right]], colWidths=[90.5 * mm, 90.5 * mm])
    ai.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), SOFT_TEAL),
                ("BACKGROUND", (1, 0), (1, 0), SOFT_GOLD),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        )
    )
    story.append(ai)
    story.append(Spacer(1, 1.8 * mm))
    story.append(
        card(
            [
                p("СИСТЕМНЫЙ PROMPT-КОНТРАКТ", "label"),
                p(
                    "Работай только с переданными фрагментами договора и legal_sources. "
                    "Не создавай статьи, числа или факты. Не изменяй severity. Возвращай "
                    "JSON по схеме. Если доказательств недостаточно, верни unsupported. "
                    "Ответ является информационной помощью, а не юридическим заключением.",
                    "small",
                ),
            ],
            background=SOFT_RED,
            border=colors.HexColor("#D7A79E"),
            padding=2.6 * mm,
        )
    )


def model_page(story: list[Flowable]) -> None:
    page_header(story, 3, "Модель, эффект и устойчивость")
    story.append(section_title("01", "Алгоритмическая модель"))
    story.append(AlgorithmDiagram())
    formula = Table(
        [
            [
                p(
                    "hybrid(q,d) = 0,45 × lexical + 0,35 × vector + 0,20 × family",
                    "formula",
                )
            ],
            [
                p(
                    "rerank = min(1; 0,70 × hybrid + 0,30 × article_match + 0,15 × family)",
                    "formula",
                )
            ],
        ],
        colWidths=[181 * mm],
    )
    formula.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 0.35, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4 * mm),
            ]
        )
    )
    story.append(formula)
    story.append(
        p(
            "Finding публикуется только при прохождении инвариантов: допустимый source ID, "
            "совпадение clause family, наличие source span и официальной нормы для high severity. "
            "Q&A маршрутизируется в document, action или unsupported. Lifecycle анализа: "
            "<b>queued → extracting → analyzing → completed | failed</b>.",
            "body",
        )
    )
    metrics = Table(
        [
            [p("0,9231", "callout"), p("1,00", "callout"), p("1,00", "callout"), p("21,91 ms", "callout")],
            [
                p("clause micro-recall", "small"),
                p("retrieval hit@5", "small"),
                p("grounded clause rate", "small"),
                p("in-process p95", "small"),
            ],
        ],
        colWidths=[45.25 * mm] * 4,
    )
    metrics.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.5, TEAL),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B9D3CC")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, 0), 2 * mm),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 1.5 * mm),
            ]
        )
    )
    story.append(metrics)
    story.append(
        p(
            "Метрики получены на 3 синтетических договорах и 20 размеченных retrieval-запросах; "
            "они являются regression baseline, а не заявлением о точности на всех реальных договорах.",
            "small",
        )
    )
    story.append(section_title("02", "Измеряемый социальный эффект"))
    effect_rows = [
        ("Comprehension delta", "изменение понимания рисков до/после отчёта", "≥ +30 п.п."),
        ("Risk interception", "доля изменённых опасных пунктов до подписания", "≥ 25%"),
        ("Deposit preserved", "подтверждённая сумма сохранённых депозитов", "follow-up 30 дней"),
        ("Evidence coverage", "high-risk findings с clause + official source", "100%"),
        ("Student access", "доля студентов без личной оплаты", "≥ 90%"),
    ]
    effect = Table(
        [[p(a, "h3"), p(b, "small"), p(c, "label")] for a, b, c in effect_rows],
        colWidths=[47 * mm, 95 * mm, 39 * mm],
    )
    effect.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, colors.HexColor("#F8F5EF")]),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("LINEBELOW", (0, 0), (-1, -2), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.25 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.8 * mm),
            ]
        )
    )
    story.append(effect)
    story.append(
        p(
            "Пилот: baseline-тест правовой грамотности → анализ договора → повторный тест → "
            "follow-up через 30 дней. Снижение судебных споров не заявляется до получения "
            "продольных данных.",
            "small",
        )
    )
    story.append(section_title("03", "Устойчивость, затраты и масштабирование"))
    left = [
        p("МОДЕЛЬ УСТОЙЧИВОСТИ", "label"),
        bullet("<b>B2B:</b> лицензия университетам и общежитиям."),
        bullet("<b>Grant:</b> программы правовой грамотности молодёжи."),
        bullet("<b>Premium:</b> DOCX за 490 ₸; студенту покрывает партнёр."),
        bullet("<b>API:</b> white-label для proptech-платформ."),
    ]
    right = [
        p("OPEX / МЕСЯЦ ПИЛОТА", "label"),
        bullet("<b>Cloudflare:</b> от 2 600 ₸."),
        bullet("<b>Supabase:</b> от 13 000 ₸."),
        bullet("<b>Backend + monitoring:</b> 15 000-33 000 ₸."),
        bullet("<b>LLM при 10k анализов:</b> 36 000-62 000 ₸."),
        p("<b>Итого:</b> 67 000-111 000 ₸ без ФОТ.", "body"),
    ]
    economics = Table([[left, right]], colWidths=[90.5 * mm, 90.5 * mm])
    economics.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), SOFT_GOLD),
                ("BACKGROUND", (1, 0), (1, 0), SOFT_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6 * mm),
            ]
        )
    )
    story.append(economics)
    story.append(Spacer(1, 1.5 * mm))
    growth = Table(
        [
            [
                p("ГЕОГРАФИЯ", "label"),
                p("Алматы → Астана → Шымкент; отдельная RU/KZ-валидация корпуса.", "small"),
            ],
            [
                p("ТЕХНИКА", "label"),
                p("Очередь, parser/retrieval workers, autoscaling к августу-сентябрю.", "small"),
            ],
            [
                p("ПРОДУКТ", "label"),
                p("eGov-проверка собственника только через официальный разрешённый API.", "small"),
            ],
        ],
        colWidths=[34 * mm, 147 * mm],
    )
    growth.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.1 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.8 * mm),
            ]
        )
    )
    story.append(growth)
    story.append(
        p(
            "Стоимостные допущения: 520 ₸/$; Cloudflare Workers от $5, Supabase Pro от $25, "
            "LLM-контекст ограничен masked clauses и retrieved sources. Фактический бюджет "
            "уточняется нагрузочным тестом.",
            "small",
        )
    )


def draw_page(canvas, document) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(14 * mm, 13 * mm, width - 14 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Arial", 6.2)
    canvas.drawString(14 * mm, 8.5 * mm, "QADAM / TECH VISION ENGINEERING PORTFOLIO")
    canvas.drawRightString(width - 14 * mm, 8.5 * mm, f"{document.page} / 3")
    canvas.restoreState()


def build_pdf() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=16 * mm,
        title="Qadam - Tech Vision Engineering Portfolio",
        author="Qadam Team",
        subject="Social & Human Capital: Civic Rights & Literacy",
    )
    story: list[Flowable] = []
    cover_page(story)
    story.append(PageBreak())
    architecture_page(story)
    story.append(PageBreak())
    model_page(story)
    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)

    reader = PdfReader(str(OUTPUT_PDF))
    if len(reader.pages) != 3:
        raise RuntimeError(f"TVEP must contain exactly 3 pages, got {len(reader.pages)}")
    print(OUTPUT_PDF)


if __name__ == "__main__":
    build_pdf()
