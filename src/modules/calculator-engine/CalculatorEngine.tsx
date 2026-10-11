import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Printer, Download, History, Plus, StickyNote, Calculator, TrendingUp, DollarSign, Clock, BarChart2, Star, Trash2, ChevronRight, UploadCloud } from 'lucide-react';
import { CalcField } from './components/CalcField';
import { ResultsPanel } from './components/ResultsPanel';
import { DonutChart } from './components/DonutChart';
import { gasGetCalculators, gasSaveCalculators } from '../../lib/studioSync';
import { CalculatorBuilder } from './builder/CalculatorBuilder';
import { CalcProgressBar } from './components/CalcProgressBar';
import { PublishCalculatorDialog } from './components/PublishCalculatorDialog';
import { computeAll, calcCompletion, buildDefaultValues, formatResult } from './formulaEngine';
import { applyBrandTheme } from '../../engine/theme';
import { Toast } from '../../components/Toast';
import { cleaningPricingCalc } from './configs/cleaningPricing';
import { mileageDeductionCalc } from './configs/mileageDeduction';
import { roiCalc } from './configs/roi';
import { notaryFeeCalc } from './configs/notaryFee';
import { pressureWashingCalc } from './configs/pressureWashing';
import { lawnCareCalc } from './configs/lawnCare';
import { taxEstimatorCalc } from './configs/taxEstimator';
import { hourlyRateCalc } from './configs/hourlyRate';
import { startupCostCalc } from './configs/startupCost';
import { breakEvenCalc } from './configs/breakEven';
import { mortgageCalc } from './configs/mortgage';
import { commissionCalc } from './configs/commission';
import { businessProfitCalc } from './configs/businessProfit';
import { loanProfitCalc } from './configs/loanProfit';
import type { CalculatorConfig, CalculatorValues } from './types';
import { cn } from '../../lib/utils';

// -----------------------------------------------------------------------
// Available calculators (add new configs here)
// -----------------------------------------------------------------------
const CALCULATORS: CalculatorConfig[] = [
  cleaningPricingCalc,
  mileageDeductionCalc,
  roiCalc,
  notaryFeeCalc,
  pressureWashingCalc,
  lawnCareCalc,
  taxEstimatorCalc,
  hourlyRateCalc,
  startupCostCalc,
  breakEvenCalc,
  mortgageCalc,
  commissionCalc,
  businessProfitCalc,
  loanProfitCalc,
];

const STORAGE_KEY = 'bgrowth.studio.calculator.values';

function loadValues(productId: string): CalculatorValues | null {
  try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}.${productId}`) ?? 'null'); } catch { return null; }
}
function saveValues(productId: string, values: CalculatorValues) {
  try { localStorage.setItem(`${STORAGE_KEY}.${productId}`, JSON.stringify(values)); } catch { /* */ }
}
function clearValues(productId: string) {
  try { localStorage.removeItem(`${STORAGE_KEY}.${productId}`); } catch { /* */ }
}

// -----------------------------------------------------------------------
// Single calculator view
// -----------------------------------------------------------------------
interface CalcViewProps {
  config: CalculatorConfig;
  onBack: () => void;
}

function CalcView({ config, onBack }: CalcViewProps) {
  const [values, setValues] = useState<CalculatorValues>(
    () => loadValues(config.productId) ?? buildDefaultValues(config)
  );
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = computeAll(config, values);
  const completion = calcCompletion(config, values);

  useEffect(() => {
    applyBrandTheme(config.primaryColor);
  }, [config.primaryColor]);

  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveValues(config.productId, values), 600);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  const showToast = useCallback((msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }, []);

  const handleChange = (id: string, val: string | number) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleReset = () => {
    clearValues(config.productId);
    setValues(buildDefaultValues(config));
    showToast('Calculator reset');
  };

  const handleSave = () => {
    saveValues(config.productId, values);
    showToast('Saved ✓');
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      html2pdf()
        .set({
          margin: 10,
          filename: `${config.name.replace(/\s+/g, '-')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(printRef.current)
        .save()
        .then(() => { setIsGeneratingPdf(false); showToast('PDF downloaded ✓'); });
    } catch {
      setIsGeneratingPdf(false);
      showToast('PDF failed — try Print instead');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="text-sm font-medium text-navy-500 hover:text-navy-800">
            ← Calculators
          </button>
          <span className="text-navy-200">/</span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-navy-900">{config.name}</p>
            <p className="hidden text-xs text-navy-400 sm:block">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
          </button>
          <button onClick={handleReset} className="flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
            <History className="h-3.5 w-3.5" /> Reset
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
            <Plus className="h-3.5 w-3.5" /> New Calculation
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center — inputs + results */}
        <div className="flex-1 overflow-y-auto bg-[#f4f6fb] p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {/* Progress bar */}
            <CalcProgressBar
              completion={completion}
              config={config}
              results={results}
              primaryColor={config.primaryColor}
            />

            {/* Sections + Results side by side on large screens */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Input sections */}
              <div className="flex flex-col gap-4">
                {config.sections.map((section) => {
                  const Icon = section.icon === 'dollar-sign' ? DollarSign : section.icon === 'map-pin' ? TrendingUp : Calculator;
                  return (
                    <div key={section.id} className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-navy-400">
                          {section.number}. {section.title.toUpperCase()}
                        </p>
                        {section.description && (
                          <p className="mt-0.5 text-sm text-navy-500">{section.description}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {section.fields.map((field) => (
                          <div key={field.id} className={cn(field.type === 'select' && section.fields.length <= 4 ? 'col-span-2 sm:col-span-1' : '')}>
                            <CalcField
                              field={field}
                              value={values[field.id] ?? field.defaultValue ?? ''}
                              onChange={handleChange}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Section total if it's the costs section */}
                      {section.id === 'costs' && (
                        <div className="mt-4 rounded-lg bg-navy-50 px-4 py-2.5">
                          <span className="text-xs text-navy-500">Total Job Cost</span>
                          <p className="text-xl font-extrabold text-brand">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(results['total_cost'] ?? 0)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Results */}
              <div className="flex flex-col gap-4">
                <ResultsPanel config={config} results={results} primaryColor={config.primaryColor} />

                {/* Notes */}
                {config.notesEnabled && (
                  <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
                    <div className="mb-2 flex items-center gap-1.5">
                      <StickyNote className="h-4 w-4 text-navy-400" />
                      <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Notes</p>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Add your notes here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={500}
                      className="w-full resize-none rounded-lg border border-navy-100 p-2.5 text-sm text-navy-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                    <p className="mt-1 text-right text-xs text-navy-300">{notes.length} / 500</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — charts + quick calcs */}
        <div className="hidden w-64 shrink-0 overflow-y-auto border-l border-navy-100 bg-white p-4 xl:flex xl:flex-col xl:gap-4">
          {/* Charts */}
          {(config.charts ?? []).map((chart) => {
            const slices = chart.slices.map((s) => ({
              label: s.label,
              value: results[s.formulaId] ?? 0,
              color: s.color,
            }));
            return <DonutChart key={chart.id} title={chart.title} slices={slices} />;
          })}

          {/* Quick calculations */}
          {(config.quickCalcs ?? []).length > 0 && (
            <div className="rounded-xl border border-navy-100 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-400">Quick Calculations</p>
              <div className="flex flex-col gap-2">
                {(config.quickCalcs ?? []).map((qc) => (
                  <div key={qc.label} className="flex items-center justify-between border-b border-navy-50 pb-1.5 last:border-0">
                    <span className="text-xs text-navy-500">{qc.label}</span>
                    <span className="text-xs font-semibold text-navy-800">
                      {formatResult(results[qc.formulaId] ?? 0, qc.type, qc.prefix, qc.suffix)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden printable PDF content */}
      <div ref={printRef} className="printable-summary" style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <div style={{ borderBottom: '3px solid ' + config.primaryColor, paddingBottom: '12px', marginBottom: '20px' }}>
          <h1 style={{ color: config.primaryColor, fontSize: '22px', margin: 0 }}>{config.name}</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>{config.subtitle}</p>
          <p style={{ color: '#94a3b8', fontSize: '11px', margin: '4px 0 0' }}>Generated: {new Date().toLocaleDateString()}</p>
        </div>
        {config.sections.map(section => (
          <div key={section.id} style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#0f172a', fontSize: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
              {section.number}. {section.title}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {section.fields.map(field => (
                  <tr key={field.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#475569', width: '50%' }}>{field.label}</td>
                    <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 'bold' }}>
                      {field.prefix}{String(values[field.id] ?? field.defaultValue ?? '')}{field.suffix}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginTop: '20px' }}>
          <h3 style={{ color: '#0f172a', fontSize: '14px', margin: '0 0 12px' }}>Results</h3>
          {config.results.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
              <span style={{ color: '#475569' }}>{r.label}</span>
              <span style={{ fontWeight: 'bold', color: r.highlight ? config.primaryColor : '#0f172a' }}>
                {formatResult(results[r.formulaId] ?? 0, r.type, r.prefix, r.suffix)}
              </span>
            </div>
          ))}
        </div>
        {notes && (
          <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '12px', color: '#475569', margin: '0 0 6px' }}>Notes</h4>
            <p style={{ fontSize: '12px', color: '#0f172a', margin: 0 }}>{notes}</p>
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginTop: '24px' }}>
          Generated by BGrowth Studio™ · bgrowth-studio.vercel.app
        </p>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

// -----------------------------------------------------------------------
// Calculator list / dashboard
// -----------------------------------------------------------------------
interface CalculatorEngineProps {
  ownerEmail: string;
  initialCalcId?: string;
}

export function CalculatorEngine({ ownerEmail, initialCalcId }: CalculatorEngineProps) {
  const [activeCalc, setActiveCalc] = useState<CalculatorConfig | null>(
    () => initialCalcId ? CALCULATORS.find(c => c.productId === initialCalcId) ?? null : null
  );
  const [showBuilder, setShowBuilder] = useState(false);
  const [publishing, setPublishing] = useState<CalculatorConfig | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [customCalcs, setCustomCalcs] = useState<CalculatorConfig[]>(() => {
    try { return JSON.parse(localStorage.getItem('bgrowth.custom.calculators') ?? '[]'); } catch { return []; }
  });

  const allCalcs = [...CALCULATORS, ...customCalcs];

  // Load custom calculators from GAS on mount
  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get('user') ?? 'benterprisesusa@gmail.com';
    gasGetCalculators(email).then(gasCalcs => {
      if (gasCalcs.length > 0) {
        setCustomCalcs(gasCalcs);
        localStorage.setItem('bgrowth.custom.calculators', JSON.stringify(gasCalcs));
      }
    });
  }, []);

  const handleCopyLink = (productId: string) => {
    const url = `${window.location.origin}/?calc=${productId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(productId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleImport = () => {
    try {
      const config = JSON.parse(importJson) as CalculatorConfig;
      if (!config.productId || !config.name || !config.sections || !config.formulas) {
        setImportError('Invalid calculator format. Make sure it has productId, name, sections and formulas.');
        return;
      }
      const updated = [...customCalcs.filter(c => c.productId !== config.productId), config];
      setCustomCalcs(updated);
      localStorage.setItem('bgrowth.custom.calculators', JSON.stringify(updated));
      const email = new URLSearchParams(window.location.search).get('user') ?? 'benterprisesusa@gmail.com';
      gasSaveCalculators(email, updated);
      setShowImport(false);
      setImportJson('');
      setImportError('');
    } catch {
      setImportError('Invalid JSON. Please check the format and try again.');
    }
  };

  if (showBuilder) {
    return <CalculatorBuilder onBack={() => setShowBuilder(false)} />;
  }

  if (activeCalc) {
    return <CalcView config={activeCalc} onBack={() => setActiveCalc(null)} />;
  }

  return (
    <div className="flex h-full overflow-hidden">
      {publishing && <PublishCalculatorDialog config={publishing} ownerEmail={ownerEmail} onClose={() => setPublishing(null)} />}
      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-navy-900">Import Calculator</h2>
            <p className="mb-4 text-sm text-navy-400">Paste the calculator JSON config below.</p>
            <textarea
              rows={12}
              value={importJson}
              onChange={(e) => { setImportJson(e.target.value); setImportError(''); }}
              placeholder={'{\n  "productId": "my-calculator",\n  "name": "My Calculator",\n  ...\n}'}
              className="w-full resize-none rounded-xl border border-navy-100 p-3 font-mono text-xs text-navy-700 focus:border-brand focus:outline-none"
            />
            {importError && <p className="mt-2 text-xs text-red-500">{importError}</p>}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => { setShowImport(false); setImportJson(''); setImportError(''); }}
                className="flex-1 rounded-xl border border-navy-200 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50">
                Cancel
              </button>
              <button type="button" onClick={handleImport} disabled={!importJson.trim()}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                Add to Studio
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-navy-100 bg-white">
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400">Calculators</p>
        </div>
        {[
          { icon: <Calculator className="h-4 w-4" />, label: 'My Calculations', active: true },
          { icon: <BarChart2 className="h-4 w-4" />, label: 'Templates' },
          { icon: <Star className="h-4 w-4" />, label: 'Favorites' },
          { icon: <History className="h-4 w-4" />, label: 'Recent' },
          { icon: <Trash2 className="h-4 w-4" />, label: 'Trash' },
        ].map((item) => (
          <button key={item.label} type="button" className={cn('flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors', item.active ? 'border-l-2 border-brand bg-brand-50 text-brand-700' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800')}>
            {item.icon} {item.label}
          </button>
        ))}

        <div className="mt-4 border-t border-navy-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400">Categories</p>
        </div>
        {['Pricing Calculators', 'Profit Calculators', 'Cost Calculators', 'Time Calculators', 'Investment Calculators', 'Other Calculators'].map((cat) => (
          <button key={cat} type="button" className="px-4 py-2 text-left text-sm text-navy-500 hover:bg-navy-50 hover:text-navy-800">
            {cat}
          </button>
        ))}

        <div className="mx-3 mt-auto mb-4 rounded-xl border border-brand-100 bg-brand-50 p-3">
          <p className="text-xs font-semibold text-navy-800">Need Help?</p>
          <p className="mt-1 text-[11px] text-navy-500">Learn how to use this calculator and get accurate results.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-navy-100 bg-white px-6 py-3">
          <div>
            <h1 className="text-xl font-bold text-navy-900">Calculator Engine</h1>
            <p className="text-sm text-navy-400">Calculate. Analyze. Price. Profit.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50"
              onClick={() => setShowImport(true)}>
              <Plus className="h-4 w-4" /> Import JSON
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600" onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4" /> New Calculator
            </button>
          </div>
        </div>

        {/* Grid of calculators */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="mb-1 text-2xl font-extrabold text-navy-900">My Calculators</h2>
          <p className="mb-6 text-sm text-navy-400">Choose a calculator to get started.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allCalcs.map((calc) => (
              <div
                key={calc.productId}
                className="group flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition-all hover:shadow-cardHover"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: calc.primaryColor }}
                  >
                    <Calculator className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-navy-900">{calc.name}</p>
                    <p className="text-[11px] text-navy-400">{calc.category}</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-navy-500 line-clamp-2">{calc.subtitle}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCalc(calc)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                  >
                    Open <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishing(calc)}
                    title="Publish to bgrowth.app"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-brand hover:text-brand"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(calc.productId)}
                    title="Copy public link"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-brand hover:text-brand"
                  >
                    {copiedId === calc.productId
                      ? <span className="text-[9px] font-bold text-emerald-500">✓</span>
                      : <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCalc(calc)}
                    title="Edit calculator"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-brand hover:text-brand"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete "${calc.name}"?`)) alert('Built-in calculators cannot be deleted.'); }}
                    title="Delete calculator"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-100 text-navy-400 hover:border-red-200 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
