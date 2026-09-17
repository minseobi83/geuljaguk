"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandMark from "./BrandMark";

interface MenuItem {
  label: string;
  href: string;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

// 대메뉴는 우선 학생/학부모만. 나중에 항목이 늘어나면 여기 items만 추가하면 된다.
const MENUS: Menu[] = [
  {
    label: "학생",
    items: [
      { label: "글쓰기", href: "/" },
      { label: "성장 기록", href: "/growth" },
      { label: "추천도서", href: "/books" },
    ],
  },
  { label: "학부모", items: [{ label: "대시보드", href: "/dashboard" }] },
];

export default function TopNav() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <nav
      ref={navRef}
      className="mb-6 flex items-center gap-1 border-b border-ink/10 pb-3"
    >
      <Link href="/" className="mr-4 flex items-center gap-2">
        <BrandMark size={28} />
        <span className="font-heading text-lg text-accent">글자국</span>
      </Link>

      {MENUS.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              openIndex === i
                ? "bg-accent/10 text-accent"
                : "text-ink/70 hover:bg-accent/10 hover:text-accent"
            }`}
          >
            {menu.label}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={`transition-transform ${openIndex === i ? "rotate-180" : ""}`}
            >
              <path
                d="M1 3 L5 7 L9 3"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {openIndex === i && (
            <div className="absolute left-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-ink/10 bg-white p-1 shadow-md">
              {menu.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-ink/80 transition hover:bg-accent/10 hover:text-accent"
                  onClick={() => setOpenIndex(null)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
