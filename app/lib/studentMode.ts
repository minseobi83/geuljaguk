import { cookies } from "next/headers";
import { ChildProfile } from "./types";
import { STUDENT_MODE_COOKIE } from "./studentModeShared";

// 학생 모드: 보호자가 로그인한 기기를 아이에게 건네줄 때 켜는 모드.
// 켜져 있으면 이 쿠키에 그 아이의 id가 들어 있고,
//  - middleware가 보호자 전용 화면(/dashboard, /admin, /onboarding)을 막고
//  - 글쓰기·성장 기록 화면은 이 아이로 고정되며
//  - 상단 메뉴에서 로그아웃·학부모 메뉴가 사라진다.
// 끄려면 보호자 PIN이 필요하다 (app/student-mode/actions.ts).
// 기기(브라우저)마다 따로라서, 보호자의 다른 기기에는 영향이 없다.

export { PARENT_ONLY_PATHS, STUDENT_MODE_COOKIE } from "./studentModeShared";

export async function getStudentModeChildId(): Promise<string | null> {
  const store = await cookies();
  return store.get(STUDENT_MODE_COOKIE)?.value || null;
}

// 화면에서 쓸 아이와, 전환 메뉴에 보여줄 아이 목록. 학생 모드면 그 아이 한 명으로 고정한다.
export async function resolveActiveChild(
  children: ChildProfile[],
  requestedChildId: string | undefined
): Promise<{ activeChild: ChildProfile; selectableChildren: ChildProfile[]; studentMode: boolean }> {
  const lockedId = await getStudentModeChildId();
  const locked = lockedId ? children.find((c) => c.id === lockedId) : undefined;
  if (locked) {
    return { activeChild: locked, selectableChildren: [locked], studentMode: true };
  }
  const activeChild = children.find((c) => c.id === requestedChildId) ?? children[0];
  return { activeChild, selectableChildren: children, studentMode: false };
}
