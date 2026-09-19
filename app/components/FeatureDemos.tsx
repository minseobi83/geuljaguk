"use client";

// 초화면 "글자국이 하는 일" 카드를 펼치면 나오는 미니 데모.
// 실제 화면을 축소해 흉내 낸 것이고, 애니메이션은 globals.css의 .demo-anim 계열이
// 담당한다(패널이 펼쳐진 동안에만 재생).

import { RECOMMENDED_BOOKS } from "@/lib/books";

const DEMO_BOOKS = RECOMMENDED_BOOKS.filter((b) =>
  ["hen", "mongsil", "little-prince"].includes(b.id)
);

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border border-ink/15 bg-white p-4">
      <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-ink/50">Preview</p>
      {children}
    </div>
  );
}

export default function FeatureDemo({ no }: { no: string }) {
  if (no === "01") {
    return (
      <Frame>
        <p className="break-keep font-heading text-[15px] leading-8 text-ink/85">
          달리기를{" "}
          <span className="demo-anim anim-sweep">시작하기전에</span> 나는 너무{" "}
          <span className="demo-anim anim-sweep" style={{ animationDelay: "0.5s" }}>
            긴장되서
          </span>{" "}
          손이 땀으로 젖었다.
        </p>
        <p
          className="demo-anim anim-fade-up mt-3 break-keep border-l-4 border-warn pl-3 text-xs leading-6 text-warn"
          style={{ animationDelay: "1.2s" }}
        >
          이 부분을 수정해볼까요? · &lsquo;~기 전에&rsquo;는 띄어 써요.
        </p>
        <p
          className="demo-anim anim-fade-up mt-3 break-keep text-sm font-bold text-ink"
          style={{ animationDelay: "1.8s" }}
        >
          친구들이 응원해줬을 때 마음이 어떻게 바뀌었는지 한 문장 더 써볼까?
        </p>
      </Frame>
    );
  }

  if (no === "02") {
    return (
      <Frame>
        <p className="text-[9px] uppercase tracking-[0.2em] text-ink/50">
          AI가 대신 써준 문장
        </p>
        <p className="demo-anim anim-dim mt-1 break-keep font-heading text-[15px] leading-7 text-ink/85 line-through">
          친구들의 응원 덕분에 긴장이 풀리고 자신감이 생겼다.
        </p>
        <p
          className="demo-anim anim-fade-up mt-4 text-[9px] uppercase tracking-[0.2em] text-accent"
          style={{ animationDelay: "1.1s" }}
        >
          글자국이 돌려주는 것
        </p>
        <p
          className="demo-anim anim-fade-up mt-1 break-keep text-sm font-bold leading-7 text-ink"
          style={{ animationDelay: "1.3s" }}
        >
          응원을 들었을 때 네 마음은 어떻게 바뀌었어?
        </p>
      </Frame>
    );
  }

  if (no === "03") {
    const bars = [
      { label: "7월", h: 28, tier: "도움필요" },
      { label: "8월", h: 52, tier: "보통" },
      { label: "9월", h: 84, tier: "능숙" },
    ];
    return (
      <Frame>
        <p className="text-[9px] uppercase tracking-[0.2em] text-ink/50">
          구성력 · 같은 글의 종류끼리
        </p>
        <div className="mt-3 flex h-24 items-end gap-4">
          {bars.map((b, i) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end">
                <div
                  className="demo-anim anim-bar w-full bg-ink"
                  style={{ height: `${b.h}%`, animationDelay: `${i * 0.25}s` }}
                />
              </div>
              <span className="font-mono text-[10px] text-ink/55">{b.label}</span>
            </div>
          ))}
        </div>
        <p
          className="demo-anim anim-fade-up mt-3 break-keep text-xs text-ink/75"
          style={{ animationDelay: "1.4s" }}
        >
          도움필요 → 보통 → 능숙으로 올라온 흐름이에요.
        </p>
      </Frame>
    );
  }

  if (no === "04") {
    return (
      <Frame>
        <p className="break-keep font-heading text-[15px] leading-8 text-ink/85">
          토요일에 운동회를 했다.{" "}
          <span className="demo-anim anim-dim bg-warn/10 px-0.5 text-ink/55 line-through">
            재미있었다.
          </span>{" "}
          <span
            className="demo-anim anim-fade-up bg-growth/20 px-0.5"
            style={{ animationDelay: "0.9s" }}
          >
            이어달리기에서 우리 반이 1등을 해서 정말 기뻤다.
          </span>
        </p>
        <div className="mt-4 flex gap-5 text-[10px] uppercase tracking-[0.2em] text-ink/55">
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-growth/25 ring-1 ring-growth/50" />
            새로 쓴 부분
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 bg-warn/15 ring-1 ring-warn/40" />
            지운 부분
          </span>
        </div>
      </Frame>
    );
  }

  if (no === "05") {
    return (
      <Frame>
        <p className="text-[9px] uppercase tracking-[0.2em] text-ink/50">
          보호자 대시보드
        </p>
        <div
          className="demo-anim anim-fade-up mt-2 border-l-4 border-warn bg-warn/5 px-3 py-3"
          style={{ animationDelay: "0.4s" }}
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-warn">
            확인해 주세요
          </p>
          <p className="mt-2 break-keep text-xs leading-6 text-ink/85">
            아이의 글에서 어른이 함께 살펴보면 좋을 내용이 보였어요.
          </p>
        </div>
        <p
          className="demo-anim anim-fade-up mt-3 break-keep text-xs leading-6 text-ink/65"
          style={{ animationDelay: "1.2s" }}
        >
          아이 화면에는 놀라지 않도록 부드러운 안내만 보여줘요.
        </p>
      </Frame>
    );
  }

  if (no === "06") {
    return (
      <Frame>
        <div className="flex gap-3">
          {DEMO_BOOKS.map((book, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={book.id}
              src={book.coverUrl}
              alt={`${book.title} 표지`}
              className="demo-anim anim-color h-20 w-14 border border-ink/10 object-cover"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}
        </div>
        <p
          className="demo-anim anim-fade-up mt-4 break-keep border-l-4 border-ink pl-3 text-xs leading-6 text-ink/85"
          style={{ animationDelay: "1.2s" }}
        >
          『마당을 나온 암탉』을 고르면 — 잎싹이 알을 품기로 한 선택에 찬성하는지,
          그렇게 생각한 이유는 무엇인지.
        </p>
      </Frame>
    );
  }

  return null;
}
