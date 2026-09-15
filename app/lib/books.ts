import { GradeBand, WritingType } from "./types";

// 실제 검색으로 확인한 초등 고학년 추천도서 중, 여러 자료에서 공통으로 언급되고
// 교과서 수록/스테디셀러로 널리 알려진 책들만 골랐다 (내가 내용을 잘못 알 위험이 낮은 책 위주).
// 출처: 에듀가이드 초등 5·6학년 추천도서 목록, info-gram 초등 4학년 필독도서 목록
// (둘 다 여러 학교·서점·교육기관 추천을 취합한 목록이며, 마당을 나온 암탉은
// 5학년 2학기·6학년 2학기 국어 교과서 수록도서로 별도 확인됨).
export interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  gradeBands: GradeBand[];
}

export const RECOMMENDED_BOOKS: RecommendedBook[] = [
  { id: "yujeong", title: "멀쩡한 이유정", author: "유은실", gradeBands: ["4"] },
  { id: "jumun-village", title: "주문에 걸린 마을", author: "황선미", gradeBands: ["4"] },
  { id: "yok-killer", title: "우리 반 욕 킬러", author: "임지형", gradeBands: ["4"] },
  { id: "mongsil", title: "몽실언니", author: "권정생", gradeBands: ["5"] },
  { id: "last-prince", title: "마지막 왕자", author: "강숙인", gradeBands: ["5"] },
  { id: "inbox", title: "받은편지함", author: "남찬숙", gradeBands: ["5"] },
  { id: "hen", title: "마당을 나온 암탉", author: "황선미", gradeBands: ["6"] },
  { id: "flawed-hero", title: "우리들의 일그러진 영웅", author: "이문열", gradeBands: ["6"] },
  { id: "momo", title: "모모", author: "미하엘 엔데", gradeBands: ["6"] },
];

// 특정 책의 등장인물·줄거리를 사실처럼 서술하면 잘못된 정보를 줄 위험이 있어서
// (지침의 "사실을 지어내지 않는다" 원칙), 책 제목만 넣어 완성되는 범용 템플릿으로만
// 글쓰기 과제를 만든다. 어떤 책이든, 내용을 몰라도 안전하게 쓸 수 있는 문구들이다.
export const BOOK_PROMPT_TEMPLATES: Record<WritingType, (title: string) => string> = {
  "독후감": (t) => `『${t}』을 읽고, 가장 기억에 남는 장면과 그 이유 쓰기`,
  "감상문": (t) => `『${t}』을 읽은 뒤의 느낌 쓰기`,
  "경험을 담은 글": (t) => `『${t}』 속 인물과 비슷한 나만의 경험 떠올려 쓰기`,
  "비교·대조 글": (t) => `『${t}』 속 성격이 다른 두 인물(또는 두 사건) 비교하기`,
  "문제 해결 글": (t) => `『${t}』 속 인물이 겪은 어려움, 나라면 어떻게 해결할지 쓰기`,
  "주장하는 글": (t) => `『${t}』 속 인물의 선택에 찬성하는지 반대하는지 근거 들어 쓰기`,
  "서사적 글쓰기": (t) => `『${t}』 이야기가 끝난 뒤 이어질 이야기 상상해서 쓰기`,
  "설명하는 글": (t) => `『${t}』을 안 읽은 친구에게 이 책이 어떤 책인지 소개하기`,
};

export function booksForGrade(gradeBand: GradeBand): RecommendedBook[] {
  return RECOMMENDED_BOOKS.filter((b) => b.gradeBands.includes(gradeBand));
}
