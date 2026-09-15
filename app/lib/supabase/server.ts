import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트/라우트 핸들러에서 "지금 요청을 보낸 보호자"의 권한으로 DB에 접근할 때 쓴다.
// 서비스 롤 키(RLS 우회)는 쓰지 않는다 - 항상 로그인한 사용자 본인 권한으로만 읽고 쓴다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서는 쿠키를 못 쓸 수 있다. middleware가 세션을 갱신해주므로 무시해도 된다.
          }
        },
      },
    }
  );
}
