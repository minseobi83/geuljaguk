"use client";

import { useRef, useState } from "react";
import { useSavingIndicator } from "@/lib/savingIndicator";

// 공책 사진 한 장을 올리면 손글씨를 읽어 원고 입력칸에 채워준다 (업로드 1단계).
// 사진은 브라우저에서 긴 변 1600px JPEG로 줄여서 보내고, 서버는 글자만 읽고 사진을 버린다.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // 대부분의 브라우저는 createImageBitmap이 사진의 회전 정보(EXIF)까지 반영해준다.
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // 일부 브라우저·형식(HEIC 등)은 <img>로만 열린다.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function shrinkToJpeg(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; // 투명한 PNG도 흰 종이처럼
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", JPEG_QUALITY)
  );
}

export default function PhotoToText({
  currentText,
  onText,
  disabled,
}: {
  currentText: string;
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useSavingIndicator(reading, "사진 속 글을 읽는 중이에요…");

  async function handleFile(file: File) {
    if (
      currentText.trim() &&
      !window.confirm("지금 쓴 글을 사진 속 글로 바꿀까요? 지금 글은 지워져요.")
    ) {
      return;
    }
    setReading(true);
    setMessage(null);
    try {
      let blob: Blob;
      try {
        blob = await shrinkToJpeg(file);
      } catch {
        setMessage({ ok: false, text: "이 사진은 열 수 없어요. 다른 사진을 골라볼까요?" });
        return;
      }
      const form = new FormData();
      form.set("image", blob, "photo.jpg");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok || typeof body?.text !== "string") {
        setMessage({ ok: false, text: body?.error ?? "사진을 읽지 못했어요. 다시 해볼까요?" });
        return;
      }
      onText(body.text);
      const unreadable = Number(body.unreadable) || 0;
      setMessage({
        ok: true,
        text:
          unreadable > 0
            ? `사진 속 글을 옮겼어요. 읽기 어려운 글자 ${unreadable}곳을 [?]로 남겼어요. 원래 쓴 글자로 고쳐주세요.`
            : "사진 속 글을 옮겼어요. 틀리게 옮겨진 곳이 없는지 한 번 읽어보고 고쳐주세요.",
      });
    } catch {
      setMessage({ ok: false, text: "서버와 통신하는 중 문제가 생겼어요. 다시 해볼까요?" });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = ""; // 같은 사진을 다시 골라도 동작하도록
    }
  }

  return (
    <div className="border-x border-b border-ink/15 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || reading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 border border-ink px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-ink hover:text-white disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="4" width="13" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8.75" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5.5 4 L6.5 2.5 H9.5 L10.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {reading ? "사진 읽는 중..." : "공책 사진으로 올리기"}
        </button>
        <span className="break-keep text-xs text-ink/45">
          종이에 쓴 글을 찍어 올리면 글자로 옮겨줘요. 사진은 저장하지 않아요.
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {message && (
        <p
          className={`mt-2 break-keep text-sm leading-6 ${message.ok ? "text-ink/75" : "text-warn"}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
