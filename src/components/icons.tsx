import type { ReactNode } from "react";

/* آیکن‌های خطی دست‌ساز — stroke: currentColor */
const PATHS: Record<string, ReactNode> = {
  wallet: (
    <>
      <path d="M4 8.2h13.4a2.1 2.1 0 0 1 2.1 2.1v6a2.1 2.1 0 0 1-2.1 2.1H6.1A2.1 2.1 0 0 1 4 16.3V8.2Z" />
      <path d="M4 8.2V7.4A2.4 2.4 0 0 1 6.4 5h9.4" />
      <circle cx="15.6" cy="13.3" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  rows: (
    <>
      <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H16" />
      <circle cx="4.8" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.8" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  pie: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M12 12V3.7M12 12l7.2 4.2" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13M14 4.5 17.5 8 14 11.5" />
      <path d="M20 16H7M10 12.5 6.5 16l3.5 3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.8" y="5.2" width="16.4" height="15" rx="2.2" />
      <path d="M3.8 10h16.4M8.3 3v4M15.7 3v4" />
      <circle cx="8.3" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 4v16h17" />
      <path d="M7.5 16.5v-5M12 16.5V7M16.5 16.5v-7.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17.8 7H20M4 12h3M11.8 12H20M4 17h11M19.8 17H20" />
      <circle cx="15.4" cy="7" r="2" />
      <circle cx="9.4" cy="12" r="2" />
      <circle cx="17.4" cy="17" r="2" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9" />
    </>
  ),
  mic: (
    <>
      <rect x="9.4" y="3" width="5.2" height="10" rx="2.6" />
      <path d="M6 11.5a6 6 0 0 0 12 0M12 17.6V21M9 21h6" />
    </>
  ),
  cloud: (
    <>
      <path d="M7.2 18.2a4.4 4.4 0 1 1 .7-8.7A6 6 0 0 1 19.6 11a3.7 3.7 0 0 1-1.2 7.2H7.2Z" />
    </>
  ),
  plane: (
    <>
      <path d="M21 4 3.7 10.7l5.1 1.9 2 5.5L21 4Z" />
      <path d="m8.8 12.6 4.4-4.2" />
    </>
  ),
  undo: (
    <>
      <path d="M4 8.6h8.7a5.6 5.6 0 1 1 0 11.2H8" />
      <path d="M8 4.6 4 8.6l4 4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" />
      <path d="M15.5 5.4a3.2 3.2 0 1 1 0 5.7M17.5 14.8c1.6.7 2.7 2.2 3 4.7" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3.5 1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7 1.7-5Z" />
      <path d="m18.8 16.2.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 6.2A9.6 9.6 0 0 1 12 5.8c5.8 0 9.2 6.2 9.2 6.2a17.6 17.6 0 0 1-2.8 3.5M6.2 8.4A16.5 16.5 0 0 0 2.8 12S6.2 18.2 12 18.2c1.1 0 2.1-.2 3-.6" />
      <path d="M9.5 9.8a2.8 2.8 0 0 0 3.9 3.9" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 5.5v-.2A1.8 1.8 0 0 0 13.7 3.5H5.8a1.8 1.8 0 0 0-1.8 1.8v7.9a1.8 1.8 0 0 0 1.8 1.8h.2" />
    </>
  ),
  check: <path d="m4.5 12.6 4.8 4.9L19.5 6.5" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="m15.3 15.3 5 5" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 7.2A2.2 2.2 0 0 1 5.7 5h4l2.1 2.2h6.5a2.2 2.2 0 0 1 2.2 2.2v8.4a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2V7.2Z" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h7.5L18 8v12.5H6V3.5Z" />
      <path d="M13.5 3.5V8H18M9 12.5h6M9 16h4" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5.8" rx="7" ry="2.9" />
      <path d="M5 5.8v12.4c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V5.8" />
      <path d="M5 12c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9" />
    </>
  ),
  code: <path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5" />,
  shield: (
    <>
      <path d="m12 3 7 2.8v5.6c0 4.6-3 7.6-7 9.2-4-1.6-7-4.6-7-9.2V5.8L12 3Z" />
      <path d="m9 11.8 2.1 2.1 4-4.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 5 1.9 6.2 1.9 6.2H4.3s1.9-1.2 1.9-6.2Z" />
      <path d="M10.4 19a1.8 1.8 0 0 0 3.2 0" />
    </>
  ),
  sync: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 3.5v4h-4" />
    </>
  ),
  sheet: (
    <>
      <rect x="3.8" y="4" width="16.4" height="16" rx="2" />
      <path d="M3.8 9.3h16.4M9.3 9.3V20M3.8 14.6h16.4" />
    </>
  ),
  type: (
    <>
      <path d="M5 7V4.5h14V7M12 4.5v15M9 19.5h6" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6.4" height="6.4" rx="1" />
      <rect x="13.6" y="4" width="6.4" height="6.4" rx="1" />
      <rect x="4" y="13.6" width="6.4" height="6.4" rx="1" />
      <path d="M13.6 13.6h2.7v2.7h-2.7zM17.3 17.3H20V20h-2.7zM20 13.6h.1M13.6 20h.1" />
    </>
  ),
  bot: (
    <>
      <rect x="4.5" y="8" width="15" height="11" rx="3" />
      <path d="M12 8V4.5M12 4.5h.1" />
      <circle cx="9.2" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9.5 16.2h5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 17.5v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1.5" />
    </>
  ),
  arrow: <path d="M19 12H5.5M11 6l-5.5 6L11 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  flag: (
    <>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.8c4.5-2.4 7.5 2 12 0v8.4c-4.5 2-7.5-2.4-12 0" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="14.5" r="4.2" />
      <path d="m11.2 11.3 8-8M16.5 6l2.5 2.5M13.8 8.7l2.2 2.2" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "w-5 h-5",
  strokeWidth = 1.8,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}
