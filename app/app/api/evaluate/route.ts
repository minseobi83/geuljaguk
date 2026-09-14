import { NextRequest, NextResponse } from "next/server";
import { evaluateEssay, GuardrailViolationError } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { EssaySubmission, WritingType, GradeBand } from "@/lib/types";

const MIN_LENGTH = 20; // 경량 필터: 너무 짧은 글은 본분석 호출 전에 걸러낸다 (비용 절감)
const MAX_LENGTH = 4000;

function isValidSubmission(
  body: unknown
): body is EssaySubmission & { childId: string; essayId?: string } {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.studentText === "string" &&
    typeof b.writingType === "string" &&
    typeof b.gradeBand === "string" &&
    typeof b.versionNo === "number" &&
    typeof b.childId === "string"
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!isValidSubmission(body)) {
    return NextResponse.json({ error: "필수 항목이 빠졌습니다." }, { status: 400 });
  }

  const submission: EssaySubmission = {
    studentText: body.studentText.trim(),
    writingType: body.writingType as WritingType,
    gradeBand: body.gradeBand as GradeBand,
    versionNo: body.versionNo,
    topicTitle: typeof body.topicTitle === "string" ? body.topicTitle : undefined,
    previousVersions: body.previousVersions,
  };

  // 1차 경량 필터: 분량 체크 (지침 06 "호출 파이프라인"의 경량필터 단계)
  if (submission.studentText.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: "글이 너무 짧아요. 조금 더 써볼까요?" },
      { status: 422 }
    );
  }
  if (submission.studentText.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: "이번 글감에 비해 글이 너무 길어요. 나눠서 검토가 필요해요." },
      { status: 422 }
    );
  }

  try {
    const result = await evaluateEssay(submission);

    // 저장은 최선을 다해 시도하되(best-effort), 실패해도 학생에게는 피드백을 보여준다.
    // RLS가 자녀 소유권을 검증하므로, childId가 이 보호자의 자녀가 아니면 essays insert가
    // 그냥 실패한다 (그래도 evaluate 자체는 이미 끝났으니 결과는 돌려준다).
    let essayId: string | null = body.essayId ?? null;
    try {
      if (!essayId) {
        const { data: essay, error } = await supabase
          .from("essays")
          .insert({
            child_id: body.childId,
            writing_type: submission.writingType,
            topic_title: submission.topicTitle ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        essayId = essay.id;
      }

      const { data: version, error: versionError } = await supabase
        .from("essay_versions")
        .insert({
          essay_id: essayId,
          version_no: submission.versionNo,
          student_text: submission.studentText,
        })
        .select("id")
        .single();
      if (versionError) throw versionError;

      const { error: evalError } = await supabase.from("evaluations").insert({
        essay_version_id: version.id,
        result,
        confidence: result.scores.confidence,
        rewrote_student_text: result.guardrail_check.rewrote_student_text,
      });
      if (evalError) throw evalError;
    } catch (persistErr) {
      console.error("[supabase persist] 저장 실패, 학생에게는 결과만 반환:", persistErr);
      essayId = essayId ?? null;
    }

    return NextResponse.json({ result, essayId });
  } catch (err) {
    if (err instanceof GuardrailViolationError) {
      return NextResponse.json(
        {
          error:
            "지금은 안전한 피드백을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
        { status: 502 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "피드백을 만드는 중 문제가 생겼어요. 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
