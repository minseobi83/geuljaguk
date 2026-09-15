// 시안 01 "새싹과 펜" - 연필 끝에서 새싹이 자라나는 모습.
// 로그인 화면에서는 크게, 앱 상단에서는 작게 재사용한다.
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
      viewBox="0 0 160 140"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(10,72) rotate(-28)">
        <rect x="0" y="0" width="110" height="14" rx="3" fill="var(--warn)" />
        <polygon points="110,0 128,7 110,14" fill="var(--ink)" opacity="0.75" />
        <rect x="0" y="0" width="110" height="4.5" fill="#ffffff" opacity="0.18" />
      </g>
      <g transform="translate(42,68)">
        <path
          d="M0,0 C -4,-16 2,-27 9,-36"
          fill="none"
          stroke="var(--growth)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M9,-36 C -2,-38 -13,-31 -16,-20 C -5,-22 4,-27 9,-36 Z"
          fill="var(--growth)"
        />
        <path
          d="M9,-36 C 20,-40 31,-34 34,-24 C 23,-24 14,-29 9,-36 Z"
          fill="var(--growth)"
          opacity="0.82"
        />
      </g>
    </svg>
  );
}
