"use client";

import { createContext, useContext } from "react";

// 학생 모드 여부. 쿠키가 httpOnly라 브라우저 코드가 직접 읽을 수 없어서, 루트 레이아웃(서버)이
// 읽어 이 컨텍스트로 내려준다 - 상단 메뉴가 첫 화면부터 깜빡임 없이 학생용으로 그려지도록.
const StudentModeContext = createContext(false);

export function StudentModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <StudentModeContext.Provider value={value}>{children}</StudentModeContext.Provider>;
}

export function useStudentMode(): boolean {
  return useContext(StudentModeContext);
}
