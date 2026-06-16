"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Disables both buttons + shows "Working…" while a parent transition runs. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirmation modal built on the native HTML <dialog> element:
 *   - Focus trap, ESC-to-close, backdrop behaviour all come for free.
 *   - Click outside (the ::backdrop) cancels.
 *   - No portal / lib needed — Next.js client component.
 *
 * Use one instance per call site. State lives in the parent.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sync the React `open` prop with the imperative <dialog> API. Using
  // showModal() (not the `open` attribute) gives us the focus trap +
  // backdrop. Calling close() emits the "cancel" event which we route to
  // onCancel via the onClose handler below.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Native <dialog> backdrop clicks bubble to the dialog itself. Detect
    // by checking the click target — if it's the dialog (not a child), it's
    // a backdrop click and we cancel.
    if (e.target === ref.current && !pending) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={handleBackdropClick}
      // Positioned via :modal selector below; reset the user-agent margin
      // and let the inner div carry styling.
      className="p-0 m-auto max-w-md w-[calc(100%-2rem)] rounded-sm border border-stone-300/60 bg-cream-50 text-charcoal-900 shadow-lg backdrop:bg-charcoal-900/40"
    >
      <div className="p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg sm:text-xl tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-charcoal-700 leading-relaxed mt-2 whitespace-pre-line">
            {description}
          </p>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 hover:text-rust-700 px-3 py-1.5 rounded-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            // autoFocus is intentional on the confirm button so ENTER
            // confirms; ESC always cancels via the dialog's native behavior.
            autoFocus
            className={`text-[11px] uppercase tracking-[0.18em] font-semibold px-4 py-2 rounded-sm border-2 transition disabled:opacity-50 ${
              destructive
                ? "bg-rust-700 border-rust-700 text-cream-50 hover:bg-rust-800 hover:border-rust-800"
                : "bg-charcoal-900 border-charcoal-900 text-cream-50 hover:bg-rust-700 hover:border-rust-700"
            }`}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
