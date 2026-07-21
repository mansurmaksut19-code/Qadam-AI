import type { AnalysisReport, Finding } from "@/lib/report-types";

interface ZipEntry {
  name: string;
  content: string;
}

const encoder = new TextEncoder();
const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: number[], value: number): void {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number): void {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeBytes(target: number[], bytes: Uint8Array): void {
  for (const byte of bytes) target.push(byte);
}

function createZip(entries: ZipEntry[]): Blob {
  const output: number[] = [];
  const central: number[] = [];

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const content = encoder.encode(entry.content);
    const checksum = crc32(content);
    const offset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0x0800);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, content.length);
    writeUint32(output, content.length);
    writeUint16(output, name.length);
    writeUint16(output, 0);
    writeBytes(output, name);
    writeBytes(output, content);

    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0x0800);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, checksum);
    writeUint32(central, content.length);
    writeUint32(central, content.length);
    writeUint16(central, name.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    writeBytes(central, name);
  }

  const centralOffset = output.length;
  writeBytes(output, new Uint8Array(central));
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, entries.length);
  writeUint16(output, entries.length);
  writeUint32(output, central.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text: string, style = "BodyText"): string {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t>${xml(text)}</w:t></w:r></w:p>`;
}

function heading(text: string, level = "Heading1"): string {
  return paragraph(text, level);
}

function protocolDocument(report: AnalysisReport, findings: Finding[]): string {
  const rows = findings
    .map((finding, index) =>
      [
        heading(`${index + 1}. ${finding.title}`, "Heading2"),
        paragraph(`Риск: ${finding.explanation}`),
        paragraph(`Предлагаемая правка: ${finding.action}`),
        paragraph(`Вопрос арендодателю: ${finding.landlordQuestion}`),
        finding.clause ? paragraph(`Фрагмент договора: ${finding.clause.text}`) : "",
        finding.citations[0] ? paragraph(`Основание: ${finding.citations[0].reference}, ${finding.citations[0].sourceTitle}`) : "",
      ].join(""),
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${heading("Протокол разногласий к договору найма жилого помещения")}
    ${paragraph("Подготовлено QADAM AI. Документ является рабочей заготовкой и не заменяет консультацию юриста.")}
    ${paragraph(`ID анализа: ${report.id}`)}
    ${heading("Краткая сводка", "Heading2")}
    ${paragraph(report.summary)}
    ${heading("Предлагаемые изменения", "Heading2")}
    ${rows || paragraph("Существенные риски не найдены. Проверьте реквизиты, суммы и даты вручную.")}
    ${heading("Подписание", "Heading2")}
    ${paragraph("Наниматель: ____________________")}
    ${paragraph("Наймодатель: ____________________")}
    ${paragraph("Дата: ____________________")}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
  </w:body>
</w:document>`;
}

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="220" w:after="140"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
</w:styles>`;

export function createProtocolDocx(report: AnalysisReport, findings: Finding[]): Blob {
  return createZip([
    {
      name: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      name: "word/_rels/document.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    },
    { name: "word/styles.xml", content: styles },
    { name: "word/document.xml", content: protocolDocument(report, findings) },
  ]);
}

export function downloadProtocolDocx(report: AnalysisReport, findings: Finding[]): void {
  const blob = createProtocolDocx(report, findings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `qadam-protocol-${report.id.slice(0, 8)}.docx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
