import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PARENT_ONLY_PATHS, STUDENT_MODE_COOKIE } from "@/lib/studentModeShared";

// 매 요청마다 로그인 세션(쿠키)이 만료되지 않도록 갱신한다. (Supabase Auth 공식 권장 패턴)
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() 호출이 세션을 실제로 갱신시킨다 (단순 getSession()만으로는 갱신되지 않음).
  await supabase.auth.getUser();

  // 학생 모드에서는 보호자 전용 화면으로 들어갈 수 없다 - 글쓰기 화면으로 돌려보낸다.
  const path = request.nextUrl.pathname;
  if (
    request.cookies.get(STUDENT_MODE_COOKIE)?.value &&
    PARENT_ONLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // 갱신된 세션 쿠키가 있으면 리다이렉트 응답에도 그대로 실어 보낸다.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
