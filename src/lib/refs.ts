/**
 * Verse references as written in the questions and the paper exams:
 * "3:1", "1:6-7", "1:2, 4", "15:9, 27", "26:3, 12", "17:55-18:5".
 * A number without chapter keeps the chapter written before it.
 */
export interface VerseRange { ch: number; from: number; toCh: number; to: number }

export function parseRef(ref: string): VerseRange[] {
  const out: VerseRange[] = [];
  let ch = 0;
  for (const part of ref.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(?:(\d+):)?(\d+)(?:-(?:(\d+):)?(\d+))?$/);
    if (!m) throw new Error(`Referință greșită: "${ref}"`);
    if (m[1]) ch = Number(m[1]);
    if (!ch) throw new Error(`Referință fără capitol: "${ref}"`);
    const from = Number(m[2]);
    const toCh = m[3] ? Number(m[3]) : ch;
    const to = m[4] ? Number(m[4]) : from;
    out.push({ ch, from, toCh, to });
    ch = toCh;
  }
  return out;
}

/** Every verse a reference covers, as [label "ch:v", text], in order. */
export function versesOf(ref: string, text: Record<string, string[]>): [string, string][] {
  const out: [string, string][] = [];
  for (const r of parseRef(ref)) {
    for (let c = r.ch; c <= r.toCh; c++) {
      const verses = text[String(c)];
      if (!verses) throw new Error(`Capitolul ${c} nu există (${ref})`);
      const first = c === r.ch ? r.from : 1;
      const last = c === r.toCh ? r.to : verses.length;
      for (let v = first; v <= last; v++) {
        if (!verses[v - 1]) throw new Error(`Versetul ${c}:${v} nu există (${ref})`);
        out.push([`${c}:${v}`, verses[v - 1]]);
      }
    }
  }
  return out;
}

/** First chapter a reference points to, for "Citește capitolul". */
export function firstChapter(ref: string): number {
  return parseRef(ref)[0].ch;
}
