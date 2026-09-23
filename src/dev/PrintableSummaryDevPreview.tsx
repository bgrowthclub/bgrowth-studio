import { useRef, useState } from 'react';
import { PrintableSummary } from '../engine/components/PrintableSummary';
import { ProductHeader } from '../components/ProductHeader';
import { useProgress } from '../engine/useProgress';
import { downloadElementAsPdf } from '../lib/pdf';
import { notaryConfig } from '../configs/notary.config';
import { notaryDataPopulated } from './fixtures/notaryDataPopulated';
import { notaryDataEmpty } from './fixtures/notaryDataEmpty';
import { notaryDataLong } from './fixtures/notaryDataLong';
import type { ChecklistData } from '../engine/types';

type Scenario = 'populated' | 'empty' | 'long';

const SCENARIOS: Record<Scenario, { label: string; data: ChecklistData }> = {
  populated: { label: 'Populated', data: notaryDataPopulated },
  empty: { label: 'Mostly Empty', data: notaryDataEmpty },
  long: { label: 'Long Content', data: notaryDataLong },
};

/**
 * Isolated, dev-only preview for the redesigned PrintableSummary + the real
 * ProductHeader/Menu toolbar (see ../../dev-preview.html — a separate Vite
 * HTML entry point, not linked from index.html and not part of the
 * production build's rollupOptions.input, so this harness's code never
 * ships to production and can never be reached in production).
 *
 * Renders Studio's own real notaryConfig (src/configs/notary.config.ts)
 * through the real PrintableSummary against three fixtures — populated,
 * mostly empty, and long-form — via the real ProductHeader component
 * (Save/Print▾/PDF▾/Reset), wired to the same downloadElementAsPdf/print
 * pipeline FillScreen.tsx and the public App.tsx use, so both the layout
 * and the toolbar can be validated without a live GAS backend. Mirrors
 * bgrowth-portal's DocumentV1PreviewPage.tsx pattern (see the PDF/Print
 * unification report) — same fixture values, so the two repos' output can
 * be visually compared against the same underlying data.
 */
export function PrintableSummaryDevPreview() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('scenario');
  const initialScenario: Scenario = requested === 'empty' || requested === 'long' ? requested : 'populated';

  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [isRenderBlank, setIsRenderBlank] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingBlankPdf, setIsGeneratingBlankPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const { data } = SCENARIOS[scenario];
  const progress = useProgress(notaryConfig, data);
  const effectiveData = isRenderBlank ? {} : data;
  const effectivePercent = isRenderBlank ? 0 : progress.percent;

  // Temporary, dev-only: ?margin=t,l,b,r overrides the PDF margin for pagination
  // tuning. Falls back to the production value when absent/malformed.
  const marginParam = params.get('margin');
  const margin = (marginParam?.split(',').map(Number).filter((n) => !Number.isNaN(n)).length === 4
    ? (marginParam!.split(',').map(Number) as [number, number, number, number])
    : [7, 10, 7, 10]) as [number, number, number, number];

  const handlePrintBlank = () => {
    setIsRenderBlank(true);
    setTimeout(() => {
      const handleAfterPrint = () => {
        setIsRenderBlank(false);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    }, 250);
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf(printableRef.current, `preview-${scenario}-filled.pdf`, {
        pagebreakMode: ['css', 'legacy'],
        margin,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadBlankPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingBlankPdf(true);
    setIsRenderBlank(true);
    setTimeout(async () => {
      try {
        await downloadElementAsPdf(printableRef.current!, `preview-${scenario}-blank.pdf`, {
          pagebreakMode: ['css', 'legacy'],
          margin: [7, 10, 7, 10],
        });
      } finally {
        setIsRenderBlank(false);
        setIsGeneratingBlankPdf(false);
      }
    }, 250);
  };

  return (
    <div>
      <div className="no-print flex flex-col gap-1 border-b border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-800">
        <strong>PrintableSummary + ProductHeader dev preview</strong> — isolated test harness using fixture data, not
        a real product or saved instance. ProductHeader/Menu and PrintableSummary below are the exact same
        components FillScreen.tsx and App.tsx's public link render; only the data is fake.
        <div className="mt-1 flex gap-2">
          {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setScenario(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                scenario === key ? 'bg-brand-500 text-white' : 'border border-navy-100 bg-white text-navy-700 hover:bg-navy-50'
              }`}
            >
              {SCENARIOS[key].label}
            </button>
          ))}
        </div>
      </div>

      <ProductHeader
        title={notaryConfig.brand.name}
        onSave={() => {}}
        onPrint={() => window.print()}
        onPrintBlank={handlePrintBlank}
        onDownloadPdf={handleDownloadPdf}
        onDownloadBlankPdf={handleDownloadBlankPdf}
        onReset={() => {}}
        isGeneratingPdf={isGeneratingPdf}
        isGeneratingBlankPdf={isGeneratingBlankPdf}
      />

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="border border-dashed border-navy-100">
          <PrintableSummary ref={printableRef} config={notaryConfig} data={effectiveData} percent={effectivePercent} />
        </div>
      </div>
    </div>
  );
}
