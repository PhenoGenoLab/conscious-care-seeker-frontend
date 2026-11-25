type IconName =
  | "chat"
  | "search"
  | "database"
  | "send"
  | "stop"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "upload"
  | "alert"
  | "book"
  | "refresh"
  | "check"
  | "file"
  | "filter"
  | "copy";

const paths: Record<IconName, string[]> = {
  chat: [
    "M8 9h8",
    "M8 13h5",
    "M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-4 3v-3h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3z",
  ],
  search: ["M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M21 21l-6 -6"],
  database: [
    "M12 6m-8 0a8 3 0 1 0 16 0a8 3 0 1 0 -16 0",
    "M4 6v6a8 3 0 0 0 16 0v-6",
    "M4 12v6a8 3 0 0 0 16 0v-6",
  ],
  send: [
    "M10 14l11 -11",
    "M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5",
  ],
  stop: [
    "M5 5m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z",
  ],
  chevronDown: ["M6 9l6 6l6 -6"],
  chevronLeft: ["M15 6l-6 6l6 6"],
  chevronRight: ["M9 6l6 6l-6 6"],
  upload: [
    "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2",
    "M7 9l5 -5l5 5",
    "M12 4l0 12",
  ],
  alert: [
    "M12 9v4",
    "M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z",
    "M12 16h.01",
  ],
  book: [
    "M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0",
    "M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0",
    "M3 6l0 13",
    "M12 6l0 13",
    "M21 6l0 13",
  ],
  refresh: [
    "M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4",
    "M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",
  ],
  check: ["M5 12l5 5l10 -10"],
  file: [
    "M14 3v4a1 1 0 0 0 1 1h4",
    "M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z",
    "M9 13h6",
    "M9 17h4",
  ],
  copy: [
    "M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666",
    "M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1",
  ],
  filter: ["M4 6h16", "M7 12h10", "M10 18h4"],
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Brand mark: a single monitored trace, drawn as artwork rather than a UI glyph. */
export function BrandMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12h3l2.2 -5.5 3.6 11 2.2 -5.5h7" />
    </svg>
  );
}

export type { IconName };
