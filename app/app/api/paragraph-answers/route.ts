import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveParagraphAnswers } from "@/lib/supabase/queries";
import { ParagraphAnswer } from "@/lib/types";

// 창을 닫거나 다른 앱으로 넘어갈 때 아직 저장하지 못한 문단별 답변을 받는 곳.
// 브라우저가 navigator.sendBeacon으로 보내므로(페이지가 닫혀도 전송이 보장됨) 응답은 쓰이지 않는다.
// 로그인 쿠키가 함께 오고, 다른 보호자의 시도라면 RLS 때문에 저장되지 않는다.

const MAX_ANSWERS = 30;
const MAX_ANSWER_LENGTH = 2000;

function parseAnswers(raw: unknown): ParagraphAnswer[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_ANSWERS) return null;
  const answers: ParagraphAnswer[] = [];
  for (const a of raw) {
    if (typeof a !== "object" || a === null) return null;
    const { paragraph_no, answer } = a as Record<string, unknown>;
    if (typeof paragraph_no !== "number" || !Number.isInteger(paragraph_no)) return null;
    if (typeof answer !== "string") return null;
    const trimmed = answer.trim().slice(0, MAX_ANSWER_LENGTH);
    if (trimmed) answers.push({ paragraph_no, answer: trimmed });
  }
  return answers;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: unknown;
  try {
    // sendBeacon은 Content-Type을 마음대로 정하기 어려워 본문을 텍스트로 받아 직접 해석한다.
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { versionId, answers: rawAnswers } = (body ?? {}) as Record<string, unknown>;
  const answers = parseAnswers(rawAnswers);
  if (typeof versionId !== "string" || !versionId || !answers) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await saveParagraphAnswers(supabase, versionId, answers);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
