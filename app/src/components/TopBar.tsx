import { ThemeToggle } from "./ThemeToggle";
import { SoundToggle } from "./SoundToggle";
import { HomeButton } from "./HomeButton";

// Header sin contenedor: logo + botones flotando sobre el fondo, sin borde ni blur.
export function TopBar({
  onHome,
  onCuenta,
  onLock,
  nombreAlumno,
}: {
  onHome?: () => void;
  onCuenta?: () => void;
  onLock?: () => void;
  nombreAlumno?: string;
}) {
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
        <span>mepreparo</span>
        {nombreAlumno && (
          <span className="ml-2 hidden sm:inline-block rounded-full bg-sage-deep/10 px-2.5 py-0.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-sage-deep">
            Estudiante: {nombreAlumno}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        {onHome && <HomeButton onHome={onHome} />}
        {onLock && (
          <button
            type="button"
            onClick={onLock}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-clay/30 text-clay hover:bg-clay/5 transition-colors"
            title="Bloquear pantalla"
            aria-label="Bloquear pantalla"
          >
            🔒
          </button>
        )}
        {onCuenta && (
          <button
            type="button"
            onClick={onCuenta}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hair text-ink-soft transition-colors hover:text-ink"
            title="Mi Cuenta"
            aria-label="Mi Cuenta"
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
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        )}
        <SoundToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
