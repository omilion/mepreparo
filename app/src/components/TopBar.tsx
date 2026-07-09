import { ThemeToggle } from "./ThemeToggle";
import { SoundToggle } from "./SoundToggle";
import { HomeButton } from "./HomeButton";

// Header sin contenedor: logo + botones flotando sobre el fondo, sin borde ni blur.
export function TopBar({ onHome, onCuenta }: { onHome?: () => void; onCuenta?: () => void }) {
  return (
    <div className="mx-auto flex h-[58px] max-w-zen items-center justify-between px-[22px]">
      <div className="flex items-center gap-2.5 font-serif text-[19px]">
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
          <path
            d="M4 6.5C4 5 5 4 6.5 4H12v15H6.5C5 19 4 18 4 16.5V6.5Z"
            fill="var(--sage)"
          />
          <path
            d="M20 6.5C20 5 19 4 17.5 4H12v15h5.5C19 19 20 18 20 16.5V6.5Z"
            fill="var(--clay)"
          />
          <path d="M12 4v15" stroke="var(--paper)" strokeWidth="1.3" />
        </svg>
        mepreparo
      </div>
      <div className="flex items-center gap-2.5">
        <HomeButton onHome={onHome} />
        {onCuenta && (
          <button
            type="button"
            onClick={onCuenta}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-ink transition-colors font-mono text-[14px]"
            title="Mi Cuenta"
          >
            👤
          </button>
        )}
        <SoundToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
