import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useMedia } from "../lib/useMedia";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  toolbar?: ReactNode;
  guideTarget?: string;
}

/**
 * Point d'entrée unique des panneaux de l'atelier.
 *
 * Toujours la même surface flottante noire : ni feuille grise, ni grande
 * colonne latérale. Le contenu est scrollable lorsque nécessaire.
 * Sur écran étroit, seul le fond est modal afin de protéger les interactions.
 */
export default function Sheet({ open, onClose, title, subtitle, children, toolbar, guideTarget }: Props) {
  const wide = useMedia("(min-width: 1024px)");
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const wasOpen = useRef(false);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    const justOpened = !wasOpen.current;
    wasOpen.current = true;
    const before = document.activeElement as HTMLElement | null;
    const timeout = justOpened
      ? window.setTimeout(() => panel.current?.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')?.focus(), 50)
      : 0;
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab" && !wide) {
        const all = [...(panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        ) ?? [])].filter((el) => el.offsetParent !== null);
        const first = all[0], last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    const el = panel.current;
    el?.addEventListener("keydown", keys);
    return () => {
      window.clearTimeout(timeout);
      el?.removeEventListener("keydown", keys);
      if (justOpened) before?.focus();
    };
  }, [open, wide]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`sheet-backdrop fixed inset-0 z-40 bg-black/40 transition-opacity duration-150 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        ref={panel}
        data-guide={guideTarget}
        role="dialog"
        aria-label={title}
        aria-modal={!wide && open}
        aria-hidden={!open}
        className={`sheet pz-surface pz-panel fixed z-50 flex flex-col overflow-hidden border
          top-[124px] right-[10px] left-[10px] max-h-[calc(100dvh-138px)]
          sm:right-3 sm:left-auto sm:w-[min(368px,calc(100vw-24px))]
          lg:top-[72px] lg:max-h-[calc(100dvh-84px)]
          ${open ? "is-open" : ""}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold leading-tight tracking-[-.02em] text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-[12px] leading-snug text-white/70">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pz-chrome-icon-button grid size-10 shrink-0 place-items-center text-white/80 hover:text-white"
            aria-label="Fermer"
          ><X size={17} strokeWidth={2} /></button>
        </header>
        {toolbar && <div className="shrink-0 border-b border-white/10 px-4 py-3">{toolbar}</div>}
        <div className="pz-panel-body thin-scroll min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
      </aside>
    </>
  );
}
