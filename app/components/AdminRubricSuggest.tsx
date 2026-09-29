"use client";

import { useState, useTransition } from "react";
import {
  ActionResult,
  RubricSuggestResult,
  createPromptVersion,
  suggestRubricImprovement,
} from "@/app/admin/actions";
import { applyRubricChanges } from "@/lib/rubricChanges";
import { FieldLabel, SectionLabel } from "./AdminQualityTabs";
import { useSavingIndicator } from "@/lib/savingIndicator";

// 관리자 6차분(2026-09-28): 평가기준 반자동 개선. 품질 검토 결과를 Claude가 읽고 "찾아 바꾸기"
// 수정안을 내면, 관리자가 변경을 하나씩 골라 미리 보고 새 버전으로 저장한다. 활성화는 저장 뒤
// 버전 기록에서 따로 결정한다 - 기준을 바꾸는 최종 판단은 항상 사람이 한다.

export default function RubricSuggestPanel({ onDone }: { onDone: (r: ActionResult) => void }) {
  const [result, setResult] = useState<RubricSuggestResult | null>(null);
  const [pending, startTransition] = useTransition();
  useSavingIndicator(pending, "검토를 읽고 개선안을 만드는 중이에요… (1~2분)");

  function generate() {
    startTransition(async () => {
      const r = await suggestRubricImprovement();
      onDone(r);
      setResult(r.ok ? r : null);
    });
  }

  return (
    <div className="mt-10">
      <SectionLabel>Suggest · 검토 결과로 개선안 만들기</SectionLabel>
      <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
        지금 채점에 쓰는 기준으로 매긴 첨삭 중 품질 검토에서 &lsquo;아쉬움&rsquo;·&lsquo;부적절&rsquo;로
        판정된 것들을 AI가 읽고, 반복되는 문제만 고치는 수정안을 만들어요. 30건 이상 쌓였을 때
        쓰면 근거가 충분해져요. 만든 수정안은 자동으로 적용되지 않아요.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={generate}
        className="mt-4 border border-ink px-4 py-2 text-xs font-bold text-ink transition hover:bg-ink hover:text-white disabled:opacity-40"
      >
        {pending ? "검토를 읽고 수정안을 쓰는 중... (1~2분)" : "개선안 만들기"}
      </button>

      {result?.suggestion && result.basePrompt && (
        <SuggestionReview key={result.suggestion.summary} result={result} onDone={onDone} />
      )}
    </div>
  );
}

function SuggestionReview({
  result,
  onDone,
}: {
  result: RubricSuggestResult;
  onDone: (r: ActionResult) => void;
}) {
  const suggestion = result.suggestion!;
  const base = result.basePrompt!;
  const [picked, setPicked] = useState<boolean[]>(suggestion.applicable);
  const [edited, setEdited] = useState<string | null>(null);
  const [label, setLabel] = useState(
    `${result.baseLabel} 개선안 (${new Date().getMonth() + 1}/${new Date().getDate()})`
  );
  const [pending, startTransition] = useTransition();
  useSavingIndicator(pending);

  const chosen = suggestion.changes.filter((_, i) => picked[i]);
  const preview = edited ?? applyRubricChanges(base, chosen);

  function toggle(i: number) {
    setPicked((p) => p.map((v, j) => (j === i ? !v : v)));
    setEdited(null); // 고른 변경이 바뀌면 직접 고친 내용 대신 다시 계산한 미리보기를 보여준다
  }

  function save() {
    const fd = new FormData();
    fd.set("label", label);
    fd.set("system_prompt", preview);
    fd.set(
      "note",
      `검토 기반 개선안: ${chosen.map((c) => c.issue).join(" / ")}`.slice(0, 500)
    );
    // activate는 넣지 않는다 - 저장만 하고, 활성화는 버전 기록에서 따로.
    startTransition(async () => onDone(await createPromptVersion(fd)));
  }

  const counts = result.reviewCounts;

  return (
    <div className="mt-6 border-2 border-ink p-5">
      {counts && (
        <p className="font-mono text-[11px] text-ink/45">
          기준: {result.baseLabel} · 검토 적절 {counts.적절} / 아쉬움 {counts.아쉬움} / 부적절 {counts.부적절}
        </p>
      )}
      <p className="mt-2 break-keep text-sm leading-7 text-ink/80">{suggestion.summary}</p>
      {suggestion.caution && (
        <p className="mt-2 break-keep border-l-4 border-warn pl-3 text-xs leading-6 text-warn">
          주의 · {suggestion.caution}
        </p>
      )}

      {suggestion.changes.length > 0 && (
        <>
          <ul className="mt-5 flex flex-col gap-4">
            {suggestion.changes.map((c, i) => {
              const applicable = suggestion.applicable[i];
              return (
                <li key={i} className={`border border-ink/15 p-4 ${applicable ? "" : "opacity-60"}`}>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 accent-ink"
                      checked={picked[i]}
                      disabled={!applicable}
                      onChange={() => toggle(i)}
                    />
                    <span className="break-keep text-sm font-bold text-ink">{c.issue}</span>
                  </label>
                  <p className="mt-1 break-keep text-xs leading-6 text-ink/60">{c.rationale}</p>
                  {!applicable && (
                    <p className="mt-1 text-xs text-warn">
                      바꿀 원문을 현재 기준에서 정확히 찾지 못해 적용할 수 없어요.
                    </p>
                  )}
                  <div className="mt-3 grid gap-2 font-mono text-[11px] leading-5 sm:grid-cols-2">
                    <pre className="whitespace-pre-wrap break-all bg-warn/5 p-2 text-ink/60">
                      {c.find === "" ? "(맨 끝에 새로 덧붙임)" : `- ${c.find}`}
                    </pre>
                    <pre className="whitespace-pre-wrap break-all bg-growth/5 p-2 text-ink/80">
                      + {c.replace}
                    </pre>
                  </div>
                </li>
              );
            })}
          </ul>

          <label className="mt-6 block">
            <FieldLabel>새 버전 이름</FieldLabel>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none"
            />
          </label>
          <label className="mt-4 block">
            <FieldLabel>적용 결과 미리보기 (직접 더 고칠 수 있어요)</FieldLabel>
            <textarea
              value={preview}
              onChange={(e) => setEdited(e.target.value)}
              rows={16}
              className="mt-1 w-full border border-ink/20 bg-transparent p-3 font-mono text-xs leading-6 outline-none focus:border-ink"
            />
          </label>
          <button
            type="button"
            disabled={pending || chosen.length === 0 || !label.trim()}
            onClick={save}
            className="mt-4 bg-ink px-6 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
          >
            {pending ? "저장하는 중..." : `고른 변경 ${chosen.length}개로 새 버전 저장`}
          </button>
          <p className="mt-2 break-keep text-xs text-ink/45">
            저장만 되고 채점에는 아직 쓰이지 않아요. 아래 버전 기록에서 &lsquo;이 버전으로
            채점하기&rsquo;를 눌러야 적용돼요.
          </p>
        </>
      )}
    </div>
  );
}
