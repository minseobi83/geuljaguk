import Anthropic from "@anthropic-ai/sdk";
import type { TextBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { EvaluationResult, EssaySubmission } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { detectRewrittenStudentText } from "./guardrail";

// API 키는 이 파일(서버 전용 lib) 안에서만 읽는다. 클라이언트 컴포넌트에서 직접 import하지 말 것.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// 시스템 프롬프트는 모든 학생·모든 요청에서 완전히 동일하다 (에세이 본문은 user 메시지에만 들어감).
// 그래서 여기에만 프롬프트 캐싱을 걸면, 같은 프롬프트가 반복 호출될 때마다 캐시 히트로
// 입력 토큰 비용을 크게 줄일 수 있다 (캐시 히트 시 일반 입력 토큰의 약 1/10 가격).
// 캐시는 기본 5분간 유지되며, 그 안에 다시 호출되면 자동으로 갱신된다.
const CACHED_SYSTEM_PROMPT: TextBlockParam[] = [
  {
    type: "text",
    text: SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" },
  },
];

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function callModel(
  submission: EssaySubmission,
  retryNote?: string
): Promise<EvaluationResult> {
  const userPrompt =
    buildUserPrompt(submission) +
    (retryNote
      ? `\n\n# 재작성 요청\n${retryNote}\n위 문제를 반드시 고쳐서 다시 JSON으로만 응답해줘.`
      : "");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: CACHED_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI가 텍스트 응답을 반환하지 않았습니다.");
  }

  // 캐시가 실제로 히트되는지 배포 로그에서 확인하기 위한 최소한의 관측 로그.
  console.log(
    `[claude usage] input=${response.usage.input_tokens} ` +
      `cache_write=${response.usage.cache_creation_input_tokens ?? 0} ` +
      `cache_read=${response.usage.cache_read_input_tokens ?? 0} ` +
      `output=${response.usage.output_tokens}`
  );

  return extractJson(textBlock.text) as EvaluationResult;
}

// 본분석 호출 + 가드레일 검사 + 필요 시 1회 재시도까지 담당하는 최상위 함수.
export async function evaluateEssay(
  submission: EssaySubmission
): Promise<EvaluationResult> {
  let result = await callModel(submission);
  let rewrote = detectRewrittenStudentText(submission.studentText, result);

  if (rewrote) {
    result = await callModel(
      submission,
      "이전 답변에서 mechanics_table 밖의 문장이 학생이 쓴 문장과 거의 동일했습니다. " +
        "학생 문장을 그대로 옮기지 말고, 질문이나 방향 제시로만 다시 작성하세요."
    );
    rewrote = detectRewrittenStudentText(submission.studentText, result);
  }

  // 재시도 후에도 걸리면, 화면에서라도 정확한 상태를 보여줄 수 있도록 서버 판단으로 덮어쓴다.
  result.guardrail_check = { rewrote_student_text: rewrote };

  if (rewrote) {
    throw new GuardrailViolationError(result);
  }

  return result;
}

export class GuardrailViolationError extends Error {
  constructor(public lastResult: EvaluationResult) {
    super("가드레일 위반: AI가 학생 문장을 그대로 재사용했습니다.");
  }
}
