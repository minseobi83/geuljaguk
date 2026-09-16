"use client";

import { useEffect, useRef, useState } from "react";
import { RecommendedBook } from "@/lib/books";

// 책 카드를 누르면(추천도서 화면) 또는 책을 고르면(글쓰기 화면) 선택 동작과 겹치지 않도록,
// 정보 버튼을 따로 두고 눌렀을 때만 저자·소개를 담은 작은 팝업을 띄운다.
export default function BookInfoPopover({ book }: { book: RecommendedBook }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition ${
          open
            ? "border-accent bg-accent text-white"
            : "border-ink/20 text-ink/50 hover:border-accent hover:text-accent"
        }`}
      >
        i
      </button>

      {open && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-lg border border-ink/10 bg-white p-3 text-left shadow-lg"
        >
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-ink/10 bg-white" />
          <p className="text-sm font-medium text-ink">『{book.title}』</p>
          <p className="mt-0.5 text-xs text-ink/50">{book.author}</p>
          <p className="mt-2 text-xs leading-5 text-ink/70">{book.summary}</p>
        </div>
      )}
    </div>
  );
}
