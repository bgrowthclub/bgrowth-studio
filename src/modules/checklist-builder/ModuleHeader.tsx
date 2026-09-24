import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

export function ModuleHeader({ title, subtitle, onBack, backLabel = 'Back', actions, className }: ModuleHeaderProps) {
  return (
    <div
      className={cn(
        // Stacked (title row, then actions row) below sm so a wide actions
        // slot (e.g. two labeled buttons) never squeezes the title or
        // overflows the viewport on mobile; sm+ restores the original
        // single-row layout unchanged.
        'flex flex-col gap-3 border-b border-navy-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-navy-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">{actions}</div>}
    </div>
  );
}
