"use client";

export function HomeButton({ onHome }: { onHome?: () => void }) {
  return (
    <button
      type="button"
      onClick={onHome}
      aria-label="Ir al inicio"
      title="Inicio"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-hair text-ink-soft transition-colors hover:text-ink"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    </button>
  );
}
