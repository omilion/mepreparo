"use client";

export function Chip({
  label,
  pressed,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={
        "rounded-full border px-3.5 py-2 text-[13px] transition-colors " +
        (pressed
          ? "border-sage/60 text-sage-deep font-[560]"
          : "border-hair text-ink-soft hover:text-ink")
      }
    >
      {label}
    </button>
  );
}
