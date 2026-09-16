// PRD 06 "AI 피드백 엔진"의 JSON 스키마를 그대로 옮긴 타입 정의.
// AI가 이 구조로만 응답하도록 강제하고, 화면 컴포넌트는 이 타입만 믿고 그린다.

export type WritingType =
  | "주장하는 글"
  | "설명하는 글"
  | "독후감"
  | "경험을 담은 글"
  | "감상문"
  | "비교·대조 글"
  | "문제 해결 글"
  | "서사적 글쓰기";

export type GradeBand = "4" | "5" | "6";

export type Tier = "능숙" | "보통" | "도움필요";

export type Confidence = "충분" | "판단하기 어려움";

export interface ParagraphFeedback {
  paragraph_no: number;
  role: string;
  good: string;
  question: string;
}

export interface MechanicsRow {
  original: string;
  revised: string;
  reason: string;
}

export interface NextTask {
  skill: string;
  prompt: string;
}

export interface RubricScores {
  사고력: Tier;
  논리력: Tier;
  표현력: Tier;
  구성력: Tier;
  confidence: Confidence;
}

export interface EvaluationResult {
  version_id: string;
  writing_type: WritingType;
  grade_band: GradeBand;
  understanding: {
    topic: string;
    main_idea: string;
    intent_unclear: boolean;
  };
  strengths: string[];
  priority_issue: {
    category: string;
    note: string;
  };
  paragraph_feedback: ParagraphFeedback[];
  mechanics_table: MechanicsRow[];
  self_revision_questions: string[];
  next_task: NextTask;
  scores: RubricScores;
  summary: string;
  guardrail_check: {
    rewrote_student_text: boolean;
  };
  safety: {
    concern: boolean;
    note: string;
  };
}

export interface ParagraphAnswer {
  paragraph_no: number;
  answer: string;
}

export interface PreviousVersionEntry {
  text: string;
  versionNo: number;
  writingType: WritingType;
  gradeBand: GradeBand;
  topicTitle?: string;
  paragraphAnswers?: ParagraphAnswer[];
  // 그 시도에서 AI가 실제로 반환한 원문 텍스트 (재파싱한 JSON이 아니라 그대로).
  // 다음 요청을 실제 멀티턴 대화(user/assistant)로 재구성할 때 assistant 턴으로 다시 보내서
  // 프롬프트 캐시가 이어지게 하는 용도 - 재직렬화하면 캐시가 깨지므로 원문 그대로 저장·전송해야 한다.
  rawResponseText: string;
}

export interface EssaySubmission {
  studentText: string;
  writingType: WritingType;
  gradeBand: GradeBand;
  versionNo: number;
  topicTitle?: string;
  previousVersions?: PreviousVersionEntry[];
}

export interface ChildProfile {
  id: string;
  nickname: string;
  grade_band: GradeBand;
}

export interface RecentEssay {
  id: string;
  writing_type: WritingType;
  topic_title: string | null;
  created_at: string;
  latest_summary: string | null;
}
