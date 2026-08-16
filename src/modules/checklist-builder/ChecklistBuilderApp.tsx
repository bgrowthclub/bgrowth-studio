import { ChecklistBuilder } from './ChecklistBuilder';

interface ChecklistBuilderAppProps {
  ownerEmail: string;
  /** When true, hides the brand header (Studio provides it) */
  embedded?: boolean;
}

export function ChecklistBuilderApp({ ownerEmail, embedded }: ChecklistBuilderAppProps) {
  if (embedded) {
    return (
      <div className="h-full overflow-hidden">
        <ChecklistBuilder ownerEmail={ownerEmail} />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans">
      <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="BGrowth" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-[15px] font-bold text-navy-800">BGrowth</span>
        </div>
        <span className="text-navy-200">·</span>
        <span className="text-[14px] font-semibold text-navy-600">Checklist Builder</span>
        <span className="ml-auto hidden text-xs text-navy-400 sm:block">{ownerEmail}</span>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChecklistBuilder ownerEmail={ownerEmail} />
      </div>
    </div>
  );
}
