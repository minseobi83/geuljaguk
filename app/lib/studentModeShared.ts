// 학생 모드 상수. middleware(엣지)와 브라우저 코드에서도 쓰므로 서버 전용 import를 두지 않는다.
// 설명은 lib/studentMode.ts 참고.

export const STUDENT_MODE_COOKIE = "gj_student_mode";

// 학생 모드에서 들어갈 수 없는 보호자 전용 경로.
export const PARENT_ONLY_PATHS = ["/dashboard", "/admin", "/onboarding"];
