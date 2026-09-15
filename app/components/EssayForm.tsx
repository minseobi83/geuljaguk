"use client";

import { useState } from "react";
import { GradeBand, WritingType } from "@/lib/types";
import { WRITING_TOPICS } from "@/lib/topics";
import { BOOK_PROMPT_TEMPLATES, booksForGrade } from "@/lib/books";

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

function findInitialTopicId(writingType: WritingType, topicTitle?: string): string {
  if (!topicTitle) return WRITING_TOPICS[writingType][0].id;
  const matched = WRITING_TOPICS[writingType].find((t) => t.title === topicTitle);
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
    findInitialTopicId(initialWritingType, initialTopicTitle)
  );
  const [customTopic, setCustomTopic] = useState(
    findInitialTopicId(initialWritingType, initialTopicTitle) === CUSTOM_TOPIC_ID
      ? initialTopicTitle ?? ""
      : ""
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(
    booksForGrade(initialGradeBand)[0]?.id ?? null
  );

  const topics = WRITING_TOPICS[writingType];
  const books = booksForGrade(gradeBand);
  const isCustom = selectedTopicId === CUSTOM_TOPIC_ID;
  const selectedBook = books.find((b) => b.id === selectedBookId);

  const topicTitle =
    sourceKind === "book" && selectedBook
      ? BOOK_PROMPT_TEMPLATES[writingType](selectedBook.title)
      : isCustom
      ? customTopic.trim() || undefined
      : topics.find((t) => t.id === selectedTopicId)?.title;

  function handleWritingTypeChange(newType: WritingType) {
    setWritingType(newType);
    // 글의 종류가 바뀌면 그 종류에 맞는 글감 목록으로 다시 골라야 하니 첫 번째 글감으로 초기화.
    // (추천도서를 고른 상태라면 책은 그대로 두고, 그 책에 맞는 새 유형별 과제만 자동으로 바뀐다.)
    setSelectedTopicId(WRITING_TOPICS[newType][0].id);
    setCustomTopic("");
  }

  function handleGradeBandChange(newGrade: GradeBand) {
    setGradeBand(newGrade);
    const newBooks = booksForGrade(newGrade);
    if (!newBooks.find((b) => b.id === selectedBookId)) {
      setSelectedBookId(newBooks[0]?.id ?? null);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        onSubmit({ studentText: text, writingType, gradeBand, topicTitle });
      }}
    >
      <div className="flex gap-3">
        <label className="flex flex-col text-sm text-ink/70">
          학년
          <select
            className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
            value={gradeBand}
            onChange={(e) => handleGradeBandChange(e.target.value as GradeBand)}
          >
            <option value="4">4학년</option>
            <option value="5">5학년</option>
            <option value="6">6학년</option>
          </select>
        </label>
        <label className="flex flex-col text-sm text-ink/70">
          글의 종류
          <select
            className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
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

      <div>
        <div className="mb-2 flex gap-1 rounded-full border border-ink/15 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setSourceKind("topic")}
            className={`flex-1 rounded-full py-1.5 ${
              sourceKind === "topic" ? "bg-accent text-white" : "text-ink/60"
            }`}
          >
            글감으로 쓰기
          </button>
          <button
            type="button"
            onClick={() => setSourceKind("book")}
            className={`flex-1 rounded-full py-1.5 ${
              sourceKind === "book" ? "bg-growth text-white" : "text-ink/60"
            }`}
          >
            추천도서로 쓰기
          </button>
        </div>

        {sourceKind === "topic" ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    selectedTopicId === topic.id
                      ? "border-accent bg-accent/5"
                      : "border-ink/15 bg-white"
                  }`}
                >
                  <p className="font-medium">{topic.title}</p>
                  <p className="mt-1 text-xs text-ink/50">{topic.hint}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedTopicId(CUSTOM_TOPIC_ID)}
                className={`rounded-lg border p-3 text-left transition ${
                  isCustom ? "border-accent bg-accent/5" : "border-ink/15 bg-white"
                }`}
              >
                <p className="font-medium">다른 주제로 직접 써보기</p>
                <p className="mt-1 text-xs text-ink/50">
                  위 글감이 마음에 안 들면 내가 직접 주제를 정해요.
                </p>
              </button>
            </div>
            {isCustom && (
              <input
                className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2"
                placeholder="어떤 주제로 쓸지 짧게 적어주세요 (비워두면 자유롭게 써도 돼요)"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            )}
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink/50">
              {gradeBand}학년 추천도서예요. 책을 고르면 지금 고른 글의 종류에 맞는 과제로
              바뀌어요.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBookId(book.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    selectedBookId === book.id
                      ? "border-growth bg-growth/5"
                      : "border-ink/15 bg-white"
                  }`}
                >
                  <p className="font-medium">『{book.title}』</p>
                  <p className="mt-1 text-xs text-ink/50">{book.author}</p>
                </button>
              ))}
            </div>
            {selectedBook && (
              <p className="mt-2 rounded-md bg-growth/5 p-3 text-sm text-growth">
                {BOOK_PROMPT_TEMPLATES[writingType](selectedBook.title)}
              </p>
            )}
          </>
        )}
      </div>

      <textarea
        className="min-h-[320px] w-full rounded-lg border border-ink/20 bg-white p-4 font-body leading-7 focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="여기에 글을 써주세요."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex items-center justify-between text-sm text-ink/50">
        <span>{text.length}자</span>
        <button
          type="submit"
          disabled={submitting || text.trim().length < 20}
          className="rounded-full bg-accent px-6 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "선생님이 읽고 있어요..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
