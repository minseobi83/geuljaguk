import { GradeBand, WritingType } from "./types";

// 실제 검색으로 확인한 초등 고학년 추천도서 중, 여러 자료에서 공통으로 언급되고
// 교과서 수록/스테디셀러로 널리 알려진 책들만 골랐다 (내가 내용을 잘못 알 위험이 낮은 책 위주).
// 출처: 에듀가이드 초등 5·6학년 추천도서 목록, info-gram 초등 4학년 필독도서 목록
// (둘 다 여러 학교·서점·교육기관 추천을 취합한 목록이며, 마당을 나온 암탉은
// 5학년 2학기·6학년 2학기 국어 교과서 수록도서로 별도 확인됨).
// 표지 이미지는 알라딘 상품 페이지에서 실제 cover500 이미지 URL을 가져와 확인함.
//
// suitableTypes: 이 책이 잘 어울리는 글쓰기 유형(장르·소재 기준으로 판단).
// 책마다 모든 유형에 다 어울리진 않아서, 유형이 바뀌면 책 목록도 같이 바뀐다.
export interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  gradeBands: GradeBand[];
  coverUrl: string;
  suitableTypes: WritingType[];
}

export const RECOMMENDED_BOOKS: RecommendedBook[] = [
  // 4학년
  {
    id: "yujeong",
    title: "멀쩡한 이유정",
    author: "유은실",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/285/9/cover500/8971846275_1.jpg",
    suitableTypes: ["독후감", "감상문"],
  },
  {
    id: "jumun-village",
    title: "주문에 걸린 마을",
    author: "황선미",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/3620/27/cover500/8966660843_1.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
  },
  {
    id: "yok-killer",
    title: "우리 반 욕 킬러",
    author: "임지형",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/8497/71/cover500/8937837943_1.jpg",
    suitableTypes: ["주장하는 글", "경험을 담은 글"],
  },
  {
    id: "suspicious-transfer",
    title: "수상한 아이가 전학 왔다!",
    author: "제니 롭슨",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/10092/99/cover500/8958076232_1.jpg",
    suitableTypes: ["비교·대조 글", "서사적 글쓰기"],
  },
  {
    id: "justice-class",
    title: "묻고 답하면서 배우는 정의 수업",
    author: "김숙분",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/24038/50/cover500/8969022619_1.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
  },

  // 5학년
  {
    id: "mongsil",
    title: "몽실언니",
    author: "권정생",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/1634/54/cover500/893643389x_2.jpg",
    suitableTypes: ["독후감", "경험을 담은 글"],
  },
  {
    id: "last-prince",
    title: "마지막 왕자",
    author: "강숙인",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/3033/27/cover500/e895798093_1.jpg",
    suitableTypes: ["서사적 글쓰기", "비교·대조 글"],
  },
  {
    id: "inbox",
    title: "받은편지함",
    author: "남찬숙",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/57/36/cover500/8980408447_1.jpg",
    suitableTypes: ["감상문", "경험을 담은 글"],
  },
  {
    id: "dont-sell-weapons",
    title: "무기 팔지 마세요!",
    author: "위기철",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/24081/64/cover500/k172639130_1.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
  },
  {
    id: "gandhi",
    title: "위대한 영혼, 간디",
    author: "이옥순",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/25/99/cover500/8936441906_1.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
  },

  // 6학년
  {
    id: "hen",
    title: "마당을 나온 암탉",
    author: "황선미",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/34/91/cover500/8971968710_2.gif",
    suitableTypes: ["독후감", "감상문"],
  },
  {
    id: "flawed-hero",
    title: "우리들의 일그러진 영웅",
    author: "이문열",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/59/27/cover500/8937420201_1.jpg",
    suitableTypes: ["주장하는 글", "비교·대조 글"],
  },
  {
    id: "momo",
    title: "모모",
    author: "미하엘 엔데",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/19/10/cover500/8949190028_2.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
  },
  {
    id: "korean-history-letters",
    title: "한국사 편지 1",
    author: "박은봉",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/323/33/cover500/8991221440_3.jpg",
    suitableTypes: ["설명하는 글", "경험을 담은 글"],
  },
  {
    id: "whats-law-dad",
    title: "아빠, 법이 뭐예요?",
    author: "우리누리",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/9/41/cover500/8936441418_2.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
  },
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

// 학년 + 글의 종류에 맞는 책만 골라 돌려준다. 혹시 그 조합에 맞는 책이 하나도 없으면
// (지금은 8개 유형 모두 학년별로 최소 1권씩 배정해뒀지만, 나중에 목록이 바뀔 수도 있으니
// 대비해서) 학년 전체 목록으로 대신 보여준다.
export function booksFor(gradeBand: GradeBand, writingType: WritingType): RecommendedBook[] {
  const byGrade = RECOMMENDED_BOOKS.filter((b) => b.gradeBands.includes(gradeBand));
  const byType = byGrade.filter((b) => b.suitableTypes.includes(writingType));
  return byType.length > 0 ? byType : byGrade;
}
