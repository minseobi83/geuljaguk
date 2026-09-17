"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RecommendedBook } from "@/lib/books";

// 책 카드를 누르면(추천도서 화면) 또는 책을 고르면(글쓰기 화면) 선택 동작과 겹치지 않도록,
// 정보 버튼을 따로 두고 눌렀을 때만 저자·소개를 담은 작은 팝업을 띄운다.
export default function BookInfoPopover({ book }: { book: RecommendedBook }) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // 팝업은 버튼의 오른쪽 위 모서리를 기준으로 열린다(오른쪽 끝을 버튼에 맞추고
  // 아래로 펼침). 모바일 2열 그리드처럼 카드 폭이 좁으면 그래도 왼쪽으로 화면
  // 밖에 삐져나갈 수 있어서, 열릴 때 실제 위치를 재서 화면 안으로 밀어 넣는다.
  useLayoutEffect(() => {
    if (!open) {
      setShiftX(0);
      return;
    }
    const el = popoverRef.current;
    if (!el) return;
    const margin = 12;
    const rect = el.getBoundingClientRect();
    let shift = 0;
    if (rect.left < margin) {
      shift = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    }
    setShiftX(shift);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`${book.title} 소개 보기`}
        aria-expanded={open}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border shadow-sm text-[11px] font-medium transition ${
          open
            ? "border-accent bg-accent text-white"
            : "border-ink/20 bg-white text-ink/50 hover:border-accent hover:text-accent"
        }`}
      >
        i
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `translateX(${shiftX}px)` }}
          className="absolute right-0 top-full z-20 pt-2 w-60 max-w-[calc(100vw-1.5rem)]"
        >
          <div className="relative rounded-lg border border-ink/10 bg-white p-3 text-left shadow-lg">
            <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-ink/10 bg-white" />
            <p className="text-sm font-medium text-ink">『{book.title}』</p>
            <p className="mt-0.5 text-xs text-ink/50">{book.author}</p>
            <p className="mt-2 text-xs leading-5 text-ink/70">{book.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
