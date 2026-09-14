import Anthropic from "@anthropic-ai/sdk";
import { EvaluationResult, EssaySubmission } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { detectRewrittenStudentText } from "./guardrail";

// API 키는 이 파일(서버 전용 lib) 안에서만 읽는다. 클라이언트 컴포넌트에서 직접 import하지 말 것.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

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
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI가 텍스트 응답을 반환하지 않았습니다.");
  }

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
