#!/usr/bin/env python3
"""Generate transparent demo PDF/DOCX files from committed UTF-8 text sources."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

import fitz
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "demo/contracts"
FONT_CANDIDATES = (
    Path("/usr/share/fonts/noto/NotoSans-Regular.ttf"),
    Path("/usr/share/fonts/TTF/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
)


def find_font() -> Path:
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            return candidate
    raise RuntimeError("Install Noto Sans or DejaVu Sans to generate Cyrillic demo PDFs")


def write_pdf(text: str, destination: Path, font_path: Path) -> None:
    document = fitz.open()
    page = document.new_page(width=595, height=842)
    writer = fitz.TextWriter(page.rect)
    writer.fill_textbox(
        fitz.Rect(54, 54, 541, 788),
        text,
        font=fitz.Font(fontfile=str(font_path)),
        fontsize=10.5,
        lineheight=1.45,
    )
    writer.write_text(page)
    document.set_metadata(
        {
            "title": destination.stem,
            "author": "QADAM AI synthetic demo generator",
            "subject": "Synthetic rental contract; not a real person's document",
            "creationDate": "D:20260101000000+00'00'",
            "modDate": "D:20260101000000+00'00'",
        }
    )
    document.save(destination, garbage=4, deflate=True, no_new_id=True)
    document.close()


def write_docx(text: str, destination: Path) -> None:
    document = Document()
    for paragraph in text.split("\n\n"):
        if paragraph.strip():
            document.add_paragraph(paragraph.strip())
    document.core_properties.title = destination.stem
    document.core_properties.author = "QADAM AI synthetic demo generator"
    fixed_time = datetime(2026, 1, 1, tzinfo=UTC)
    document.core_properties.created = fixed_time
    document.core_properties.modified = fixed_time
    document.core_properties.last_modified_by = "QADAM AI"
    document.core_properties.revision = 1

    buffer = BytesIO()
    document.save(buffer)
    buffer.seek(0)
    with ZipFile(buffer) as source, ZipFile(
        destination, "w", compression=ZIP_DEFLATED, compresslevel=9
    ) as target:
        for name in sorted(source.namelist()):
            source_info = source.getinfo(name)
            target_info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            target_info.compress_type = ZIP_DEFLATED
            target_info.external_attr = source_info.external_attr
            target_info.create_system = 0
            target.writestr(target_info, source.read(name), compresslevel=9)


def main() -> None:
    font_path = find_font()
    generated: list[str] = []
    for source in sorted(CONTRACTS.glob("qadam-*-contract.txt")):
        text = source.read_text(encoding="utf-8").strip()
        pdf_path = source.with_suffix(".pdf")
        docx_path = source.with_suffix(".docx")
        write_pdf(text, pdf_path, font_path)
        write_docx(text, docx_path)
        generated.extend(
            [str(pdf_path.relative_to(ROOT)), str(docx_path.relative_to(ROOT))]
        )
    print(json.dumps({"generated": generated, "font": str(font_path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
