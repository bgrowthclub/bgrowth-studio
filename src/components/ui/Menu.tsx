import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

/** Minimum gap kept between the menu panel and either viewport edge. */
const VIEWPORT_MARGIN = 8;

/**
 * Generic anchored dropdown menu — ported from bgrowth-portal's own
 * src/components/ui/Menu.tsx (same component, same behavior, kept as a
 * separate file since the two repos can't share code without new
 * cross-repo infrastructure; see the PDF/Print unification report). No
 * existing Studio ui/ primitive covered this pattern (ConfirmDialog is a
 * centered modal, a different pattern).
 *
 * Positioning: computed from the trigger's real bounding rect on open (see
 * useLayoutEffect below), not CSS `absolute right-0`. That CSS-only
 * approach anchored the panel's right edge to the trigger's right edge and
 * let it extend left by its full width regardless of how much room
 * actually existed there; a trigger that isn't the last item in a
 * multi-button toolbar (e.g. "Print" ahead of "PDF"/"Reset") could then
 * open a panel whose left edge falls off-screen on a narrow phone — not
 * just visually cramped, genuinely outside the viewport (see the mobile
 * dropdown clipping report). The computed position defaults to that same
 * right-aligned-under-trigger placement (unchanged desktop appearance,
 * where there's already room to the left) and only shifts left/right as
 * needed to keep the whole panel within VIEWPORT_MARGIN of both edges.
 * Math is done in viewport coordinates but assigned as `position:
 * absolute` relative to rootRef (see the comment in useLayoutEffect for
 * why, not `position: fixed`).
 */
export function Menu({ trigger, items, className }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
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

  // Runs synchronously after the menu mounts but before the browser paints
  // (unlike useEffect), so the panel never flashes at an unpositioned
  // location. Re-measures on resize/scroll while open so the panel stays
  // correctly placed (and correctly clamped) through viewport or layout
  // changes, e.g. a phone rotation while the menu is open.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const root = rootRef.current;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!root || !trigger || !menu) return;

    function position() {
      const rootRect = root!.getBoundingClientRect();
      const triggerRect = trigger!.getBoundingClientRect();
      const menuRect = menu!.getBoundingClientRect();
      // Default: same right-aligned-under-trigger placement the old
      // `absolute right-0` gave desktop — unchanged there, since desktop's
      // right-aligned toolbar already leaves room to the left.
      let left = triggerRect.right - menuRect.width;
      const maxLeft = window.innerWidth - VIEWPORT_MARGIN - menuRect.width;
      const minLeft = VIEWPORT_MARGIN;
      left = Math.min(left, maxLeft);
      left = Math.max(left, minLeft);
      // The panel's `position: absolute` is a static class (not set here)
      // specifically so it's out of normal flow from its very first paint —
      // otherwise this same rootRect read, taken before this function's
      // own setMenuStyle call ever applies, would include the panel's
      // full width as an in-flow sibling of the trigger, corrupting rootRef's
      // own box (observed: rootRef measuring 256px wide instead of the
      // trigger's ~100px on the very first open).
      //
      // `absolute` resolves against rootRef (its nearest `position:
      // relative` ancestor) — not raw viewport coordinates — so the
      // viewport-space value above is converted to an offset from rootRef's
      // own box before being assigned. `position: fixed` would look
      // simpler, but any ancestor with backdrop-filter/filter/transform/
      // will-change/contain (e.g. ProductHeader's own `backdrop-blur`)
      // becomes the containing block for fixed descendants per spec,
      // silently breaking viewport-relative math there. Anchoring to
      // rootRef sidesteps that entirely — its own `position: relative`
      // always wins as the nearest containing block regardless of what any
      // ancestor above it does.
      setMenuStyle({
        left: left - rootRect.left,
        top: triggerRect.bottom + 6 - rootRect.top,
      });
    }

    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
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
          ref={menuRef}
          id={menuId}
          role="menu"
          style={menuStyle}
          className="absolute z-40 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-navy-100 bg-white py-1.5 shadow-lg"
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
