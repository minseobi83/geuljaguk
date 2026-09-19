// 브랜드 마크 "원고지 위의 글자국" — 원고지 괘선 위를 연필이 지나가며 남긴 자국.
// 자국은 왼쪽(먼저 쓴 쪽)에서 오른쪽(연필이 방금 지나온 쪽)으로 갈수록 진해진다.
// 초기화면에서는 크게, 앱 상단 띠에서는 작게 재사용한다.

// 한 화면에 마크가 여러 개 떠도 그라데이션 정의는 같은 내용이라 id를 공유해도 괜찮다.
const TRACE_GRADIENT_ID = "geuljaguk-trace";

export default function BrandMark({
  size = 96,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* 자국의 농도 변화. 선 끝이 둥글어서 실제 획은 x=6.5~49.5까지 뻗는다. */}
        <linearGradient
          id={TRACE_GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          x1="6.5"
          y1="0"
          x2="49.5"
          y2="0"
        >
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="var(--ink)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* 원고지 괘선 두 줄 */}
      <line x1="8" y1="42" x2="92" y2="42" stroke="var(--ink)" strokeWidth="2.5" opacity="0.3" />
      <line x1="8" y1="70" x2="92" y2="70" stroke="var(--ink)" strokeWidth="2.5" opacity="0.3" />

      {/* 아랫줄에 남은 자국 */}
      <path
        d="M11,70 L45,70"
        stroke={`url(#${TRACE_GRADIENT_ID})`}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* 자국의 오른쪽 끝에 놓인 연필 (팁이 원점, 몸통이 +x 방향) */}
      <g transform="translate(50,70) rotate(-42)">
        <polygon points="14,-7 0,0 14,7" fill="#C89A5B" />
        <polygon points="5.5,-2.8 0,0 5.5,2.8" fill="var(--ink)" />
        <rect x="14" y="-7" width="29" height="14" fill="var(--warn)" />
        <rect x="14" y="-7" width="29" height="3.8" fill="#ffffff" opacity="0.2" />
        <rect x="43" y="-7" width="5" height="14" fill="var(--ink)" opacity="0.55" />
        <rect x="48" y="-7" width="7" height="14" fill="#C87F6A" />
      </g>
    </svg>
  );
}
