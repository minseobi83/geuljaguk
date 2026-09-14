import { WritingType } from "./types";

// 관리자 콘솔이 생기기 전까지 쓰는 큐레이션된 글감 목록.
// 나중에 관리자가 글감을 직접 관리하게 되면 이 목록을 DB(topics 테이블)로 옮기면 된다.
// 정답이 뻔한 주제는 피하고, 아이마다 생각이 달라질 수 있는 주제로 골랐다.

export interface Topic {
  id: string;
  title: string;
  hint: string; // 무엇을 써야 할지 방향을 잡아주는 짧은 안내
}

export const WRITING_TOPICS: Record<WritingType, Topic[]> = {
  "주장하는 글": [
    {
      id: "phone-time",
      title: "초등학생도 스마트폰 사용 시간을 스스로 정해야 한다",
      hint: "찬성이든 반대든, 그렇게 생각하는 이유와 근거를 들어보자.",
    },
    {
      id: "phone-to-school",
      title: "학교에 휴대폰을 가지고 올 수 있게 해야 한다",
      hint: "장점과 단점을 생각해보고 네 입장을 정해보자.",
    },
    {
      id: "leftover-food",
      title: "급식을 남기지 않는 규칙을 만들어야 한다",
      hint: "규칙이 필요한 이유, 또는 필요 없는 이유를 근거와 함께 써보자.",
    },
  ],
  "설명하는 글": [
    {
      id: "what-is-ai",
      title: "인공지능(AI)이란 무엇이고 우리 생활을 어떻게 돕고 있을까?",
      hint: "예시를 들어서 AI가 무엇인지, 어디에 쓰이는지 설명해보자.",
    },
    {
      id: "recycling",
      title: "분리배출은 왜, 어떻게 해야 할까?",
      hint: "분리배출 방법과 그게 왜 중요한지 순서대로 설명해보자.",
    },
    {
      id: "favorite-game-rule",
      title: "내가 좋아하는 놀이나 게임의 규칙 설명하기",
      hint: "처음 해보는 사람도 이해할 수 있게 순서대로 설명해보자.",
    },
  ],
  "독후감": [
    {
      id: "memorable-scene",
      title: "최근에 읽은 책에서 가장 기억에 남는 장면",
      hint: "그 장면이 왜 기억에 남는지, 그때 어떤 생각이 들었는지 써보자.",
    },
    {
      id: "character-choice",
      title: "책 속 주인공과 다르게 행동했을 것 같은 순간",
      hint: "주인공이 그렇게 한 이유와, 내가 그렇게 하지 않을 이유를 비교해보자.",
    },
  ],
  "경험을 담은 글": [
    {
      id: "proud-moment",
      title: "최근에 스스로 뿌듯했던 일",
      hint: "무슨 일이 있었는지, 왜 뿌듯했는지 순서대로 써보자.",
    },
    {
      id: "mistake-learned",
      title: "실수했지만 그 덕분에 배운 것이 있었던 경험",
      hint: "무슨 실수였는지, 그 다음에 어떻게 했는지 써보자.",
    },
    {
      id: "grateful",
      title: "누군가에게 고마움을 느꼈던 경험",
      hint: "어떤 상황이었는지, 왜 고마웠는지 구체적으로 써보자.",
    },
  ],
  "감상문": [
    {
      id: "movie-or-show",
      title: "최근에 본 영화나 방송, 공연에 대한 감상",
      hint: "어떤 장면이 좋았는지, 어떤 느낌이 들었는지 써보자.",
    },
    {
      id: "field-trip",
      title: "체험학습이나 현장학습을 다녀온 감상",
      hint: "가장 인상 깊었던 순간과 그때 느낀 점을 써보자.",
    },
  ],
  "비교·대조 글": [
    {
      id: "online-vs-offline-class",
      title: "온라인 수업과 학교에서 하는 수업 비교하기",
      hint: "두 가지의 좋은 점과 아쉬운 점을 각각 생각해보자.",
    },
    {
      id: "youtube-vs-book",
      title: "유튜브로 배우기와 책으로 배우기 비교하기",
      hint: "각각 어떤 상황에서 더 도움이 되는지 생각해보자.",
    },
    {
      id: "pet-compare",
      title: "강아지 키우기와 고양이 키우기 비교하기",
      hint: "돌보는 방법이나 성격 차이를 비교해보자.",
    },
  ],
  "문제 해결 글": [
    {
      id: "classroom-noise",
      title: "쉬는 시간에 교실이 너무 시끄러운 문제, 어떻게 해결할까?",
      hint: "문제가 왜 생기는지, 그리고 해결 방법을 구체적으로 써보자.",
    },
    {
      id: "leftover-food-solution",
      title: "급식 잔반을 줄이려면 어떻게 해야 할까?",
      hint: "잔반이 생기는 이유를 먼저 생각하고, 해결 방법을 제안해보자.",
    },
    {
      id: "friend-conflict",
      title: "친구들끼리 자주 다투는 문제, 어떻게 해결할까?",
      hint: "다툼이 생기는 이유와, 줄일 수 있는 방법을 생각해보자.",
    },
  ],
  "서사적 글쓰기": [
    {
      id: "animal-talks",
      title: "동물이 하루 동안 말을 할 수 있게 된다면?",
      hint: "어떤 일이 벌어질지 이야기를 만들어보자.",
    },
    {
      id: "future-school",
      title: "100년 후 학교는 어떤 모습일까?",
      hint: "상상한 모습을 이야기로 만들어보자.",
    },
    {
      id: "time-machine",
      title: "타임머신을 타고 100년 전으로 간다면?",
      hint: "무엇을 보고, 어떤 일이 생길지 이야기를 만들어보자.",
    },
  ],
};
