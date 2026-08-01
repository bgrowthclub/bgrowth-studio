import { ChevronLeft, LayoutGrid } from 'lucide-react';

interface StudioNavProps {
  activeTool?: string;
  toolName?: string;
  ownerEmail: string;
  onHome: () => void;
}

export function StudioNav({ activeTool, toolName, ownerEmail, onHome }: StudioNavProps) {
  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-navy-100 bg-white px-4 sm:px-6">
      {/* Logo */}
      <button
        type="button"
        onClick={onHome}
        className="flex items-center gap-2.5 shrink-0"
        title="BGrowth Studio home"
      >
        <img src="/logo.jpg" alt="BGrowth" className="h-8 w-8 rounded-lg object-cover" />
        <div className="hidden sm:block">
          <span className="text-[13px] font-extrabold leading-none text-navy-900">BGrowth</span>
          <span className="block text-[10px] font-semibold leading-none tracking-widest text-brand-600">
            STUDIO
          </span>
        </div>
      </button>

      {activeTool && (
        <>
          <span className="text-navy-200">/</span>
          <button
            type="button"
            onClick={onHome}
            className="flex items-center gap-1.5 text-[13px] font-medium text-navy-500 hover:text-navy-800"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Tools</span>
          </button>
          <span className="text-navy-200">/</span>
          <span className="text-[13px] font-semibold text-navy-800">{toolName}</span>
        </>
      )}

      <span className="ml-auto text-xs text-navy-400 hidden sm:block">{ownerEmail}</span>
    </header>
  );
}
