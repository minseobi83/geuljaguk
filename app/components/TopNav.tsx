"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

// 잡지 러닝헤드(running head) 역할. 화면 전체 폭을 쓰는 검은 띠라서
// 페이지의 max-width 컨테이너 "바깥"에 두고 쓴다.
// 이 띠가 붙는 화면은 모두 로그인이 필요한 화면이라, 로그아웃을 여기 둬도 안전하다.
export default function TopNav() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
    <div className="bg-ink text-white">
      <nav
        ref={navRef}
        className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-4 sm:gap-8 sm:px-5 sm:py-5 lg:gap-10 lg:px-10"
      >
        {/* 로고(마크 + 이름)를 누르면 소개 화면으로 간다. 잡지로 치면 표지로 돌아가는 셈.
            글쓰기 화면으로 가는 길은 학생 > 글쓰기 메뉴에 그대로 있다. */}
        <Link
          href="/login"
          aria-label="글자국 소개 화면으로"
          className="flex shrink-0 items-center gap-2 transition hover:opacity-70 sm:gap-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-white sm:h-10 sm:w-10">
            <BrandMark size={20} />
          </span>
          <span className="text-lg font-black tracking-tight sm:text-xl">글자국</span>
        </Link>

        {MENUS.map((menu, i) => (
          <div key={menu.label} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className={`flex items-center gap-1.5 text-sm font-bold transition sm:gap-2 sm:text-base ${
                openIndex === i ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {menu.label}
              <svg
                width="11"
                height="11"
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
              <div className="absolute left-0 top-full z-20 mt-3 min-w-[160px] border-2 border-ink bg-white p-1.5 shadow-lg">
                {menu.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 text-[15px] font-bold tracking-tight text-ink transition hover:bg-ink hover:text-white"
                    onClick={() => setOpenIndex(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          className="ml-auto shrink-0 text-sm font-medium text-white/70 underline underline-offset-4 transition hover:text-white sm:text-[15px]"
        >
          로그아웃
        </button>
      </nav>
    </div>
  );
}
