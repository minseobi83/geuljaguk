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
  // 1~2문장짜리 짧은 소개. 잘 알려진 책은 실제 줄거리를 담았지만, 덜 알려진 책은
  // 틀린 사실을 단정하는 위험을 피하기 위해 제목·장르에서 유추한 일반적인 소개로 적었다
  // (지침의 "사실을 지어내지 않는다" 원칙과 동일하게 적용).
  summary: string;
  // "주장하는 글" 글감으로 이 책을 고를 때, 모든 책에 똑같이 "인물의 선택에 찬성/반대"만
  // 묻지 말고 그 책만의 핵심 쟁점 2가지를 짚어달라는 요청으로 추가한 필드.
  // summary에 이미 나온 내용(사실로 확인된 것)만 근거로 뽑아서, 새로운 사실을 지어내지 않는다.
  // 없으면(요약이 너무 일반적이라 구체적 쟁점을 뽑기 애매한 책) 기존 범용 템플릿으로 대신한다.
  argumentPoints?: [string, string];
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
    summary:
      "또래 친구들의 일상 속 작은 소동을 담은 단편 동화집. 표제작은 자꾸 다른 사람으로 오해받는 한 아이의 이야기를 그린다.",
  },
  {
    id: "jumun-village",
    title: "주문에 걸린 마을",
    author: "황선미",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/3620/27/cover500/8966660843_1.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
    summary: "이상한 일들이 잇따라 벌어지는 마을에서 아이들이 그 비밀을 파헤쳐 가는 이야기.",
  },
  {
    id: "yok-killer",
    title: "우리 반 욕 킬러",
    author: "임지형",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/8497/71/cover500/8937837943_1.jpg",
    suitableTypes: ["주장하는 글", "경험을 담은 글"],
    summary: "친구들 사이에 퍼진 욕설 문제를 주인공이 나서서 해결해 가는 학교 생활동화.",
    argumentPoints: [
      "주인공이 욕설 문제를 직접 나서서 해결하려 한 행동이 옳았다고 생각하는지",
      "친구의 나쁜 말버릇을 고쳐주고 싶을 때, 스스로 나서는 것과 선생님께 알리는 것 중 어느 쪽이 더 좋은 방법인지",
    ],
  },
  {
    id: "suspicious-transfer",
    title: "수상한 아이가 전학 왔다!",
    author: "제니 롭슨",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/10092/99/cover500/8958076232_1.jpg",
    suitableTypes: ["비교·대조 글", "서사적 글쓰기"],
    summary: "전학 온 아이를 둘러싼 오해와 편견, 그리고 그 사이에서 싹트는 우정을 다룬 이야기.",
  },
  {
    id: "justice-class",
    title: "묻고 답하면서 배우는 정의 수업",
    author: "김숙분",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/24038/50/cover500/8969022619_1.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
    summary: "질문과 답 형식으로 '정의'라는 어려운 개념을 아이 눈높이에서 풀어내는 인문 교양서.",
    argumentPoints: [
      "책에 나온 '정의'에 관한 질문 중, 내가 가장 공감하거나 반대하는 주장은 무엇인지",
      "우리 반이나 우리 사회에서 정의롭지 않다고 느꼈던 일이 있다면, 어떻게 바뀌면 좋을지",
    ],
  },
  {
    id: "liar-and-spy",
    title: "거짓말쟁이와 스파이",
    author: "레베카 스테드",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/2585/26/cover500/8994077553_2.jpg",
    suitableTypes: ["서사적 글쓰기", "비교·대조 글"],
    summary: "이웃이 스파이일지도 모른다는 의심에서 시작해, 두 아이의 우정과 각자의 비밀이 얽히는 미스터리 성장소설.",
  },
  {
    id: "chat-ghost",
    title: "단톡방 귀신",
    author: "제성은",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/27353/36/cover500/e162538611_1.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
    summary: "단체 채팅방에서 시작된 이상한 소문을 둘러싸고 벌어지는 이야기로, 온라인 소통의 그림자를 다룬다.",
    argumentPoints: [
      "단체 채팅방에서 퍼진 소문을 보면 그냥 넘겨야 할지, 사실인지 확인해야 할지",
      "온라인에서 친구와 이야기할 때 꼭 지켜야 할 것과 조심해야 할 것은 무엇인지",
    ],
  },
  {
    id: "blanket-sea-fish",
    title: "이불 바다 물고기",
    author: "황섭균",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/25516/22/cover500/8901246112_1.jpg",
    suitableTypes: ["서사적 글쓰기", "감상문"],
    summary: "상상력 가득한 이야기로 아이의 마음속 세계를 그려낸 동화.",
  },
  {
    id: "treasure-map-legend",
    title: "전설의 보물 지도",
    author: "박현숙",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/22900/47/cover500/8956188432_1.jpg",
    suitableTypes: ["경험을 담은 글", "문제 해결 글"],
    summary: "오래된 지도를 따라 보물을 찾아 나서는 아이들의 모험 이야기.",
  },
  {
    id: "world-changing-rules",
    title: "복작복작 세상을 바꾸는 법칙",
    author: "박동석",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/9855/48/cover500/k222535352_1.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
    summary: "우리 주변의 다양한 사회 현상과 규칙을 아이 눈높이에서 설명하는 교양서.",
    argumentPoints: [
      "책 속 규칙 중, 우리 사회에 꼭 필요하다고 생각하는 것과 그 이유",
      "더 나은 세상을 위해 바뀌어야 한다고 생각하는 규칙과 그 이유",
    ],
  },
  {
    id: "bad-child-ticket",
    title: "나쁜 어린이표",
    author: "황선미",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/96/34/cover500/8901068591_2.jpg",
    suitableTypes: ["주장하는 글", "경험을 담은 글"],
    summary: "선생님이 나눠주는 '나쁜 어린이표'를 받은 아이의 억울한 마음을 솔직하게 그린 생활동화.",
    argumentPoints: [
      "'나쁜 어린이표'처럼 벌점을 주는 방식이 아이의 행동을 바꾸는 데 정말 도움이 되는지",
      "억울하게 혼났던 경험이 있다면, 그때 내가 진짜로 원했던 건 무엇이었는지",
    ],
  },
  {
    id: "chojeongri-letter",
    title: "초정리 편지",
    author: "배유안",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/69/5/cover500/8936442295_2.jpg",
    suitableTypes: ["설명하는 글", "경험을 담은 글"],
    summary: "한글이 만들어지던 시기를 배경으로, 신분을 뛰어넘은 우정과 배움을 그린 역사동화.",
  },
  {
    id: "stone-eating-kid",
    title: "돌 씹어 먹는 아이",
    author: "송미경",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/5004/62/cover500/8954626580_1.jpg",
    suitableTypes: ["독후감", "감상문"],
    summary: "평범하지 않은 능력을 가진 아이들의 이야기를 담은 개성 강한 단편 동화집.",
  },
  {
    id: "bonjour-tours",
    title: "봉주르, 뚜르",
    author: "한윤섭",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/787/83/cover500/8954612881_2.jpg",
    suitableTypes: ["주장하는 글", "비교·대조 글"],
    summary: "프랑스의 작은 도시 뚜르를 배경으로, 낯선 곳에서 만난 인연과 비밀을 그린 이야기.",
    argumentPoints: [
      "낯선 곳에서 혼자 지내야 했던 주인공의 마음이 어땠을지",
      "친구의 비밀을 알게 되었을 때, 지켜줘야 할지 다른 사람에게 알려야 할지",
    ],
  },
  {
    id: "toad-tuesday",
    title: "화요일의 두꺼비",
    author: "러셀 에릭슨",
    gradeBands: ["4"],
    coverUrl: "https://image.aladin.co.kr/product/3981/11/cover500/8958287489_1.jpg",
    suitableTypes: ["서사적 글쓰기", "비교·대조 글"],
    summary: "성격이 정반대인 두꺼비와 올빼미가 뜻밖의 사정으로 함께 겨울을 나며 우정을 쌓아가는 이야기.",
  },

  // ---------- 5학년 (15권) ----------
  {
    id: "mongsil",
    title: "몽실언니",
    author: "권정생",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/1634/54/cover500/893643389x_2.jpg",
    suitableTypes: ["독후감", "경험을 담은 글"],
    summary: "6·25 전쟁 전후의 힘든 시절, 어린 나이에 동생을 돌보며 씩씩하게 살아가는 몽실이의 이야기.",
  },
  {
    id: "last-prince",
    title: "마지막 왕자",
    author: "강숙인",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/3033/27/cover500/e895798093_1.jpg",
    suitableTypes: ["서사적 글쓰기", "비교·대조 글"],
    summary: "나라가 무너져가는 역사적 격변기를 배경으로, 한 왕자의 운명을 그린 역사동화.",
  },
  {
    id: "inbox",
    title: "받은편지함",
    author: "남찬숙",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/57/36/cover500/8980408447_1.jpg",
    suitableTypes: ["감상문", "경험을 담은 글"],
    summary: "편지(메일)를 주고받으며 서로의 마음을 알아가는 아이들의 이야기를 그린 생활동화.",
  },
  {
    id: "dont-sell-weapons",
    title: "무기 팔지 마세요!",
    author: "위기철",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/24081/64/cover500/k172639130_1.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
    summary: "장난감 총 같은 무기를 팔지 말아 달라고 나서는 아이의 이야기를 통해 평화와 폭력의 문제를 생각해보게 하는 책.",
    argumentPoints: [
      "장난감이라도 무기 모양 장난감을 파는 것을 막아야 한다고 생각하는지",
      "한 사람의 작은 행동(캠페인)이 정말 사회를 바꿀 수 있다고 생각하는지",
    ],
  },
  {
    id: "gandhi",
    title: "위대한 영혼, 간디",
    author: "이옥순",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/25/99/cover500/8936441906_1.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
    summary: "비폭력·불복종 운동으로 인도의 독립을 이끈 간디의 삶을 다룬 위인전.",
    argumentPoints: [
      "간디가 폭력을 쓰지 않고 저항한 방법이 정말 효과적이었다고 생각하는지, 그 이유",
      "간디처럼 옳다고 믿는 것을 위해 자신을 희생하는 태도에 찬성하는지",
    ],
  },
  {
    id: "universe-topsy-turvy",
    title: "우주가 우왕좌왕",
    author: "샤르탄 포스키트",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/18/94/cover500/8934903996_2.jpg",
    suitableTypes: ["설명하는 글"],
    summary: "우주와 별, 블랙홀 같은 어려운 과학 개념을 유쾌하고 재미있게 풀어낸 과학 교양서.",
  },
  {
    id: "babdegi-jukdegi",
    title: "밥데기 죽데기",
    author: "권정생",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/52/19/cover500/893310724x_2.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
    summary: "옛이야기 같은 상상력으로 분단과 평화의 문제를 그린 동화.",
  },
  {
    id: "real-thief",
    title: "진짜 도둑",
    author: "윌리엄 스타이그",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/33/6/cover500/8984881201_2.gif",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
    summary: "보물을 지키던 거위가 도둑 누명을 쓰고 쫓겨나면서, 진짜 범인을 찾아가는 이야기.",
    argumentPoints: [
      "제대로 확인하지도 않고 거위에게 누명을 씌운 주변 인물들의 행동이 옳았는지",
      "억울한 누명을 벗기 위해 포기하지 않고 진실을 밝히려 한 거위의 태도를 어떻게 생각하는지",
    ],
  },
  {
    id: "happy-prince",
    title: "행복한 왕자",
    author: "오스카 와일드",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/16/83/cover500/8936440470_1.jpg",
    suitableTypes: ["독후감", "주장하는 글"],
    summary: "가난한 이웃을 위해 자신의 보석과 금박을 나눠주는 동상과 제비의 헌신을 그린 고전 동화.",
    argumentPoints: [
      "왕자가 가진 보석과 금박을 다 내어준 선택에 찬성하는지, 그 이유",
      "제비가 따뜻한 나라로 가는 여행을 포기하고 왕자를 도운 선택을 어떻게 생각하는지",
    ],
  },
  {
    id: "my-sister",
    title: "우리 누나",
    author: "오카 슈조",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/38/18/cover500/890103896x_2.jpg",
    suitableTypes: ["경험을 담은 글", "감상문"],
    summary: "장애가 있는 누나와 동생의 관계를 따뜻한 시선으로 그린 이야기.",
  },
  {
    id: "play-with-scientists",
    title: "과학자와 놀자!",
    author: "김성화·권수진",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/39/26/cover500/8936445340_2.jpg",
    suitableTypes: ["설명하는 글"],
    summary: "여러 과학자들의 발견과 삶의 이야기를 재미있게 들려주는 과학 교양서.",
  },
  {
    id: "kkaengibulimal",
    title: "괭이부리말 아이들",
    author: "김중미",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/30/41/cover500/893643344x_2.jpg",
    suitableTypes: ["경험을 담은 글", "비교·대조 글"],
    summary: "가난한 동네 괭이부리말에 사는 아이들의 삶과 우정, 그리고 희망을 그린 이야기.",
  },
  {
    id: "charlottes-web",
    title: "샬롯의 거미줄",
    author: "E.B. 화이트",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/17163/92/cover500/8952787595_1.jpg",
    suitableTypes: ["서사적 글쓰기", "감상문"],
    summary: "도살될 위기에 처한 아기 돼지 윌버를, 거미 샬롯이 지혜와 우정으로 구해내는 이야기.",
  },
  {
    id: "man-who-planted-trees",
    title: "나무를 심은 사람",
    author: "장 지오노",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/36/71/cover500/8995302100_2.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
    summary: "황무지에 홀로 나무를 심어 숲을 되살린 한 양치기의 이야기를 담은 우화.",
    argumentPoints: [
      "한 사람의 꾸준한 노력만으로 황무지를 숲으로 바꾸는 것 같은 큰 변화가 가능하다고 생각하는지",
      "아무도 알아주지 않아도 묵묵히 좋은 일을 계속하는 태도에 대해 어떻게 생각하는지",
    ],
  },
  {
    id: "anne-frank-diary",
    title: "안네의 일기",
    author: "안네 프랑크",
    gradeBands: ["5"],
    coverUrl: "https://image.aladin.co.kr/product/35118/40/cover500/893193453x_1.jpg",
    suitableTypes: ["독후감", "경험을 담은 글"],
    summary: "2차 세계대전 중 나치를 피해 숨어 지내야 했던 소녀 안네가 남긴 실제 일기.",
  },

  // ---------- 6학년 (15권) ----------
  {
    id: "hen",
    title: "마당을 나온 암탉",
    author: "황선미",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/34/91/cover500/8971968710_2.gif",
    suitableTypes: ["독후감", "감상문"],
    summary: "양계장을 나온 암탉 잎싹이 스스로 알을 품어 새끼를 키워내는, 모성과 자유를 그린 이야기.",
  },
  {
    id: "flawed-hero",
    title: "우리들의 일그러진 영웅",
    author: "이문열",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/59/27/cover500/8937420201_1.jpg",
    suitableTypes: ["주장하는 글", "비교·대조 글"],
    summary: "한 학급을 지배하는 반장의 권력과 그에 맞서는 전학생의 이야기를 통해 권력의 속성을 그린 소설.",
    argumentPoints: [
      "반 친구들이 반장의 부당한 힘에 맞서지 않고 따랐던 행동을 어떻게 생각하는지",
      "옳지 않다고 느끼는 힘에 맞설지, 일단 따르고 지켜볼지 나라면 어떻게 할지",
    ],
  },
  {
    id: "momo",
    title: "모모",
    author: "미하엘 엔데",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/19/10/cover500/8949190028_2.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
    summary: "시간을 훔치는 회색 신사들에 맞서, 사람들에게 진짜 시간의 소중함을 되찾아주는 소녀 모모의 이야기.",
  },
  {
    id: "korean-history-letters",
    title: "한국사 편지 1",
    author: "박은봉",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/323/33/cover500/8991221440_3.jpg",
    suitableTypes: ["설명하는 글", "경험을 담은 글"],
    summary: "편지 형식으로 한국의 역사를 시대순으로 쉽게 풀어 설명하는 역사 교양서.",
  },
  {
    id: "whats-law-dad",
    title: "아빠, 법이 뭐예요?",
    author: "우리누리",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/9/41/cover500/8936441418_2.jpg",
    suitableTypes: ["설명하는 글", "주장하는 글"],
    summary: "생활 속 다양한 상황을 통해 법이 왜 필요한지 쉽게 설명하는 법 교양서.",
    argumentPoints: [
      "법이 없다면 우리 생활이 어떻게 달라질지",
      "책에서 다룬 법 중, 더 강해지거나 바뀌어야 한다고 생각하는 것과 그 이유",
    ],
  },
  {
    id: "rich-poor-nations",
    title: "잘사는 나라 못사는 나라",
    author: "석혜원",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/30139/58/cover500/8974784599_1.jpg",
    suitableTypes: ["설명하는 글", "비교·대조 글"],
    summary: "나라마다 경제적 차이가 생기는 이유를 아이 눈높이에서 설명하는 경제 교양서.",
  },
  {
    id: "yalu-river-flows",
    title: "압록강은 흐른다",
    author: "이미륵",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/828/85/cover500/8963650405_1.jpg",
    suitableTypes: ["독후감", "경험을 담은 글"],
    summary: "일제강점기, 고향을 떠나 독일에서 살아간 저자 자신의 어린 시절과 유학 생활을 그린 자전적 소설.",
  },
  {
    id: "salmon",
    title: "연어",
    author: "안도현",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/11376/75/cover500/k322531496_1.jpg",
    suitableTypes: ["감상문", "서사적 글쓰기"],
    summary: "태어난 강으로 돌아가는 연어의 여정을 통해 삶과 사랑, 죽음의 의미를 돌아보게 하는 이야기.",
  },
  {
    id: "handwriting-on-palm",
    title: "손바닥에 쓴 글씨",
    author: "김옥",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/34/58/cover500/8936441981_1.jpg",
    suitableTypes: ["주장하는 글", "경험을 담은 글"],
    summary: "가족과 이웃 사이의 정을 담담하게 그린 생활동화.",
    argumentPoints: [
      "가족이나 이웃에게 정을 나눴던 나만의 경험은 무엇인지",
      "요즘도 이 책처럼 이웃과 정을 나누는 문화가 필요하다고 생각하는지, 그 이유",
    ],
  },
  {
    id: "little-prince",
    title: "어린 왕자",
    author: "생텍쥐페리",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/6853/49/cover500/8932917248_2.jpg",
    suitableTypes: ["감상문", "독후감"],
    summary: "사막에 불시착한 비행사가 만난, 작은 별에서 온 어린 왕자와의 만남을 통해 삶의 소중한 가치를 되돌아보게 하는 이야기.",
  },
  {
    id: "flying-classroom",
    title: "하늘을 나는 교실",
    author: "에리히 캐스트너",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/23112/33/cover500/k542637696_1.jpg",
    suitableTypes: ["비교·대조 글", "서사적 글쓰기"],
    summary: "크리스마스를 앞둔 기숙학교 아이들이 연극을 준비하며 겪는 우정과 성장의 이야기.",
  },
  {
    id: "korean-symbols-100",
    title: "우리 민족문화 상징 100",
    author: "이장원·김찬곤",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/91/48/cover500/895354162x_2.jpg",
    suitableTypes: ["설명하는 글"],
    summary: "태극기, 한글, 탈춤 등 우리 문화를 대표하는 상징 100가지를 소개하는 교양서.",
  },
  {
    id: "geumo-sinhwa",
    title: "금오신화",
    author: "김시습",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/23/95/cover500/8970656022_1.gif",
    suitableTypes: ["설명하는 글", "독후감"],
    summary: "우리나라 최초의 한문 소설집으로 꼽히는 작품으로, 신비롭고 기이한 이야기 다섯 편을 담고 있다.",
  },
  {
    id: "eye-of-eagle",
    title: "독수리의 눈",
    author: "론 버니",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/24/98/cover500/8980408269_2.jpg",
    suitableTypes: ["주장하는 글", "문제 해결 글"],
    summary: "위기 속에서 용기와 지혜를 발휘하는 주인공의 모습을 그린 모험 소설.",
    argumentPoints: [
      "위기 상황에서 주인공이 보여준 용기와 지혜 중, 내가 따라 하고 싶은 태도는 무엇인지",
      "위험한 상황에서는 무조건 조심하는 게 좋을지, 용기를 내야 할 때도 있다고 생각하는지",
    ],
  },
  {
    id: "tom-sawyer",
    title: "톰 소여의 모험",
    author: "마크 트웨인",
    gradeBands: ["6"],
    coverUrl: "https://image.aladin.co.kr/product/18558/31/cover500/8952787870_1.jpg",
    suitableTypes: ["서사적 글쓰기", "문제 해결 글"],
    summary: "미시시피강 마을을 배경으로, 장난꾸러기 톰 소여가 친구들과 겪는 모험을 그린 고전 소설.",
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

// "주장하는 글"에서 책을 고르면, 모든 책에 똑같은 "인물의 선택에 찬성/반대" 한 문장 대신
// 그 책의 핵심 쟁점 2가지를 보여준다. argumentPoints가 없는 책(구체적 쟁점을 뽑기엔
// 요약이 너무 일반적인 책)은 기존 범용 템플릿 문장 하나로 대신한다.
export function argumentGuideFor(book: RecommendedBook): { intro: string; points: string[] } {
  if (book.argumentPoints) {
    return {
      intro: `『${book.title}』을 읽고, 다음 중 하나를 골라 내 생각을 근거 들어 쓰기`,
      points: book.argumentPoints,
    };
  }
  return { intro: BOOK_PROMPT_TEMPLATES["주장하는 글"](book.title), points: [] };
}

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
