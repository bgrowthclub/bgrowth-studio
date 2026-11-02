import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  /** One or two sentences: what will happen, in plain words. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// The Studio's own "are you sure?" (02/11/2026), in place of the browser's
// window.confirm — which shows the site's address and a message with no
// shape, right at the moment someone is putting a product on sale.
//
// Escape cancels, the backdrop cancels, and focus moves to the confirm
// button so the keyboard works. While `busy`, neither button acts: a double
// click must not publish twice.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h2 id="confirm-title" className="text-sm font-extrabold text-navy-900">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-navy-500">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant="primary" type="button" size="sm" disabled={busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
