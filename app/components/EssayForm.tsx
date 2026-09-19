"use client";

import { useState } from "react";
import { GradeBand, WritingType } from "@/lib/types";
import { topicsFor } from "@/lib/topics";
import { bookGuideFor, booksFor } from "@/lib/books";
import BookInfoPopover from "@/components/BookInfoPopover";

const WRITING_TYPES: WritingType[] = [
  "주장하는 글",
  "설명하는 글",
  "독후감",
  "경험을 담은 글",
  "감상문",
  "비교·대조 글",
  "문제 해결 글",
  "서사적 글쓰기",
];

const CUSTOM_TOPIC_ID = "__custom__";

function findInitialTopicId(
  gradeBand: GradeBand,
  writingType: WritingType,
  topicTitle?: string
): string {
  const list = topicsFor(gradeBand, writingType);
  if (!topicTitle) return list[0].id;
  const matched = list.find((t) => t.title === topicTitle);
  return matched ? matched.id : CUSTOM_TOPIC_ID;
}

interface Props {
  initialText?: string;
  initialWritingType?: WritingType;
  initialGradeBand?: GradeBand;
  initialTopicTitle?: string;
  onSubmit: (data: {
    studentText: string;
    writingType: WritingType;
    gradeBand: GradeBand;
    topicTitle?: string;
  }) => void;
  submitting: boolean;
  submitLabel: string;
}

type SourceKind = "topic" | "book";

export default function EssayForm({
  initialText = "",
  initialWritingType = "주장하는 글",
  initialGradeBand = "5",
  initialTopicTitle,
  onSubmit,
  submitting,
  submitLabel,
}: Props) {
  const [text, setText] = useState(initialText);
  const [writingType, setWritingType] = useState<WritingType>(initialWritingType);
  const [gradeBand, setGradeBand] = useState<GradeBand>(initialGradeBand);
  const [sourceKind, setSourceKind] = useState<SourceKind>("topic");
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() =>
    findInitialTopicId(initialGradeBand, initialWritingType, initialTopicTitle)
  );
  const [customTopic, setCustomTopic] = useState(
    findInitialTopicId(initialGradeBand, initialWritingType, initialTopicTitle) ===
      CUSTOM_TOPIC_ID
      ? initialTopicTitle ?? ""
      : ""
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(
    booksFor(initialGradeBand, initialWritingType)[0]?.id ?? null
  );

  // 글감은 학년 + 글의 종류 조합으로 달라진다.
  const topics = topicsFor(gradeBand, writingType);
  const books = booksFor(gradeBand, writingType);
  // 감상문처럼 추천도서와 연결하지 않는 유형에서는 책 탭 자체를 숨긴다.
  const hasBooks = books.length > 0;
  const source: SourceKind = hasBooks ? sourceKind : "topic";
  const isCustom = selectedTopicId === CUSTOM_TOPIC_ID;
  const selectedBook = books.find((b) => b.id === selectedBookId);
  // 그 책만의 핵심 포인트가 있으면 범용 템플릿 대신 그걸 보여준다.
  const bookGuide = selectedBook ? bookGuideFor(selectedBook, writingType) : null;

  const topicTitle =
    source === "book" && selectedBook
      ? bookGuideFor(selectedBook, writingType).intro
      : isCustom
      ? customTopic.trim() || undefined
      : topics.find((t) => t.id === selectedTopicId)?.title;

  function handleWritingTypeChange(newType: WritingType) {
    setWritingType(newType);
    // 글의 종류가 바뀌면 그 종류에 맞는 글감 목록으로 다시 골라야 하니 첫 번째 글감으로 초기화.
    setSelectedTopicId(topicsFor(gradeBand, newType)[0].id);
    setCustomTopic("");
    // 추천도서도 유형마다 어울리는 책이 다르므로, 새 유형에 맞는 책 목록의 첫 번째로 바꾼다.
    const newBooks = booksFor(gradeBand, newType);
    if (!newBooks.find((b) => b.id === selectedBookId)) {
      setSelectedBookId(newBooks[0]?.id ?? null);
    }
  }

  function handleGradeBandChange(newGrade: GradeBand) {
    setGradeBand(newGrade);
    // 학년이 바뀌면 그 나이에 맞는 글감으로 목록이 바뀐다. 고르던 글감이 새 목록에 없으면
    // 첫 번째 글감으로 옮겨준다 ('직접 정하기'를 골라둔 상태는 그대로 유지).
    if (selectedTopicId !== CUSTOM_TOPIC_ID) {
      const newTopics = topicsFor(newGrade, writingType);
      if (!newTopics.find((t) => t.id === selectedTopicId)) {
        setSelectedTopicId(newTopics[0].id);
      }
    }
    const newBooks = booksFor(newGrade, writingType);
    if (!newBooks.find((b) => b.id === selectedBookId)) {
      setSelectedBookId(newBooks[0]?.id ?? null);
    }
  }

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        onSubmit({ studentText: text, writingType, gradeBand, topicTitle });
      }}
    >
      {/* 설정 줄 */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-ink/20 pb-5">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
            Grade · 학년
          </span>
          <select
            className="border-b-2 border-ink bg-transparent pb-1 text-base font-extrabold tracking-tight outline-none"
            value={gradeBand}
            onChange={(e) => handleGradeBandChange(e.target.value as GradeBand)}
          >
            <option value="4">4학년</option>
            <option value="5">5학년</option>
            <option value="6">6학년</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
            Genre · 글의 종류
          </span>
          <select
            className="border-b-2 border-ink bg-transparent pb-1 text-base font-extrabold tracking-tight outline-none"
            value={writingType}
            onChange={(e) => handleWritingTypeChange(e.target.value as WritingType)}
          >
            {WRITING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 글감 / 추천도서 탭 */}
      <div className="mt-8 flex gap-8 border-b-2 border-ink text-sm">
        <button
          type="button"
          onClick={() => setSourceKind("topic")}
          className={`-mb-0.5 pb-3 transition ${
            source === "topic"
              ? "border-b-4 border-ink font-black text-ink"
              : "text-ink/40"
          }`}
        >
          글감으로 쓰기
        </button>
        {hasBooks && (
          <button
            type="button"
            onClick={() => setSourceKind("book")}
            className={`-mb-0.5 pb-3 transition ${
              source === "book"
                ? "border-b-4 border-ink font-black text-ink"
                : "text-ink/40"
            }`}
          >
            추천도서로 쓰기
          </button>
        )}
      </div>

      {!hasBooks && writingType === "감상문" && (
        <p className="mt-4 break-keep text-xs leading-6 text-ink/45">
          감상문은 책이 아니라 영화·공연·전시처럼 직접 보고 겪은 것을 다루는 글이에요.
          책을 읽고 쓰려면 글의 종류를 &lsquo;독후감&rsquo;으로 바꿔보세요.
        </p>
      )}

      {source === "topic" ? (
        <>
          <ul>
            {topics.map((topic, i) => {
              const selected = selectedTopicId === topic.id;
              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`flex w-full items-start gap-5 border-b border-ink/15 py-5 text-left transition ${
                      selected ? "bg-ink/[0.04]" : "hover:bg-ink/[0.02]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 px-2 py-1 text-[11px] font-bold tracking-widest ${
                        selected ? "bg-ink text-white" : "bg-ink/10 text-ink/50"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block break-keep text-lg leading-snug tracking-tight ${
                          selected ? "font-black text-ink" : "font-bold text-ink/80"
                        }`}
                      >
                        {topic.title}
                      </span>
                      <span className="mt-1 block break-keep text-sm text-ink/50">
                        {topic.hint}
                      </span>
                    </span>
                    {selected && (
                      <span className="mt-1 shrink-0 text-[10px] uppercase tracking-[0.2em] text-ink">
                        선택됨
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setSelectedTopicId(CUSTOM_TOPIC_ID)}
                className={`flex w-full items-start gap-5 border-b border-ink/15 py-5 text-left transition ${
                  isCustom ? "bg-ink/[0.04]" : "hover:bg-ink/[0.02]"
                }`}
              >
                <span
                  className={`mt-0.5 px-2 py-1 text-[11px] font-bold tracking-widest ${
                    isCustom ? "bg-ink text-white" : "bg-ink/10 text-ink/50"
                  }`}
                >
                  ＋
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block break-keep text-lg tracking-tight ${
                      isCustom ? "font-black text-ink" : "font-bold text-ink/80"
                    }`}
                  >
                    다른 주제로 직접 써보기
                  </span>
                  <span className="mt-1 block break-keep text-sm text-ink/50">
                    위 글감이 마음에 안 들면 내가 직접 주제를 정해요.
                  </span>
                </span>
              </button>
            </li>
          </ul>
          {isCustom && (
            <input
              className="mt-4 w-full border-b-2 border-ink bg-transparent pb-2 text-base outline-none placeholder:text-ink/35"
              placeholder="어떤 주제로 쓸지 짧게 적어주세요 (비워두면 자유롭게 써도 돼요)"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
          )}
        </>
      ) : (
        <>
          <p className="mt-4 text-xs text-ink/40">표지를 누르면 책 소개가 열려요.</p>
          {/* 한 줄에 2권씩 (좁은 화면에서는 1권씩) */}
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
            {books.map((book, i) => {
              const selected = selectedBookId === book.id;
              return (
                <li key={book.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBookId(book.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedBookId(book.id);
                      }
                    }}
                    className={`flex h-full cursor-pointer items-center gap-4 border-b border-ink/15 py-4 text-left transition ${
                      selected ? "bg-ink/[0.04]" : "hover:bg-ink/[0.02]"
                    }`}
                  >
                    <span
                      className={`px-2 py-1 text-[11px] font-bold tracking-widest ${
                        selected ? "bg-ink text-white" : "bg-ink/10 text-ink/50"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <BookInfoPopover book={book}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={book.coverUrl}
                        alt={`${book.title} 표지 (누르면 책 소개가 열려요)`}
                        className={`h-20 w-14 shrink-0 border border-ink/10 object-cover transition ${
                          selected ? "" : "grayscale"
                        }`}
                      />
                    </BookInfoPopover>
                    <div className="min-w-0 flex-1">
                      <p className="break-keep text-base font-bold leading-snug tracking-tight text-ink">
                        『{book.title}』
                      </p>
                      <p className="mt-1 text-sm text-ink/50">{book.author}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {selectedBook && (
            <div className="mt-5 border-l-4 border-ink pl-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
                Example · 글자국 남기기 예시
              </p>
              {bookGuide && bookGuide.points.length > 0 ? (
                <>
                  <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink">
                    {bookGuide.intro}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {bookGuide.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 break-keep text-sm leading-6 text-ink/75"
                      >
                        <span className="text-ink/40">—</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 break-keep text-sm leading-6 text-ink/75">
                  {bookGuide?.intro}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* 원고 */}
      <div className="mt-12">
        <div className="flex items-baseline justify-between bg-ink px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white">
            Manuscript · 원고
          </p>
          <p className="font-mono text-xs text-white/60">
            {text.length.toLocaleString()}자
          </p>
        </div>
        {/* 원고지 느낌의 괘선 배경 — 줄 간격(38px)과 line-height를 같게 맞춰 글이 줄 위에 앉는다 */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="여기에 글을 써주세요."
          style={{
            lineHeight: "38px",
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 37px, rgba(31,41,51,0.12) 37px, rgba(31,41,51,0.12) 38px)",
            backgroundAttachment: "local",
          }}
          className="min-h-[380px] w-full resize-y border-x border-b border-ink/15 bg-transparent px-3 py-1 font-heading text-lg text-ink outline-none placeholder:font-body placeholder:text-base placeholder:text-ink/30"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="break-keep text-xs text-ink/45">
          다 썼으면 선생님께 보여주고, 피드백을 본 뒤 스스로 고쳐 쓸 수 있어요.
        </p>
        <button
          type="submit"
          disabled={submitting || text.trim().length < 20}
          className="bg-ink px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "선생님이 읽고 있어요..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
