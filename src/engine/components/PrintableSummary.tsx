import { forwardRef, Fragment, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { getIcon } from '../icons';
import type { ChecklistConfig, ChecklistData, FormSectionConfig } from '../types';

interface PrintableSummaryProps {
  config: ChecklistConfig;
  data: ChecklistData;
  percent: number;
}

function isPublicLink() {
  return window.location.search.includes('template=');
}

function getCompanyInfo(config: ChecklistConfig) {
  try {
    const raw = localStorage.getItem('bgrowth.checklist-builder.settings');
    const settings = raw ? JSON.parse(raw) : null;
    return {
      name: settings?.companyName || config.brand.companyLabel || 'BGrowth',
      logo: settings?.logoUrl ?? null,
      // True only when the checklist owner actually configured their own
      // company name or logo in Settings — not just whatever companyName
      // ends up falling back to. Distinguishes "buyer genuinely
      // white-labeled this" from "no branding was ever configured", which
      // `name` alone can't do once it's fallen back to config.brand.companyLabel.
      hasCustomBranding: Boolean(settings?.companyName || settings?.logoUrl),
    };
  } catch { return { name: config.brand.companyLabel || 'BGrowth', logo: null, hasCustomBranding: false }; }
}

/** Keeps a whole block together when it's reasonably short. */
const BLOCK_STYLE: CSSProperties = { breakInside: 'avoid', pageBreakInside: 'avoid' };

/**
 * Document V1 visual language, ported from bgrowth-portal's own
 * DocumentPrintSummary.tsx (see the PDF/Print unification report for the
 * full rationale): typographic hierarchy instead of bordered/boxed
 * sections, label-above-value fields, brand-colored number/icon accents,
 * minimal hairline rules, and the same checklist DOM shape (flat sibling
 * items rather than one wrapping block) that's required for html2pdf's
 * `avoid-all` pagebreak mode not to relocate a whole section wholesale —
 * that shape is load-bearing for pagination, not a visual choice.
 *
 * Every product, including Notary, renders through the same single
 * config-driven path below — there is no per-product special case
 * anymore. A prior revision had a hardcoded Notary-only branch (its own
 * copy of every section/field label, plus a `NOTARY_OVERRIDES` lookup
 * that both reworded checklist item labels and added a "purpose" caption
 * line under each item). Both were found to have drifted from
 * `notary.config.ts` — the real, canonical product data bgrowth-portal's
 * DocumentPrintSummary.tsx already read faithfully — and neither the
 * reworded labels nor the purpose captions were ever part of what gets
 * published to Portal (`draftToConfig()`/`publishToPortal()` only ever
 * sends the plain `{id, label}` shape). Removed entirely rather than kept
 * in sync twice; see the PDF/Print unification report for the full
 * before/after evidence.
 */
export const PrintableSummary = forwardRef<HTMLDivElement, PrintableSummaryProps>(({ config, data, percent }, ref) => {
  const isBlank = !data || Object.keys(data).length === 0;
  const isPublic = isPublicLink();
  const { name: companyName, logo: logoUrl, hasCustomBranding } = getCompanyInfo(config);
  const primaryColor = config.brand.primaryColor || '#1061EC';

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  function SectionDescription({ text }: { text?: string }) {
    if (!text) return null;
    return <p className="mt-0.5 pl-[27px] text-[9.5px] text-slate-400">{text}</p>;
  }

  function FormLine({ label, value }: { label: string; value?: string }) {
    return (
      <div className="mb-2 break-words">
        <div className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-[10.5px] leading-snug text-slate-900">
          {isBlank ? <span className="text-slate-300">—</span> : value || <span className="text-slate-300">—</span>}
        </div>
      </div>
    );
  }

  function SectionHeading({ number, icon, title, optional }: { number: number; icon: string; title: string; optional?: boolean }) {
    const Icon = getIcon(icon);
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-[9.5px] font-bold tabular-nums" style={{ color: primaryColor }}>
          {String(number).padStart(2, '0')}
        </span>
        <Icon className="h-3 w-3 shrink-0 self-center" style={{ color: primaryColor }} />
        <h3 className="text-[12px] font-bold tracking-tight text-slate-900">{title}</h3>
        {optional && <span className="text-[9px] font-medium text-slate-400">(optional)</span>}
      </div>
    );
  }

  return (
    <div ref={ref} className="printable-summary mx-auto max-w-[800px] select-none bg-white p-8 font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {config.brand.companyLabel}
          </span>
          <h1 className="mt-1 text-[21px] font-bold leading-tight tracking-tight text-[#0b1d3a]">
            {config.brand.name}
          </h1>
          <div className="mt-2 h-[2px] w-10" style={{ backgroundColor: primaryColor }} />
        </div>

        {/* Branding — a public link only omits the BGrowth logo when the
            checklist owner actually configured their own company
            name/logo (genuine white-label); an unconfigured public link
            gets the same standard BGrowth logo treatment as logged-in
            Studio. See getCompanyInfo's hasCustomBranding for how "genuinely
            configured" is distinguished from companyName's own fallback. */}
        {isPublic && hasCustomBranding ? (
          <div className="text-right text-[10px] font-semibold text-slate-500">{companyName}</div>
        ) : (
          <div className="flex items-center gap-1.5">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded-lg object-cover shrink-0" />
            ) : (
              /* Official BGrowth logo asset (same file ProductHeader.tsx's on-screen
                 toolbar already uses) — not a redrawn/CSS-recreated mark. */
              <img src="/logo.jpg" alt="BGrowth" className="h-7 w-7 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex flex-col leading-none">
              <span className="text-[12.5px] font-extrabold tracking-tight text-[#0b1d3a]">{logoUrl ? companyName : 'BGrowth'}</span>
              {!logoUrl && <span className="text-[6.5px] font-semibold uppercase tracking-widest text-gray-400">Business Growth</span>}
            </div>
          </div>
        )}
      </div>

      {/* Progress / Metadata */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[10px] text-slate-500" style={BLOCK_STYLE}>
        <span>{isBlank ? 'Blank template' : 'Filled document'}</span>
        <span className="font-semibold" style={{ color: primaryColor }}>
          {isBlank ? 'Blank Form' : `${percent}% complete`}
        </span>
        <span>Generated {today}</span>
      </div>

      {/* Content — all section types render from config.sections; see the
          doc comment above for why there is no per-product special case. */}
      <div className="mt-4 flex flex-col">
        {/* Form sections — fully data-driven from config.sections for every
            product (no per-product special case). */}
        {config.sections
          .filter((sec) => sec.type === 'form')
          .map((section) => {
            const formSection = section as FormSectionConfig;
            const secData = (data[formSection.id] as Record<string, string>) || {};
            return (
              <section key={formSection.id} className={`border-t border-slate-100 pt-3 first:border-t-0 first:pt-0`} style={BLOCK_STYLE}>
                <SectionHeading number={section.number} icon={formSection.icon} title={formSection.title} optional={formSection.optional} />
                <SectionDescription text={formSection.description} />
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 pl-[27px]">
                  {formSection.fields.map((field) => {
                    const spanFull = field.fullWidth || field.type === 'textarea';
                    if (field.type === 'checkbox') {
                      const checked = !isBlank && !!secData[field.id];
                      return (
                        <div key={field.id} className={`mb-2 flex items-center gap-1.5 text-[10.5px] ${spanFull ? 'col-span-2' : ''}`}>
                          <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border border-slate-300">
                            {checked && <Check className="h-2 w-2" strokeWidth={4} />}
                          </span>
                          <span className="text-slate-800">{field.placeholder || field.label}</span>
                        </div>
                      );
                    }
                    if (field.type === 'image' || field.type === 'static_image') {
                      const imgValue = field.type === 'static_image' ? field.staticImageUrl : isBlank ? undefined : secData[field.id];
                      return (
                        <div key={field.id} className={`mb-2 flex flex-col gap-1 text-[10.5px] ${spanFull ? 'col-span-2' : ''}`}>
                          <span className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">
                            {field.label || (field.type === 'static_image' ? 'Reference Image' : '')}
                          </span>
                          {imgValue ? (
                            <img src={imgValue} alt={field.label} className="max-h-[80px] max-w-[150px] self-start rounded border border-slate-100 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[9.5px] italic text-slate-300">No photo attached</span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={field.id} className={spanFull ? 'col-span-2' : ''}>
                        <FormLine label={field.label} value={secData[field.id]} />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

        {/* Checklist sections — flat sibling items (heading + first item grouped, rest as
            individual flow siblings). See the pagination doc comment above: this shape,
            not CSS alone, is what keeps html2pdf's avoid-all mode from relocating a whole
            section wholesale onto a near-empty trailing page. */}
        {config.sections
            .filter((sec) => sec.type === 'checklist')
            .map((section) => {
              if (section.type !== 'checklist') return null;
              const secValues = (data[section.id] as Record<string, boolean>) || {};
              const [firstItem, ...restItems] = section.items;
              return (
                <Fragment key={section.id}>
                  <div className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0" style={BLOCK_STYLE}>
                    <SectionHeading number={section.number} icon={section.icon} title={section.title} optional={section.optional} />
                    <SectionDescription text={section.description} />
                    {firstItem && (
                      <div className="mt-2 pl-[27px]">
                        <ChecklistRow label={firstItem.label} checked={!isBlank && !!secValues[firstItem.id]} primaryColor={primaryColor} />
                      </div>
                    )}
                  </div>
                  {restItems.map((item) => (
                    <div key={item.id} className="pl-[27px]">
                      <ChecklistRow label={item.label} checked={!isBlank && !!secValues[item.id]} primaryColor={primaryColor} />
                    </div>
                  ))}
                </Fragment>
              );
            })}

        {/* Notes */}
        {config.sections
          .filter((sec) => sec.type === 'notes')
          .map((section) => {
            const val = isBlank ? '' : (data[section.id] as string) || '';
            return (
              <section key={section.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0" style={BLOCK_STYLE}>
                <SectionHeading number={section.number} icon={section.icon} title={section.title} optional={section.optional} />
                <SectionDescription text={section.description} />
                <p className="mt-2 min-h-[14px] whitespace-pre-wrap pl-[27px] text-[10.5px] leading-relaxed text-slate-800">
                  {val || <span className="text-slate-300">No notes recorded.</span>}
                </p>
              </section>
            );
          })}

        {/* Outcome */}
        {config.sections
          .filter((sec) => sec.type === 'outcome')
          .map((section) => {
            if (section.type !== 'outcome') return null;
            const secValues = (data[section.id] as Record<string, boolean>) || {};
            return (
              <section key={section.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0" style={BLOCK_STYLE}>
                <SectionHeading number={section.number} icon={section.icon} title={section.title} optional={section.optional} />
                <SectionDescription text={section.description} />
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 pl-[27px]">
                  {(section.items || []).map((item) => (
                    <OutcomeItem key={item.id} label={item.label} checked={!isBlank && !!secValues[item.id]} primaryColor={primaryColor} />
                  ))}
                </div>
              </section>
            );
          })}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-semibold">
        <span className="uppercase tracking-tight text-slate-700">{companyName}</span>
        <span className="font-normal text-slate-400">
          Generated on {today} • {isBlank ? 'Blank Form' : `${percent}% complete`}
        </span>
      </div>
    </div>
  );
});

PrintableSummary.displayName = 'PrintableSummary';

function ChecklistRow({
  label,
  checked,
  primaryColor,
}: {
  label: string;
  checked: boolean;
  primaryColor: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1" style={BLOCK_STYLE}>
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-slate-300">
        {checked && <Check className="h-2.5 w-2.5" strokeWidth={4} style={{ color: primaryColor }} />}
      </span>
      <span className="text-[10.5px] text-slate-800">{label}</span>
    </div>
  );
}

function OutcomeItem({ label, checked, primaryColor }: { label: string; checked: boolean; primaryColor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-slate-300">
        {checked && <Check className="h-2.5 w-2.5" strokeWidth={4} style={{ color: primaryColor }} />}
      </span>
      <span className="text-[10px] font-medium text-slate-700">{label}</span>
    </div>
  );
}
