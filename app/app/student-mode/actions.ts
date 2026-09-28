"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_MODE_COOKIE } from "@/lib/studentModeShared";

// 학생 모드 켜기·끄기와 보호자 PIN 관리. PIN 자체는 DB 함수(schema.sql 7차분) 안에서만
// 해시로 비교하고, 앱은 결과('ok' | 'wrong' | 'locked' ...)만 받는다.

export interface StudentModeResult {
  ok: boolean;
  message: string;
}

const PIN_PATTERN = /^[0-9]{4}$/;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일 - 아이 기기에서 계속 학생 모드로 두는 경우를 위해

const RPC_MESSAGES: Record<string, string> = {
  wrong: "PIN이 맞지 않아요.",
  locked: "여러 번 틀려서 5분 동안 잠겼어요. 잠시 후 다시 시도해주세요.",
  no_pin: "아직 보호자 PIN을 정하지 않았어요.",
  invalid: "PIN은 숫자 4자리로 정해주세요.",
  unauthenticated: "로그인이 필요해요.",
};

function rpcMessage(code: string | null | undefined, fallback: string): string {
  return (code && RPC_MESSAGES[code]) || fallback;
}

async function inStudentMode(): Promise<boolean> {
  return Boolean((await cookies()).get(STUDENT_MODE_COOKIE)?.value);
}

// PIN 설정·변경. 학생 모드에서는 막는다 (아이가 PIN을 바꾸지 못하도록).
export async function setStudentPin(formData: FormData): Promise<StudentModeResult> {
  if (await inStudentMode()) return { ok: false, message: "학생 모드에서는 PIN을 바꿀 수 없어요." };

  const newPin = String(formData.get("new_pin") ?? "");
  const confirmPin = String(formData.get("confirm_pin") ?? "");
  const currentPin = String(formData.get("current_pin") ?? "");
  if (!PIN_PATTERN.test(newPin)) return { ok: false, message: RPC_MESSAGES.invalid };
  if (newPin !== confirmPin) return { ok: false, message: "새 PIN 두 번이 서로 달라요." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_student_pin", {
    new_pin: newPin,
    current_pin: currentPin || null,
  });
  if (error) return { ok: false, message: `저장하지 못했어요: ${error.message}` };
  if (data !== "ok") {
    return {
      ok: false,
      message: data === "wrong" ? "지금 PIN이 맞지 않아요." : rpcMessage(data, "저장하지 못했어요."),
    };
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "보호자 PIN을 저장했어요." };
}

export async function enterStudentMode(formData: FormData): Promise<StudentModeResult> {
  const childId = String(formData.get("child_id") ?? "");
  if (!childId) return { ok: false, message: "어떤 아이의 학생 모드인지 골라주세요." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, message: RPC_MESSAGES.unauthenticated };

  const { data: hasPin } = await supabase.rpc("has_student_pin");
  if (!hasPin) return { ok: false, message: "먼저 보호자 PIN을 정해주세요. 학생 모드를 끌 때 필요해요." };

  // 다른 보호자의 아이 id를 넣어도 RLS 때문에 조회되지 않는다.
  const { data: child } = await supabase
    .from("children")
    .select("id, nickname")
    .eq("id", childId)
    .eq("parent_id", userData.user.id)
    .maybeSingle();
  if (!child) return { ok: false, message: "아이를 찾을 수 없어요." };

  (await cookies()).set(STUDENT_MODE_COOKIE, child.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `${child.nickname} 학생 모드로 바꿨어요.` };
}

export async function exitStudentMode(formData: FormData): Promise<StudentModeResult> {
  const pin = String(formData.get("pin") ?? "");
  if (!PIN_PATTERN.test(pin)) return { ok: false, message: "PIN 숫자 4자리를 입력해주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_student_pin", { pin });
  if (error) return { ok: false, message: `확인하지 못했어요: ${error.message}` };
  if (data !== "ok") return { ok: false, message: rpcMessage(data, "확인하지 못했어요.") };

  (await cookies()).delete(STUDENT_MODE_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true, message: "보호자 화면으로 돌아왔어요." };
}

// "PIN을 잊었어요": 보호자 계정 비밀번호로 PIN을 새로 정하고 학생 모드도 끈다.
export async function resetPinWithPassword(formData: FormData): Promise<StudentModeResult> {
  const password = String(formData.get("password") ?? "");
  const newPin = String(formData.get("new_pin") ?? "");
  if (!password) return { ok: false, message: "보호자 계정 비밀번호를 입력해주세요." };
  if (!PIN_PATTERN.test(newPin)) return { ok: false, message: RPC_MESSAGES.invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_student_pin_with_password", {
    account_password: password,
    new_pin: newPin,
  });
  if (error) return { ok: false, message: `확인하지 못했어요: ${error.message}` };
  if (data !== "ok") {
    return {
      ok: false,
      message: data === "wrong" ? "비밀번호가 맞지 않아요." : rpcMessage(data, "확인하지 못했어요."),
    };
  }

  (await cookies()).delete(STUDENT_MODE_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true, message: "새 PIN을 저장하고 보호자 화면으로 돌아왔어요." };
}
