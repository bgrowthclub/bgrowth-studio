import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MenuItem {
  label: string;
  description?: string;
  onSelect: () => void;
  disabled?: boolean;
}

interface MenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  className?: string;
}

/**
 * Generic anchored dropdown menu — ported from bgrowth-portal's own
 * src/components/ui/Menu.tsx (same component, same behavior, kept as a
 * separate file since the two repos can't share code without new
 * cross-repo infrastructure; see the PDF/Print unification report). No
 * existing Studio ui/ primitive covered this pattern (ConfirmDialog is a
 * centered modal, a different pattern).
 *
 * Positioning: right-anchored under its trigger, matching the trigger's
 * own width — full-width on mobile (where the trigger itself is full- or
 * fixed-width in ProductHeader/FillScreen's mobile layout) so it can't
 * overflow the viewport, fixed max-width on desktop where the trigger is
 * auto-width inside a right-aligned toolbar.
 */
export function Menu({ trigger, items, className }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 text-sm font-medium text-navy-700 transition-colors duration-150 hover:bg-navy-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        )}
      >
        {trigger}
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-navy-100 bg-white py-1.5 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}
              className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50 focus-visible:bg-navy-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{item.label}</span>
              {item.description && <span className="text-xs font-normal text-navy-400">{item.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
