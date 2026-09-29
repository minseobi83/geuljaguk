"use client";

import { useEffect, useSyncExternalStore } from "react";

// 화면 어디서든 "지금 저장 중"을 알리는 작은 전역 저장소.
// 저장 버튼이 있는 컴포넌트는 useSavingIndicator(pending)만 부르면 되고,
// 루트 레이아웃의 <GlobalSavingBar />가 하나라도 진행 중이면 화면 맨 위에 로딩 바를 띄운다.

const active = new Map<number, string>(); // 진행 중인 작업 id → 보여줄 문구
const listeners = new Set<() => void>();
let nextId = 1;
let snapshot: string | null = null; // 가장 최근에 시작한 작업의 문구 (없으면 null)

function emit() {
  const labels = [...active.values()];
  snapshot = labels.length > 0 ? labels[labels.length - 1] : null;
  listeners.forEach((l) => l());
}

function begin(label: string): () => void {
  const id = nextId++;
  active.set(id, label);
  emit();
  return () => {
    if (active.delete(id)) emit();
  };
}

export function subscribeSaving(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSavingLabel(): string | null {
  return snapshot;
}

// busy가 true인 동안 전역 로딩 바를 켠다. 컴포넌트가 사라지면 자동으로 끈다.
export function useSavingIndicator(busy: boolean, label = "저장하는 중이에요…") {
  useEffect(() => {
    if (!busy) return;
    return begin(label);
  }, [busy, label]);
}

export function useSavingLabel(): string | null {
  return useSyncExternalStore(subscribeSaving, getSavingLabel, () => null);
}
