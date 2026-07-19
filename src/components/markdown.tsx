// Küçük, bağımlılıksız Markdown → React renderer.
//
// Rapor metnini (LLM ya da deterministik üretim) profesyonel biçimde gösterir.
// GÜVENLİK: HTML enjekte edilmez (dangerouslySetInnerHTML YOK); yalnızca
// tanınan yapılar React elemanına çevrilir, gerisi düz metin kalır.
//
// Desteklenen: # başlıklar, **kalın**, *italik*, `kod`, tablolar, - / 1. listeler,
// > alıntı, --- ayraç, paragraflar.

import { Fragment, type ReactNode } from "react";

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return <div className={`md ${className}`}>{renderBlocks(children)}</div>;
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Boş satır
    if (!line.trim()) {
      i++;
      continue;
    }

    // Ayraç
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push(<hr key={key++} className="md-hr" />);
      i++;
      continue;
    }

    // Başlık
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2]);
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"] as const)[level - 1];
      out.push(
        <Tag key={key++} className={`md-h md-h${level}`}>
          {content}
        </Tag>,
      );
      i++;
      continue;
    }

    // Tablo: | a | b |  +  | --- | --- |
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(
        <div key={key++} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {header.map((h, j) => (
                  <th key={j}>{inline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, j) => (
                <tr key={j}>
                  {header.map((_, k) => (
                    <td key={k}>{inline(r[k] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Alıntı
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(
        <blockquote key={key++} className="md-quote">
          {inline(buf.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Listeler
    const bullet = /^\s*[-*+]\s+(.*)$/;
    const ordered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || ordered.test(line)) {
      const isOrdered = ordered.test(line);
      const re = isOrdered ? ordered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(re.exec(lines[i])![1]);
        i++;
      }
      const List = isOrdered ? "ol" : "ul";
      out.push(
        <List key={key++} className={isOrdered ? "md-ol" : "md-ul"}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </List>,
      );
      continue;
    }

    // Paragraf (ardışık düz satırlar)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !isTableRow(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) out.push(<p key={key++} className="md-p">{inline(para.join(" "))}</p>);
  }

  return out;
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}
function isTableSeparator(line: string): boolean {
  return /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(line);
}
function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Satır içi biçimlendirme: **kalın**, *italik*, `kod`. */
function inline(text: string): ReactNode {
  const tokens: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) tokens.push(<strong key={key++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) tokens.push(<code key={key++} className="md-code">{t.slice(1, -1)}</code>);
    else tokens.push(<em key={key++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) tokens.push(text.slice(last));

  return tokens.length === 1 ? tokens[0] : <Fragment>{tokens}</Fragment>;
}
