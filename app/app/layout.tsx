import type { Metadata } from "next";
import "./globals.css";
import { StudentModeProvider } from "@/components/StudentModeContext";
import GlobalSavingBar from "@/components/GlobalSavingBar";
import { getStudentModeChildId } from "@/lib/studentMode";

export const metadata: Metadata = {
  title: "글자국 - 글쓰기 성장 코치",
  description: "초등 고학년을 위한 AI 글쓰기 코칭",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">
        <StudentModeProvider value={Boolean(await getStudentModeChildId())}>
          {children}
        </StudentModeProvider>
        <GlobalSavingBar />
      </body>
    </html>
  );
}
