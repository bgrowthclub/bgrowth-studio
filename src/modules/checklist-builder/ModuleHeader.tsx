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
        // One row when everything fits; otherwise the actions wrap below the
        // title, so a wide toolbar (e.g. the Checklist Builder's) never
        // squeezes the back button and title out of view.
        'flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-white px-4 py-3.5 sm:gap-4 sm:px-6',
        className
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-3">
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
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
