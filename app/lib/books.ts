import { GradeBand, WritingType } from "./types";

// 실제 검색으로 확인한 초등 고학년 추천도서 중, 여러 자료에서 공통으로 언급되고
// 교과서 수록/스테디셀러로 널리 알려진 책들만 골랐다 (내가 내용을 잘못 알 위험이 낮은 책 위주).
// 출처: 에듀가이드 초등 5·6학년 추천도서 목록, info-gram 초등 4학년 필독도서 목록,
// 국립어린이청소년도서관/각 출판사 소개 자료 등을 교차 확인. 마당을 나온 암탉은
// 5학년 2학기·6학년 2학기 국어 교과서 수록도서로 별도 확인됨.
// 표지 이미지는 알라딘 상품 페이지에서 실제 cover500 이미지 URL을 가져와 확인함(curl 200 확인).
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
  // ---------- 4학년 (15권) ----------
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
  {
    id: "liar-and-spy",
    title: "거짓말쟁이와 스파이",
    author: "레베카 스테드",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/2585/26/cover500/8994077553_2.jpg",
    suitableTypes: ["서사적 글쓰기", "비교·대조 글"],
  },
  {
    id: "chat-ghost",
    title: "단톡방 귀신",
    author: "제성은",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/27353/36/cover500/e162538611_1.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
  },
  {
    id: "blanket-sea-fish",
    title: "이불 바다 물고기",
    author: "황섭균",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/25516/22/cover500/8901246112_1.jpg",
    suitableTypes: ["서사적 글쓰기", "감상문"],
  },
  {
    id: "treasure-map-legend",
    title: "전설의 보물 지도",
    author: "박현숙",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/22900/47/cover500/8956188432_1.jpg",
    suitableTypes: ["경험을 담은 글", "문제 해결 글"],
  },
  {
    id: "world-changing-rules",
    title: "복작복작 세상을 바꾸는 법칙",
    author: "박동석",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/9855/48/cover500/k222535352_1.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
  },
  {
    id: "bad-child-ticket",
    title: "나쁜 어린이표",
    author: "황선미",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/96/34/cover500/8901068591_2.jpg",
    suitableTypes: ["주장하는 글", "경험을 담은 글"],
  },
  {
    id: "chojeongri-letter",
    title: "초정리 편지",
    author: "배유안",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/69/5/cover500/8936442295_2.jpg",
    suitableTypes: ["설명하는 글", "경험을 담은 글"],
  },
  {
    id: "stone-eating-kid",
    title: "돌 씹어 먹는 아이",
    author: "송미경",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/5004/62/cover500/8954626580_1.jpg",
    suitableTypes: ["독후감", "감상문"],
  },
  {
    id: "bonjour-tours",
    title: "봉주르, 뚜르",
    author: "한윤섭",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/787/83/cover500/8954612881_2.jpg",
    suitableTypes: ["주장하는 글", "비교·대조 글"],
  },
  {
    id: "toad-tuesday",
    title: "화요일의 두꺼비",
    author: "러셀 에릭슨",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/3981/11/cover500/8958287489_1.jpg",
    suitableTypes: ["서사적 글쓰기", "비교·대조 글"],
  },

  // ---------- 5학년 (15권) ----------
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
  {
    id: "universe-topsy-turvy",
    title: "우주가 우왕좌왕",
    author: "샤르탄 포스키트",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/18/94/cover500/8934903996_2.jpg",
    suitableTypes: ["설명하는 글"],
  },
  {
    id: "babdegi-jukdegi",
    title: "밥데기 죽데기",
    author: "권정생",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/52/19/cover500/893310724x_2.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
  },
  {
    id: "real-thief",
    title: "진짜 도둑",
    author: "윌리엄 스타이그",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/33/6/cover500/8984881201_2.gif",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
  },
  {
    id: "happy-prince",
    title: "행복한 왕자",
    author: "오스카 와일드",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/16/83/cover500/8936440470_1.jpg",
    suitableTypes: ["독후감", "주장하는 글"],
  },
  {
    id: "my-sister",
    title: "우리 누나",
    author: "오카 슈조",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/38/18/cover500/890103896x_2.jpg",
    suitableTypes: ["경험을 담은 글", "감상문"],
  },
  {
    id: "play-with-scientists",
    title: "과학자와 놀자!",
    author: "김성화·권수진",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/39/26/cover500/8936445340_2.jpg",
    suitableTypes: ["설명하는 글"],
  },
  {
    id: "kkaengibulimal",
    title: "괭이부리말 아이들",
    author: "김중미",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/30/41/cover500/893643344x_2.jpg",
    suitableTypes: ["경험을 담은 글", "비교·대조 글"],
  },
  {
    id: "charlottes-web",
    title: "샬롯의 거미줄",
    author: "E.B. 화이트",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/17163/92/cover500/8952787595_1.jpg",
    suitableTypes: ["서사적 글쓰기", "감상문"],
  },
  {
    id: "man-who-planted-trees",
    title: "나무를 심은 사람",
    author: "장 지오노",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/36/71/cover500/8995302100_2.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
  },
  {
    id: "anne-frank-diary",
    title: "안네의 일기",
    author: "안네 프랑크",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/35118/40/cover500/893193453x_1.jpg",
    suitableTypes: ["독후감", "경험을 담은 글"],
  },

  // ---------- 6학년 (15권) ----------
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
  {
    id: "rich-poor-nations",
    title: "잘사는 나라 못사는 나라",
    author: "석혜원",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/30139/58/cover500/8974784599_1.jpg",
    suitableTypes: ["설명하는 글", "비교·대조 글"],
  },
  {
    id: "yalu-river-flows",
    title: "압록강은 흐른다",
    author: "이미륵",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/828/85/cover500/8963650405_1.jpg",
    suitableTypes: ["독후감", "경험을 담은 글"],
  },
  {
    id: "salmon",
    title: "연어",
    author: "안도현",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/11376/75/cover500/k322531496_1.jpg",
    suitableTypes: ["감상문", "서사적 글쓰기"],
  },
  {
    id: "handwriting-on-palm",
    title: "손바닥에 쓴 글씨",
    author: "김옥",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/34/58/cover500/8936441981_1.jpg",
    suitableTypes: ["주장하는 글", "경험을 담은 글"],
  },
  {
    id: "little-prince",
    title: "어린 왕자",
    author: "생텍쥐페리",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/6853/49/cover500/8932917248_2.jpg",
    suitableTypes: ["감상문", "독후감"],
  },
  {
    id: "flying-classroom",
    title: "하늘을 나는 교실",
    author: "에리히 캐스트너",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/23112/33/cover500/k542637696_1.jpg",
    suitableTypes: ["비교·대조 글", "서사적 글쓰기"],
  },
  {
    id: "korean-symbols-100",
    title: "우리 민족문화 상징 100",
    author: "이장원·김찬곤",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/91/48/cover500/895354162x_2.jpg",
    suitableTypes: ["설명하는 글"],
  },
  {
    id: "geumo-sinhwa",
    title: "금오신화",
    author: "김시습",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/23/95/cover500/8970656022_1.gif",
    suitableTypes: ["설명하는 글", "독후감"],
  },
  {
    id: "eye-of-eagle",
    title: "독수리의 눈",
    author: "론 버니",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/24/98/cover500/8980408269_2.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
  },
  {
    id: "tom-sawyer",
    title: "톰 소여의 모험",
    author: "마크 트웨인",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/18558/31/cover500/8952787870_1.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
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
// 학년 전체 목록으로 대신 보여준다.
export function booksFor(gradeBand: GradeBand, writingType: WritingType): RecommendedBook[] {
  const byGrade = RECOMMENDED_BOOKS.filter((b) => b.gradeBands.includes(gradeBand));
  const byType = byGrade.filter((b) => b.suitableTypes.includes(writingType));
  return byType.length > 0 ? byType : byGrade;
}

export function booksForGradeAll(gradeBand: GradeBand): RecommendedBook[] {
  return RECOMMENDED_BOOKS.filter((b) => b.gradeBands.includes(gradeBand));
}
