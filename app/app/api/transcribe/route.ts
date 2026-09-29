import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OcrError, OcrImageType, transcribeHandwriting } from "@/lib/anthropic";
import { logApiCalls } from "@/lib/apiUsageLog";
import { logError } from "@/lib/errorLog";
import { ApiCallRecord } from "@/lib/apiUsage";

// 공책 사진 한 장을 받아 손글씨를 글자로 옮겨 돌려준다 (업로드 1단계).
// 사진은 메모리에서만 읽고 어디에도 저장하지 않는다. 옮긴 글은 입력칸에 채워질 뿐이고,
// 제출은 아이가 확인·수정한 뒤 기존 첨삭 흐름(/api/evaluate)으로 한다.

export const maxDuration = 60;

// 브라우저에서 긴 변 2576px JPEG로 줄여 보내므로 보통 1~2MB다. Vercel 요청 크기 제한(4.5MB)보다
// 작게 막아서, 줄이기에 실패한 원본이 와도 의미 있는 오류를 돌려준다.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED: OcrImageType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("image");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "사진을 받지 못했어요. 다시 올려볼까요?" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "사진을 골라주세요." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type as OcrImageType)) {
    return NextResponse.json(
      { error: "JPG·PNG 사진만 올릴 수 있어요." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "사진이 너무 커요. 조금 더 가까이에서 다시 찍어볼까요?" },
      { status: 413 }
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const ctx = { userId: userData.user.id };

  try {
    const { text, unreadable, call } = await transcribeHandwriting(base64, file.type as OcrImageType);
    await logApiCalls(supabase, [call], ctx);
    return NextResponse.json({ text, unreadable });
  } catch (err) {
    const call = (err as { call?: ApiCallRecord }).call;
    if (call) await logApiCalls(supabase, [call], ctx);
    if (err instanceof OcrError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    await logError(supabase, "evaluate", err, {
      ...ctx,
      meta: { note: "사진 글 읽기 실패", bytes: file.size, type: file.type },
    });
    return NextResponse.json(
      { error: "사진을 읽는 중에 문제가 생겼어요. 잠시 후 다시 해볼까요?" },
      { status: 500 }
    );
  }
}
