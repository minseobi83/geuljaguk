import { MechanicsRow } from "./types";

// AI가 매긴 paragraph_no 순서와 맞추기 위해 줄바꿈 기준으로 문단을 나눈다.
// (AI도 학생이 입력한 줄바꿈을 보고 문단을 센 것이라 가정한 휴리스틱)
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
  reason?: string;
  revised?: string;
}

export interface ParagraphHighlight {
  segments: HighlightSegment[];
  matchedRows: MechanicsRow[];
}

// mechanics_table의 원문 표현이 이 문단 안에 실제로 있으면 그 부분만 표시 대상으로 삼는다.
// (표현이 살짝 다르면 못 찾을 수 있는데, 그런 경우는 그냥 강조 없이 넘어간다 - 아래 전체 표는 그대로 남는다)
export function highlightParagraph(
  paragraph: string,
  mechanicsTable: MechanicsRow[]
): ParagraphHighlight {
  const matches: { start: number; end: number; row: MechanicsRow }[] = [];

  for (const row of mechanicsTable) {
    const needle = row.original.trim();
    if (!needle) continue;
    const idx = paragraph.indexOf(needle);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + needle.length, row });
    }
  }

  matches.sort((a, b) => a.start - b.start);
  const merged: typeof matches = [];
  for (const m of matches) {
    const last = merged[merged.length - 1];
    if (last && m.start < last.end) continue; // 겹치면 먼저 찾은 것만 사용
    merged.push(m);
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const m of merged) {
    if (m.start > cursor) {
      segments.push({ text: paragraph.slice(cursor, m.start), highlighted: false });
    }
    segments.push({
      text: paragraph.slice(m.start, m.end),
      highlighted: true,
      reason: m.row.reason,
      revised: m.row.revised,
    });
    cursor = m.end;
  }
  if (cursor < paragraph.length) {
    segments.push({ text: paragraph.slice(cursor), highlighted: false });
  }

  return { segments, matchedRows: merged.map((m) => m.row) };
}
