import { Cloud, Printer, Download, RotateCcw } from 'lucide-react';
import { SecondaryButton } from './ui/Button';
import { Menu } from './ui/Menu';

interface ProductHeaderProps {
  title: string;
  onSave: () => void;
  onPrint: () => void;
  onPrintBlank?: () => void;
  onDownloadPdf: () => void;
  onDownloadBlankPdf?: () => void;
  onReset: () => void;
  isSaving?: boolean;
  isGeneratingPdf?: boolean;
  isGeneratingBlankPdf?: boolean;
}

/**
 * One grouped toolbar — [Save] [Print ▾] [PDF ▾] [Reset] — used at every
 * viewport width, replacing the previous two-row layout (a text-labeled
 * row hidden below `md`, an icon-only row shown only below `md` with no
 * visible text at all beyond aria-labels). That icon-only row is the
 * likely source of an earlier "unclear whether filled or blank" report on
 * mobile — this version never depends on icons alone: Print/PDF are
 * `Menu` dropdowns (src/components/ui/Menu.tsx, ported from
 * bgrowth-portal's own copy — see the PDF/Print unification report) whose
 * items always show real text plus a one-line description distinguishing
 * filled from blank, on every screen size.
 */
export function ProductHeader({
  title,
  onSave,
  onPrint,
  onPrintBlank,
  onDownloadPdf,
  onDownloadBlankPdf,
  onReset,
  isSaving,
  isGeneratingPdf,
  isGeneratingBlankPdf,
}: ProductHeaderProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <BGrowthLogo title={title} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <SecondaryButton size="sm" onClick={onSave} disabled={isSaving}>
            <Cloud className="h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </SecondaryButton>

          <Menu
            trigger={
              <>
                <Printer className="h-4 w-4" />
                Print
              </>
            }
            items={[
              { label: 'Print filled', description: 'Prints your current answers', onSelect: onPrint },
              ...(onPrintBlank
                ? [{ label: 'Print blank', description: 'Prints an empty copy to fill by hand', onSelect: onPrintBlank }]
                : []),
            ]}
          />

          <Menu
            trigger={
              <>
                <Download className="h-4 w-4" />
                {isGeneratingPdf || isGeneratingBlankPdf ? 'Preparing…' : 'PDF'}
              </>
            }
            items={[
              { label: 'Download PDF', description: 'Includes your current answers', onSelect: onDownloadPdf, disabled: isGeneratingPdf },
              ...(onDownloadBlankPdf
                ? [
                    {
                      label: 'Download blank PDF',
                      description: 'An empty copy to fill by hand',
                      onSelect: onDownloadBlankPdf,
                      disabled: isGeneratingBlankPdf,
                    },
                  ]
                : []),
            ]}
          />

          <SecondaryButton size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </SecondaryButton>
        </div>
      </div>
    </header>
  );
}

function BGrowthLogo({ title }: { title: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <img
        src="/logo.jpg"
        alt="BGrowth"
        className="h-8 w-8 rounded-lg object-cover shrink-0"
      />
      <div className="min-w-0">
        <span className="block text-[11px] font-bold leading-none tracking-widest text-brand-600 uppercase">
          BGrowth
        </span>
        <h1 className="truncate text-[13px] font-semibold leading-snug text-navy-800 max-w-[200px] sm:max-w-none sm:text-[15px]">
          {title}
        </h1>
      </div>
    </div>
  );
}
