import { SupabaseClient } from "@supabase/supabase-js";
import {
  EvaluationResult,
  MechanicsRow,
  ParagraphAnswer,
  RubricScores,
  WritingType,
} from "@/lib/types";

// 쓴 글 히스토리에서 보여줄 "문단별 질문 - 아이 답변" 한 쌍.
export interface SavedParagraphAnswer {
  versionNo: number;
  paragraphNo: number;
  question: string | null;
  answer: string;
}

export interface EssayHistoryItem {
  id: string;
  writingType: WritingType;
  topicTitle: string | null;
  createdAt: string;
  scores: RubricScores | null;
  summary: string | null;
  safetyNote: string | null;
  priorityCategory: string | null;
  nextTaskSkill: string | null;
  // 이 글을 몇 번 써봤는지(재작성 횟수 포함). 2 이상이면 피드백을 보고 스스로 고쳐 썼다는 뜻.
  versionCount: number;
  // 아이가 마지막 시도에서 실제로 쓴 글. 성장 기록에서 글자국 총평 대신 "쓴 글" 자체를 보여주기 위한 값.
  latestText: string | null;
  // 글쓰기 화면(ParagraphFeedbackCard)과 똑같이, 쓴 글 히스토리에서도 고쳐볼 표현을
  // 강조 표시하기 위한 값.
  mechanicsTable: MechanicsRow[];
  // 모든 시도에 걸쳐 아이가 문단별 질문에 적은 답변 (시도 순서 → 문단 순서).
  paragraphAnswers: SavedParagraphAnswer[];
}

type VersionRow = {
  version_no: number;
  student_text: string;
  paragraph_answers?: ParagraphAnswer[] | null;
  evaluations: { result: EvaluationResult }[];
};

type EssayRow = {
  id: string;
  writing_type: WritingType;
  topic_title: string | null;
  created_at: string;
  essay_versions: VersionRow[] | null;
};

function collectParagraphAnswers(versions: VersionRow[]): SavedParagraphAnswer[] {
  return [...versions]
    .sort((a, b) => a.version_no - b.version_no)
    .flatMap((v) => {
      const feedback = v.evaluations?.[0]?.result?.paragraph_feedback ?? [];
      return (v.paragraph_answers ?? [])
        .filter((a) => a.answer?.trim())
        .sort((a, b) => a.paragraph_no - b.paragraph_no)
        .map((a) => ({
          versionNo: v.version_no,
          paragraphNo: a.paragraph_no,
          question: feedback.find((f) => f.paragraph_no === a.paragraph_no)?.question ?? null,
          answer: a.answer.trim(),
        }));
    });
}

// 첨삭을 보고 아이가 적은 문단별 답변을 그 시도 행에 저장한다 (브라우저에서 호출, RLS가 소유권 검증).
export async function saveParagraphAnswers(
  supabase: SupabaseClient,
  versionId: string,
  answers: ParagraphAnswer[]
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("essay_versions")
    .update({ paragraph_answers: answers })
    .eq("id", versionId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// 에세이별로 "가장 마지막 시도(재작성 포함 최신 버전)"의 평가만 골라서 돌려준다.
// 같은 에세이를 여러 번 고쳐 썼어도, 성장 추이에는 최종 결과만 반영하는 게 맞기 때문.
export async function getChildEssayHistory(
  supabase: SupabaseClient,
  childId: string,
  limit = 20
): Promise<EssayHistoryItem[]> {
  const query = (versionColumns: string) => {
    const columns: string = `id, writing_type, topic_title, created_at, essay_versions(${versionColumns}, evaluations(result))`;
    return supabase
      .from("essays")
      .select(columns)
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(limit);
  };

  let { data: essays, error } = await query("version_no, student_text, paragraph_answers");
  // 코드를 먼저 배포하고 schema.sql(paragraph_answers 컬럼 추가)을 아직 안 돌린 경우엔
  // 컬럼이 없다는 오류가 난다. 그때는 답변 없이라도 히스토리는 보여준다.
  if (error && /paragraph_answers/.test(error.message)) {
    ({ data: essays } = await query("version_no, student_text"));
  }

  return ((essays ?? []) as unknown as EssayRow[]).map((e) => {
    const versions = e.essay_versions ?? [];
    const latestVersion = [...versions].sort((a, b) => b.version_no - a.version_no)[0];
    const result = latestVersion?.evaluations?.[0]?.result ?? null;
    return {
      id: e.id,
      writingType: e.writing_type,
      topicTitle: e.topic_title,
      createdAt: e.created_at,
      scores: result?.scores ?? null,
      summary: result?.summary ?? null,
      safetyNote: result?.safety?.concern ? result.safety.note : null,
      priorityCategory: result?.priority_issue?.category ?? null,
      nextTaskSkill: result?.next_task?.skill ?? null,
      versionCount: versions.length,
      latestText: latestVersion?.student_text ?? null,
      mechanicsTable: result?.mechanics_table ?? [],
      paragraphAnswers: collectParagraphAnswers(versions),
    };
  });
}
