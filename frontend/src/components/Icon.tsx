import React from "react";

export type IconName =
  | "aperture" | "arrow" | "bolt" | "check" | "chevron"
  | "clock" | "filter" | "folder" | "grid" | "play" | "refresh"
  | "search" | "sparkles" | "upload" | "wave" | "x" | "film";

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    aperture: (<><circle cx="12" cy="12" r="9" /><path d="m7.5 4.3 3.1 5.4M16.5 4.3h-6.2M21 12l-3.1-5.4M16.5 19.7l3.1-5.4M7.5 19.7h6.2M3 12l3.1 5.4" /></>),
    arrow:    <path d="M5 12h14m-5-5 5 5-5 5" />,
    bolt:     <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
    check:    <path d="m5 12 4 4L19 6" />,
    chevron:  <path d="m8 10 4 4 4-4" />,
    clock:    (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    film:     (<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18" /></>),
    filter:   <path d="M4 6h16M7 12h10M10 18h4" />,
    folder:   <path d="M3 7.5h7l2-2h9v13H3z" />,
    grid:     (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>),
    play:     <path d="m9 7 8 5-8 5z" />,
    refresh:  <path d="M4 12a8 8 0 0 1 14.93-3M20 12a8 8 0 0 1-14.93 3M4 12V8m0 4H8M20 12v4m0-4h-4" />,
    search:   (<><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>),
    sparkles: (<><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7zM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8z" /></>),
    upload:   (<><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M5 15v5h14v-5" /></>),
    wave:     <path d="M3 12h2l2-7 3 14 3-11 2 7 2-3h4" />,
    x:        <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
