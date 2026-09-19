import { GradeBand, WritingType } from "./types";

// 글감은 이제 DB(topics 테이블)에서 읽는다. 아래 목록은 그 시드이자 폴백이다:
// 테이블이 아직 없거나 조회에 실패하면 이 목록을 그대로 쓴다. 덕분에 코드를 먼저 배포하고
// SQL을 나중에 실행해도 글쓰기 화면이 멈추지 않는다.
// (supabase/seed_topics.sql이 이 목록에서 자동 생성된 시드다.)
//
// 정답이 뻔한 주제는 피하고, 아이마다 생각이 달라질 수 있는 주제로 골랐다.
// grades: 이 글감이 어울리는 학년. 같은 유형이라도 학년에 따라 다른 글감이 뜬다.
//  - 4학년: 눈앞의 생활 경험, 구체적인 대상
//  - 5학년: 학교·또래 공동체의 문제, 근거를 두 개쯤 요구하는 주제
//  - 6학년: 사회적·추상적 주제(권리, 미디어, 환경 등)

export interface Topic {
  id: string;
  writingType: WritingType;
  title: string;
  hint: string; // 무엇을 써야 할지 방향을 잡아주는 짧은 안내
  grades: GradeBand[];
}

// 아래 목록 리터럴 안에서는 유형이 키로 이미 드러나므로 writingType을 생략하고 적는다.
type TopicSeed = Omit<Topic, "writingType">;

export const WRITING_TOPICS: Record<WritingType, TopicSeed[]> = {
  "주장하는 글": [
    {
      id: "kind-words-rule",
      title: "우리 반에 '고운 말 쓰기' 규칙이 필요하다",
      hint: "찬성인지 반대인지 정하고, 그렇게 생각한 이유를 두 가지 들어보자.",
      grades: ["4"],
    },
    {
      id: "pet-day",
      title: "학교에 반려동물을 데려와 소개하는 날이 있으면 좋겠다",
      hint: "좋은 점과 걱정되는 점을 모두 떠올려보고 네 입장을 정해보자.",
      grades: ["4"],
    },
    {
      id: "leftover-food",
      title: "급식을 남기지 않는 규칙을 만들어야 한다",
      hint: "규칙이 필요한 이유, 또는 필요 없는 이유를 근거와 함께 써보자.",
      grades: ["4", "5"],
    },
    {
      id: "phone-time",
      title: "초등학생도 스마트폰 사용 시간을 스스로 정해야 한다",
      hint: "찬성이든 반대든, 그렇게 생각하는 이유와 근거를 들어보자.",
      grades: ["5", "6"],
    },
    {
      id: "phone-to-school",
      title: "학교에 휴대폰을 가지고 올 수 있게 해야 한다",
      hint: "장점과 단점을 생각해보고 네 입장을 정해보자.",
      grades: ["5", "6"],
    },
    {
      id: "student-council",
      title: "학생 자치회가 정할 수 있는 일을 더 늘려야 한다",
      hint: "학생이 직접 정해도 되는 일과 어른이 정해야 할 일을 나눠 생각해보자.",
      grades: ["6"],
    },
  ],
  "설명하는 글": [
    {
      id: "my-chore",
      title: "우리 집에서 내가 맡은 집안일 설명하기",
      hint: "무엇을 어떤 순서로 하는지, 처음 듣는 사람도 알 수 있게 써보자.",
      grades: ["4"],
    },
    {
      id: "way-to-school",
      title: "우리 집에서 학교까지 가는 길 설명하기",
      hint: "길을 모르는 친구에게 알려주듯 순서대로 써보자.",
      grades: ["4"],
    },
    {
      id: "favorite-game-rule",
      title: "내가 좋아하는 놀이나 게임의 규칙 설명하기",
      hint: "처음 해보는 사람도 이해할 수 있게 순서대로 설명해보자.",
      grades: ["4", "5"],
    },
    {
      id: "favorite-sport",
      title: "내가 좋아하는 운동의 규칙과 재미 설명하기",
      hint: "규칙을 먼저 알려주고, 어떤 점이 재미있는지 이어서 써보자.",
      grades: ["5"],
    },
    {
      id: "recycling",
      title: "분리배출은 왜, 어떻게 해야 할까?",
      hint: "분리배출 방법과 그게 왜 중요한지 순서대로 설명해보자.",
      grades: ["5", "6"],
    },
    {
      id: "what-is-ai",
      title: "인공지능(AI)이란 무엇이고 우리 생활을 어떻게 돕고 있을까?",
      hint: "예시를 들어서 AI가 무엇인지, 어디에 쓰이는지 설명해보자.",
      grades: ["5", "6"],
    },
    {
      id: "climate-change",
      title: "기후변화는 무엇이고 왜 생길까?",
      hint: "원인과 결과를 순서대로 잇고, 우리 주변의 예를 하나 들어보자.",
      grades: ["6"],
    },
  ],
  "독후감": [
    {
      id: "book-recommend",
      title: "친구에게 이 책을 추천하고 싶은 이유",
      hint: "어떤 친구에게 어울릴지, 왜 그렇게 생각했는지 써보자.",
      grades: ["4"],
    },
    {
      id: "like-me-character",
      title: "책에서 나와 가장 닮은 인물",
      hint: "어떤 점이 닮았는지, 그 인물의 행동을 어떻게 생각하는지 써보자.",
      grades: ["4", "5"],
    },
    {
      id: "memorable-scene",
      title: "최근에 읽은 책에서 가장 기억에 남는 장면",
      hint: "그 장면이 왜 기억에 남는지, 그때 어떤 생각이 들었는지 써보자.",
      grades: ["4", "5", "6"],
    },
    {
      id: "character-choice",
      title: "책 속 주인공과 다르게 행동했을 것 같은 순간",
      hint: "주인공이 그렇게 한 이유와, 내가 그렇게 하지 않을 이유를 비교해보자.",
      grades: ["5", "6"],
    },
    {
      id: "book-today",
      title: "책 속 인물의 선택이 오늘 우리에게 주는 생각",
      hint: "그 선택을 지금 우리 상황에 놓아보면 어떻게 보이는지 써보자.",
      grades: ["6"],
    },
  ],
  "경험을 담은 글": [
    {
      id: "first-alone",
      title: "처음으로 혼자 해본 일",
      hint: "무엇을 처음 해봤는지, 그때 마음이 어땠는지 순서대로 써보자.",
      grades: ["4"],
    },
    {
      id: "proud-moment",
      title: "최근에 스스로 뿌듯했던 일",
      hint: "무슨 일이 있었는지, 왜 뿌듯했는지 순서대로 써보자.",
      grades: ["4", "5"],
    },
    {
      id: "grateful",
      title: "누군가에게 고마움을 느꼈던 경험",
      hint: "어떤 상황이었는지, 왜 고마웠는지 구체적으로 써보자.",
      grades: ["4", "5", "6"],
    },
    {
      id: "mistake-learned",
      title: "실수했지만 그 덕분에 배운 것이 있었던 경험",
      hint: "무슨 실수였는지, 그 다음에 어떻게 했는지 써보자.",
      grades: ["5", "6"],
    },
    {
      id: "mind-changed",
      title: "내 생각이 바뀌었던 순간",
      hint: "예전에는 어떻게 생각했는지, 무엇 때문에 달라졌는지 써보자.",
      grades: ["6"],
    },
  ],
  "감상문": [
    {
      id: "favorite-song",
      title: "좋아하는 노래를 듣고 든 생각",
      hint: "어떤 부분이 마음에 남았는지, 왜 그런지 써보자.",
      grades: ["4"],
    },
    {
      id: "field-trip",
      title: "체험학습이나 현장학습을 다녀온 감상",
      hint: "가장 인상 깊었던 순간과 그때 느낀 점을 써보자.",
      grades: ["4", "5"],
    },
    {
      id: "movie-or-show",
      title: "최근에 본 영화나 방송, 공연에 대한 감상",
      hint: "어떤 장면이 좋았는지, 어떤 느낌이 들었는지 써보자.",
      grades: ["4", "5", "6"],
    },
    {
      id: "sports-game",
      title: "직접 보거나 뛰었던 운동 경기에서 느낀 점",
      hint: "가장 기억에 남는 장면과 그때 마음을 함께 써보자.",
      grades: ["5"],
    },
    {
      id: "exhibition",
      title: "전시회나 박물관에서 본 것 하나에 대한 감상",
      hint: "무엇을 봤는지 먼저 설명하고, 어떤 생각이 들었는지 이어서 써보자.",
      grades: ["6"],
    },
    {
      id: "news-doc",
      title: "뉴스나 다큐멘터리를 보고 든 생각",
      hint: "어떤 내용이었는지 짧게 정리하고, 내 생각을 덧붙여보자.",
      grades: ["6"],
    },
  ],
  "비교·대조 글": [
    {
      id: "season-compare",
      title: "여름과 겨울, 내가 더 좋아하는 계절 비교하기",
      hint: "두 계절의 좋은 점을 각각 쓰고, 어느 쪽이 더 좋은지 정해보자.",
      grades: ["4"],
    },
    {
      id: "home-vs-school-meal",
      title: "집에서 먹는 밥과 학교 급식 비교하기",
      hint: "맛, 분위기, 같이 먹는 사람 같은 기준을 정해 비교해보자.",
      grades: ["4"],
    },
    {
      id: "pet-compare",
      title: "강아지 키우기와 고양이 키우기 비교하기",
      hint: "돌보는 방법이나 성격 차이를 비교해보자.",
      grades: ["4", "5"],
    },
    {
      id: "youtube-vs-book",
      title: "유튜브로 배우기와 책으로 배우기 비교하기",
      hint: "각각 어떤 상황에서 더 도움이 되는지 생각해보자.",
      grades: ["5", "6"],
    },
    {
      id: "online-vs-offline-class",
      title: "온라인 수업과 학교에서 하는 수업 비교하기",
      hint: "두 가지의 좋은 점과 아쉬운 점을 각각 생각해보자.",
      grades: ["5", "6"],
    },
    {
      id: "paper-vs-ebook",
      title: "종이책과 전자책 비교하기",
      hint: "읽는 느낌, 편리함, 눈의 피로 같은 기준을 세워 비교해보자.",
      grades: ["6"],
    },
  ],
  "문제 해결 글": [
    {
      id: "messy-locker",
      title: "교실 사물함이 자꾸 어질러지는 문제, 어떻게 해결할까?",
      hint: "왜 어질러지는지 먼저 생각하고, 우리 반에서 할 수 있는 방법을 제안해보자.",
      grades: ["4"],
    },
    {
      id: "classroom-noise",
      title: "쉬는 시간에 교실이 너무 시끄러운 문제, 어떻게 해결할까?",
      hint: "문제가 왜 생기는지, 그리고 해결 방법을 구체적으로 써보자.",
      grades: ["4", "5"],
    },
    {
      id: "friend-conflict",
      title: "친구들끼리 자주 다투는 문제, 어떻게 해결할까?",
      hint: "다툼이 생기는 이유와, 줄일 수 있는 방법을 생각해보자.",
      grades: ["4", "5", "6"],
    },
    {
      id: "leftover-food-solution",
      title: "급식 잔반을 줄이려면 어떻게 해야 할까?",
      hint: "잔반이 생기는 이유를 먼저 생각하고, 해결 방법을 제안해보자.",
      grades: ["5", "6"],
    },
    {
      id: "street-trash",
      title: "학교 주변 쓰레기 문제, 어떻게 줄일 수 있을까?",
      hint: "원인을 나눠 살펴보고, 우리가 직접 할 수 있는 일부터 제안해보자.",
      grades: ["6"],
    },
  ],
  "서사적 글쓰기": [
    {
      id: "object-alive",
      title: "내 물건 하나가 살아 움직인다면?",
      hint: "어떤 물건인지 정하고, 하루 동안 벌어질 일을 이야기로 만들어보자.",
      grades: ["4"],
    },
    {
      id: "one-day-adult",
      title: "하루 동안 어른이 된다면?",
      hint: "무엇을 하고 싶은지, 어떤 일이 생길지 이야기로 써보자.",
      grades: ["4"],
    },
    {
      id: "animal-talks",
      title: "동물이 하루 동안 말을 할 수 있게 된다면?",
      hint: "어떤 일이 벌어질지 이야기를 만들어보자.",
      grades: ["4", "5"],
    },
    {
      id: "future-school",
      title: "100년 후 학교는 어떤 모습일까?",
      hint: "상상한 모습을 이야기로 만들어보자.",
      grades: ["5", "6"],
    },
    {
      id: "time-machine",
      title: "타임머신을 타고 100년 전으로 간다면?",
      hint: "무엇을 보고, 어떤 일이 생길지 이야기를 만들어보자.",
      grades: ["5", "6"],
    },
    {
      id: "alone-on-earth",
      title: "지구에 나 혼자 남은 날 아침",
      hint: "그날 아침부터 무슨 일이 있었는지 순서대로 이야기를 만들어보자.",
      grades: ["6"],
    },
  ],
};

// 위 목록을 유형별 묶음에서 한 줄짜리 목록으로 펴놓은 것. DB에서 읽어온 글감과 같은 모양이라
// 화면에서는 둘을 구분하지 않고 똑같이 쓴다.
export const FALLBACK_TOPICS: Topic[] = (
  Object.entries(WRITING_TOPICS) as [WritingType, TopicSeed[]][]
).flatMap(([writingType, list]) => list.map((t) => ({ ...t, writingType })));

// 주어진 글감 목록에서 학년 + 글의 종류에 맞는 것만 골라 돌려준다.
// 그 조합에 맞는 글감이 하나도 없으면 학년 조건을 풀어 그 유형 전체를 보여준다(빈 목록 방지).
// 관리자가 한 유형의 글감을 모두 숨기면 그래도 빈 목록이 될 수 있으니, 쓰는 쪽에서 빈 경우를
// 반드시 처리해야 한다.
export function pickTopics(
  all: Topic[],
  gradeBand: GradeBand,
  writingType: WritingType
): Topic[] {
  const byType = all.filter((t) => t.writingType === writingType);
  const byGrade = byType.filter((t) => t.grades.includes(gradeBand));
  return byGrade.length > 0 ? byGrade : byType;
}
