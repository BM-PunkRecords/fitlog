/**
 * Reicon (MIT) 아이콘을 앱 내부 컴포넌트로 옮겨 담은 모음.
 *
 * 런타임 패키지를 추가하지 않고 필요한 아이콘의 마크업만 인라인으로 가져온다
 * (PWA 초기 JS를 늘리지 않기 위한 기존 방침 — `ActionButton`이 SEED recipe를
 * 네이티브 엘리먼트에 매핑한 것과 같은 접근). 색은 항상 `currentColor`라
 * 버튼의 색 상태(hover/disabled)를 그대로 따라간다.
 *
 * 출처: https://reicon.dev — Outline weight, viewBox 24×24.
 */

interface IconProps {
  size?: number
  className?: string
}

/** 두 화살표가 순환 — 이 항목을 다른 것으로 교체한다. */
export function ReplaceIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        d="M12.001 21.25C16.4752 21.25 20.2089 18.0726 21.0659 13.8508C21.1483 13.4449 21.5442 13.1826 21.9501 13.265C22.3561 13.3474 22.6184 13.7433 22.5359 14.1492C21.5399 19.0563 17.2026 22.75 12.001 22.75C8.06397 22.75 4.62259 20.6338 2.75 17.4785L2.75 20C2.75 20.4142 2.41421 20.75 2 20.75C1.58579 20.75 1.25 20.4142 1.25 20L1.25 15.5C1.25 15.0858 1.58579 14.75 2 14.75H2.61301C2.62468 14.7497 2.63633 14.7497 2.64795 14.75H6.5C6.91421 14.75 7.25 15.0858 7.25 15.5C7.25 15.9142 6.91421 16.25 6.5 16.25H3.78276C5.32242 19.2211 8.42553 21.25 12.001 21.25Z"
        fill="currentColor"
      />
      <path
        d="M2.93492 10.1492C3.79191 5.92737 7.52568 2.75 11.9999 2.75C15.5753 2.75 18.6784 4.77887 20.2181 7.75L17.5004 7.75C17.0862 7.75 16.7504 8.08579 16.7504 8.5C16.7504 8.91421 17.0862 9.25 17.5004 9.25L21.353 9.25C21.3645 9.25027 21.3762 9.25027 21.3878 9.25H22.0009C22.1998 9.25 22.3906 9.17097 22.5312 9.0303C22.6719 8.88963 22.7509 8.69884 22.7509 8.49992L22.7504 3.99992C22.7503 3.5857 22.4145 3.24996 22.0003 3.25C21.5861 3.25004 21.2503 3.58587 21.2504 4.00008L21.2506 6.52113C19.378 3.36599 15.9367 1.25 11.9999 1.25C6.79825 1.25 2.461 4.94367 1.46491 9.8508C1.3825 10.2567 1.64478 10.6526 2.05072 10.735C2.45665 10.8174 2.85252 10.5551 2.93492 10.1492Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** 원 안의 i — 시연 미디어 위에 얹어 "누르면 정보"를 알린다. */
export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        d="M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z"
        fill="currentColor"
      />
      <path
        d="M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <g transform="scale(1.33333)">
        <polyline
          points="11.5 15.25 5.25 9 11.5 2.75"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  )
}

export function ChevronRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <g transform="scale(1.33333)">
        <polyline
          points="6.5 2.75 12.75 9 6.5 15.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  )
}

/** 덤벨 — 시연 사진이 없을 때 자리 표시로 쓴다. */
export function DumbbellIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3M6.5 12h11" />
      </g>
    </svg>
  )
}
