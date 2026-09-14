import { NextRequest, NextResponse } from "next/server";
import { evaluateEssay, GuardrailViolationError } from "@/lib/anthropic";
import { EssaySubmission, WritingType, GradeBand } from "@/lib/types";

const MIN_LENGTH = 20; // 경량 필터: 너무 짧은 글은 본분석 호출 전에 걸러낸다 (비용 절감)
const MAX_LENGTH = 4000;

function isValidSubmission(body: unknown): body is EssaySubmission {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.studentText === "string" &&
    typeof b.writingType === "string" &&
    typeof b.gradeBand === "string" &&
    typeof b.versionNo === "number"
  );
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ result });
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
