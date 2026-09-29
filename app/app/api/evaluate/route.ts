import { NextRequest, NextResponse } from "next/server";
import { evaluateEssay, quickScreen, GuardrailViolationError } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getActiveSystemPrompt } from "@/lib/supabase/promptQueries";
import { logError } from "@/lib/errorLog";
import { logApiCalls } from "@/lib/apiUsageLog";
import { ApiCallRecord } from "@/lib/apiUsage";
import { EssaySubmission, WritingType, GradeBand } from "@/lib/types";

// 최악의 경우 이 요청 안에서 모델을 최대 3번(본분석 + truncation 재시도 + 가드레일 재시도)
// 까지 부를 수 있어서, Vercel 기본 함수 제한(플랜에 따라 10~15초)보다 넉넉히 잡아둔다.
export const maxDuration = 60;

const MIN_LENGTH = 20; // 경량 필터: 너무 짧은 글은 본분석 호출 전에 걸러낸다 (비용 절감)
const MAX_LENGTH = 4000;
const MAX_ATTEMPTS_PER_TOPIC = 3; // 같은 글감은 최대 3번까지만 제출 (한 주제에 집중하도록)

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

  // 본분석 전에 필요한 세 가지를 동시에 한다 (예전엔 하나씩 기다려서 첫 반응이 늦었다).
  //  1) 같은 글감에 이미 몇 번 제출했는지 - 글감이 없는 자유 주제는 제한하지 않는다.
  //  2) 사전 선별(quickScreen): 비싼 본분석(Sonnet) 전에 훨씬 싼 모델(Haiku)로 "애초에 과제
  //     시도가 맞는지"만 거른다. fail-open이라 실패해도 본분석은 그대로 진행한다.
  //  3) 관리자가 활성화해둔 평가기준(시스템 프롬프트) 버전. 없으면 코드 기본값.
  // 글감 한도에 걸린 경우에도 사전 선별이 이미 돌지만, 싼 모델 한 번이라 기다리는 시간을 줄이는
  // 쪽을 택했다 (한도는 화면에서 먼저 막으므로 여기까지 오는 경우는 드물다).
  const countTopicAttempts = async (): Promise<number> => {
    if (!submission.topicTitle) return 0;
    // 글감이 같은 글들의 시도 수를 한 번의 조회로 센다.
    const { data, error } = await supabase
      .from("essays")
      .select("id, essay_versions(count)")
      .eq("child_id", body.childId)
      .eq("topic_title", submission.topicTitle);
    if (!error) {
      return ((data ?? []) as { essay_versions: { count: number }[] }[]).reduce(
        (sum, e) => sum + (e.essay_versions?.[0]?.count ?? 0),
        0
      );
    }
    // 집계(count) 조회를 쓸 수 없는 설정이면 예전처럼 두 번에 나눠 센다.
    const { data: matching } = await supabase
      .from("essays")
      .select("id")
      .eq("child_id", body.childId)
      .eq("topic_title", submission.topicTitle);
    const essayIds = (matching ?? []).map((e) => e.id);
    if (essayIds.length === 0) return 0;
    const { count } = await supabase
      .from("essay_versions")
      .select("id", { count: "exact", head: true })
      .in("essay_id", essayIds);
    return count ?? 0;
  };
  const [topicAttemptUsed, screen, activePrompt] = await Promise.all([
    countTopicAttempts(),
    quickScreen(submission.studentText),
    getActiveSystemPrompt(supabase),
  ]);

  if (submission.topicTitle) {
    if (topicAttemptUsed >= MAX_ATTEMPTS_PER_TOPIC) {
      return NextResponse.json(
        {
          error: `이 글감은 이미 ${MAX_ATTEMPTS_PER_TOPIC}번 써봤어요. 다른 글감으로 써볼까요?`,
          topicLimitReached: true,
        },
        { status: 429 }
      );
    }
  }

  if (screen.failure) {
    await logError(supabase, "quick_screen", screen.failure, {
      userId: userData.user.id,
      childId: body.childId,
      meta: { textLength: submission.studentText.length, note: "fail-open으로 본분석 진행" },
    });
  }
  if (!screen.valid) {
    if (screen.call) {
      await logApiCalls(supabase, [screen.call], {
        userId: userData.user.id,
        versionNo: submission.versionNo,
      });
    }
    return NextResponse.json(
      {
        error:
          "이 글은 과제로 보기 어려워요. 주제에 맞게 다시 한 번 써볼까요?" +
          (screen.reason ? ` (${screen.reason})` : ""),
      },
      { status: 422 }
    );
  }

  // 여기서부터는 본분석(Sonnet) 호출이라 시간이 걸린다. NDJSON 스트림으로 응답해서,
  // 채점이 진행되는 동안 진행 상황(progress)을 먼저 보내고 끝나면 done/error를 보낸다.
  // 이 지점 이전의 모든 실패는 위에서처럼 평소대로 상태 코드가 있는 JSON으로 응답하고,
  // 이 지점을 넘어서부터는 항상 200으로 스트림을 열고, 그 안에서 성공/실패를 알려준다
  // (스트림을 시작한 뒤에는 HTTP 상태 코드를 바꿀 수 없기 때문).
  const errorCtx = {
    userId: userData.user.id,
    childId: body.childId,
    promptVersionId: activePrompt.id,
  };
  const errorMeta = {
    versionNo: submission.versionNo,
    writingType: submission.writingType,
    gradeBand: submission.gradeBand,
    textLength: submission.studentText.length,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      // 이 요청 안에서 부른 본분석 호출들(재시도 포함)의 사용량. 성공이든 실패든 finally에서 저장한다.
      const calls: ApiCallRecord[] = [];
      try {
        const { result, rawResponseText } = await evaluateEssay(
          submission,
          (chars) => send({ type: "progress", chars }),
          activePrompt.prompt,
          calls
        );

        // 저장은 최선을 다해 시도하되(best-effort), 실패해도 학생에게는 피드백을 보여준다.
        // RLS가 자녀 소유권을 검증하므로, childId가 이 보호자의 자녀가 아니면 essays insert가
        // 그냥 실패한다 (그래도 evaluate 자체는 이미 끝났으니 결과는 돌려준다).
        let essayId: string | null = body.essayId ?? null;
        // 이번 시도 행의 id. 클라이언트가 문단별 답변을 이 행에 저장할 때 쓴다.
        let versionId: string | null = null;
        let topicAttemptAfter = topicAttemptUsed;
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
          versionId = version.id;

          const evalRow = {
            essay_version_id: version.id,
            result,
            confidence: result.scores.confidence,
            rewrote_student_text: result.guardrail_check.rewrote_student_text,
          };
          let { error: evalError } = await supabase
            .from("evaluations")
            .insert({ ...evalRow, prompt_version_id: activePrompt.id });
          // 코드를 먼저 배포하고 schema.sql(prompt_version_id 컬럼 추가)을 아직 안 돌린 경우엔
          // 컬럼이 없다는 오류가 난다. 그때는 버전 정보 없이라도 채점 결과는 저장한다.
          if (evalError && /prompt_version_id/.test(evalError.message)) {
            ({ error: evalError } = await supabase.from("evaluations").insert(evalRow));
          }
          if (evalError) throw evalError;

          topicAttemptAfter = topicAttemptUsed + 1;
        } catch (persistErr) {
          // 학생은 피드백을 봤지만 기록은 남지 않은 상황이라, 관리자가 꼭 알아야 한다.
          await logError(supabase, "persist", persistErr, {
            ...errorCtx,
            meta: { ...errorMeta, essayId, note: "저장 실패, 학생에게는 결과만 반환" },
          });
          essayId = essayId ?? null;
        }

        send({
          type: "done",
          result,
          rawResponseText,
          essayId,
          versionId,
          topicAttempt: submission.topicTitle
            ? { used: topicAttemptAfter, max: MAX_ATTEMPTS_PER_TOPIC }
            : null,
        });
      } catch (err) {
        if (err instanceof GuardrailViolationError) {
          await logError(supabase, "guardrail", err, { ...errorCtx, meta: errorMeta });
          send({
            type: "error",
            error: "지금은 안전한 피드백을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
          });
        } else {
          await logError(supabase, "evaluate", err, { ...errorCtx, meta: errorMeta });
          send({
            type: "error",
            error: "피드백을 만드는 중 문제가 생겼어요. 다시 시도해 주세요.",
          });
        }
      } finally {
        // 사전 선별 사용량도 여기서 함께 남긴다 - 응답을 시작하기 전에 기록을 기다리지 않도록.
        await logApiCalls(supabase, screen.call ? [screen.call, ...calls] : calls, {
          userId: userData.user.id,
          promptVersionId: activePrompt.id,
          versionNo: submission.versionNo,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
