import { createBrowserClient } from "@supabase/ssr";

// 브라우저(클라이언트 컴포넌트)에서 로그인 상태를 관리할 때 쓴다.
// anon key는 Anthropic 키와 달리 공개되어도 되는 값이다 (RLS가 행 단위 보안을 담당).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
