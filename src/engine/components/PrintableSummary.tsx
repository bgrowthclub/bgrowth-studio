import { forwardRef } from 'react';
import { Check, User, Calendar, Building2 } from 'lucide-react';
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
    };
  } catch { return { name: config.brand.companyLabel || 'BGrowth', logo: null }; }
}

// Purpose text overrides for Notary checklists matching the user's high-fidelity layout
const NOTARY_OVERRIDES: Record<string, { label: string; purpose: string }> = {
  // Section 1: Before the Appointment (beforeAppointment)
  confirmAppointment: { label: 'Confirm appointment details', purpose: 'Avoid miscommunication or missed appointments' },
  reviewDocuments: { label: 'Review documents for completeness', purpose: 'Ensure all pages and signatures are present' },
  selectCertificate: { label: 'Select correct notarial certificate', purpose: 'Match certificate to notarial act required' },
  prepareSupplies: { label: 'Prepare supplies', purpose: 'Stamp, journal, pens, ID guide ready to go' },
  clarifyPayment: { label: 'Clarify payment expectations', purpose: 'Prevent awkward conversations at signing' },

  // Section 2: During the Appointment (duringAppointment)
  verifyId: { label: 'Verify signer identity', purpose: 'Confirm identity with acceptable ID' },
  signerPresent: { label: 'Confirm signer willingness and awareness', purpose: 'Ensure no coercion or confusion' },
  correctNotarialAct: { label: 'Perform correct notarial act', purpose: 'Match act to document requirements' },
  completeCertificate: { label: 'Complete certificate accurately', purpose: 'Fill in all required certificate fields' },
  answerQuestions: { label: 'Answer signer questions', purpose: 'Provide guidance within legal boundaries' },

  // Section 3: Before Closing the Appointment (beforeClosing)
  journalEntry: { label: 'Complete journal entry', purpose: 'Record all required details per state law' },
  reviewSeal: { label: 'Review seal placement', purpose: 'Ensure seal is clear and properly placed' },
  reviewDocumentsClosing: { label: 'Check documents for errors', purpose: 'Catch missing signatures or dates' },
  returnDocuments: { label: 'Return documents to signer', purpose: 'Confirm all originals returned' },
  thankSigner: { label: 'Thank signer', purpose: 'Leave a professional lasting impression' },

  // Section 4: Professional Habits Check (professionalHabits)
  followedProcess: { label: 'Followed a clear process', purpose: 'Consistency builds trust and accuracy' },
  nothingSkipped: { label: 'No steps rushed or skipped', purpose: 'Protect yourself and the signer' },
  recordsSecured: { label: 'Records stored securely', purpose: 'Maintain confidentiality and compliance' },
  educationCompleted: { label: 'Continuing education improved', purpose: 'Stay current with laws and best practices' },
  reflectImprove: { label: 'Reflect on appointment performance', purpose: 'Identify areas for growth' },
};

export const PrintableSummary = forwardRef<HTMLDivElement, PrintableSummaryProps>(({ config, data, percent }, ref) => {
  const isNotary = config.productId === 'notary-appointment-checklist';
  // Blank mode is derived from the data itself: when the caller wants a blank
  // template (Print Blank / Blank PDF), it passes an empty object instead of
  // toggling a separate flag prop.
  const isBlank = !data || Object.keys(data).length === 0;
  const isPublic = isPublicLink();
  const { name: companyName, logo: logoUrl } = getCompanyInfo(config);

  // Format date helper
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Signer, Appointment and Agency data
  const signerData = (data.signer as Record<string, string>) || {};
  const appointmentData = (data.appointment as Record<string, string>) || {};
  const agencyData = (data.agency as Record<string, string>) || {};
  const journalData = (data.journal as Record<string, string>) || {};
  const notesValue = (data.notes as string) || '';
  const outcomeValues = (data.outcome as Record<string, boolean>) || {};

  // Form line renderer to draw perfect underlined fields (short answers)
 const FormLine = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex items-start gap-1 text-[10.5px] leading-tight" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <span className="font-semibold text-slate-800 shrink-0 mr-1">{label}:</span>
      <span className="grow border-b border-slate-300 font-medium text-slate-900 pl-1 min-h-[15px] break-words whitespace-normal">
        {isBlank ? '' : (value || '')}
      </span>
    </div>
  );

  // Dynamic field renderer for generic checklists: short answers get the
  // underline style above; long answers (paragraphs) wrap normally instead
  // of being truncated onto one line.
  const DynamicFieldLine = ({ label, value }: { label: string; value?: string }) => {
    const displayValue = isBlank ? '' : (value || '');
    const isLongLabel = label.length > 48;
    const isLong = displayValue.length > 48 || displayValue.includes('\n');

    if (isLongLabel) {
      // Informational / static-text style field: the whole paragraph lives in
      // the label itself, with no separate fillable value to show underneath.
      return (
        <div className="text-[10.5px] leading-snug whitespace-pre-wrap break-words text-slate-800 font-medium my-1" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          {label}
          {displayValue && (
            <div className="mt-1 text-slate-900 border-l-2 border-slate-200 pl-2">{displayValue}</div>
          )}
        </div>
      );
    }

    if (isLong) {
      return (
        <div className="flex flex-col gap-1 text-[10.5px] leading-snug my-1">
          <span className="font-semibold text-slate-800">{label}:</span>
          {displayValue ? (
            <span className="whitespace-pre-wrap break-words text-slate-900 font-medium border-l-2 border-slate-200 pl-2">
              {displayValue}
            </span>
          ) : (
            <span className="border-b border-slate-300 min-h-[15px]" />
          )}
        </div>
      );
    }

    return <FormLine label={label} value={value} />;
  };

  return (
    <div ref={ref} className="printable-summary bg-white p-6 text-slate-900 font-sans max-w-[800px] mx-auto select-none">
      {/* 1. Header with logo and subtitle */}
      <div className="mb-4 flex items-start justify-between border-b border-slate-200 pb-2.5">
        <div>
          <h1 className="text-[19px] font-black text-[#0b1d3a] tracking-tight leading-tight uppercase">
            {isNotary ? 'NOTARY APPOINTMENT WORKFLOW CHECKLIST' : config.brand.name.toUpperCase()}
          </h1>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            {isNotary ? 'Stay organized. Stay prepared. Provide exceptional service.' : config.brand.companyLabel}
          </p>
        </div>

        {/* Branding — public link shows only the buyer's typed company name (no logo);
            logged-in Studio shows the configured logo, or the BGrowth default */}
        {isPublic ? (
          <div className="text-right text-[10px] text-slate-500 font-semibold">
            {companyName}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1061EC] to-[#0c49b3] text-white font-extrabold text-[14px]">
                <span>B</span>
                <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] border border-white font-black text-white leading-none">
                  ↑
                </div>
              </div>
            )}
            <div className="flex flex-col leading-none">
              <span className="text-[12.5px] font-extrabold tracking-tight text-[#0b1d3a]">
                {logoUrl ? companyName : (<>BGrowth <span className="text-[#1061EC]">Club</span></>)}
              </span>
              {!logoUrl && (
                <span className="text-[6.5px] text-gray-400 uppercase tracking-widest font-semibold">Business Growth</span>
              )}
            </div>
          </div>
        )}
      </div>

      {isNotary ? (
        /* Notary Specific High-Fidelity 3-Column Layout */
        <div className="grid grid-cols-3 gap-3.5 mt-3">
          {/* Column 1: SIGNER INFORMATION */}
          <div className="flex flex-col">
            <div className="bg-[#1061EC] text-white px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-t-md flex items-center gap-1.5">
              <User className="h-3 w-3 shrink-0" />
              <span>Signer Information</span>
            </div>
            <div className="border border-t-0 border-slate-200 rounded-b-md p-2.5 flex flex-col gap-2 bg-white min-h-[155px]">
              <FormLine label="Signer Name" value={signerData.signerName} />
              <FormLine label="Phone Number" value={signerData.phone} />
              <FormLine label="Email Address" value={signerData.email} />
              <FormLine label="Number of Signers" value={signerData.numSigners} />
              <FormLine label="Type of Notarization" value={signerData.notarizationType} />
              <FormLine label="Documents to be Signed" value={signerData.documents} />
            </div>
          </div>

          {/* Column 2: APPOINTMENT DETAILS */}
          <div className="flex flex-col">
            <div className="bg-[#1061EC] text-white px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-t-md flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>Appointment Details</span>
            </div>
            <div className="border border-t-0 border-slate-200 rounded-b-md p-2.5 flex flex-col gap-2 bg-white min-h-[155px]">
              <FormLine label="Date" value={appointmentData.date} />
              <FormLine label="Time" value={appointmentData.time} />
              <FormLine label="Address" value={appointmentData.location} />
              <FormLine label="City" value={appointmentData.city} />

              {/* Special State & Zip inline layout */}
              <div className="flex items-center text-[10.5px] leading-tight">
                <span className="font-semibold text-slate-800 shrink-0 mr-1">State:</span>
                <span className="w-12 border-b border-slate-300 font-medium text-slate-900 pl-1 min-h-[15px] truncate mr-2">
                  {isBlank ? '' : (appointmentData.state || '')}
                </span>
                <span className="font-semibold text-slate-800 shrink-0 mr-1">Zip:</span>
                <span className="grow border-b border-slate-300 font-medium text-slate-900 pl-1 min-h-[15px] truncate">
                  {isBlank ? '' : (appointmentData.zip || '')}
                </span>
              </div>

              <FormLine label="Special Instructions" value={appointmentData.specialInstructions} />
            </div>
          </div>

          {/* Column 3: AGENCY / TITLE COMPANY / PLATFORM */}
          <div className="flex flex-col">
            <div className="bg-[#1061EC] text-white px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-t-md flex items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span>Agency/Title Company/Platform</span>
            </div>
            <div className="border border-t-0 border-slate-200 rounded-b-md p-2.5 flex flex-col gap-2 bg-white min-h-[155px]">
              <FormLine label="Company / Platform" value={agencyData.companyName} />
              <FormLine label="Contact Name" value={agencyData.contactName} />
              <FormLine
                label="Phone / Email"
                value={
                  isBlank
                    ? ''
                    : agencyData.phone && agencyData.email
                      ? `${agencyData.phone} / ${agencyData.email}`
                      : (agencyData.phone || agencyData.email || '')
                }
              />
              <FormLine label="Order / File Ref #" value={agencyData.orderNumber} />
              <FormLine label="Escrow / Loan #" value={agencyData.escrowNumber} />
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic / Standard Fallback Layout for other checklists */
        <div className="grid grid-cols-2 gap-3.5 mt-3">
          {config.sections
            .filter((sec) => sec.type === 'form' && sec.id !== 'journal')
            .map((section) => {
              const formSection = section as FormSectionConfig;
              const secData = (data[formSection.id] as Record<string, string>) || {};
              const SectionIcon = getIcon(formSection.icon);
              return (
                <div key={formSection.id} className="flex flex-col min-w-0">
                  <div className="bg-[#1061EC] text-white px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide rounded-t-md" style={{ display: 'table', width: '100%' }}>
                    <div style={{ display: 'table-cell', verticalAlign: 'middle', width: '14px' }}>
                      <SectionIcon className="h-3 w-3" style={{ display: 'block' }} />
                    </div>
                    <div style={{ display: 'table-cell', verticalAlign: 'middle' }} className="pl-1.5">
                      {formSection.title}
                    </div>
                  </div>
                  <div className="border border-t-0 border-slate-200 rounded-b-md p-2.5 flex flex-col gap-2 bg-white min-h-[130px]">
                    {formSection.fields.map((field) => {
                      if (field.type === 'checkbox') {
                        const checked = !isBlank && !!secData[field.id];
                        return (
                          <div key={field.id} className="flex items-center gap-2 text-[10.5px] leading-tight my-0.5">
                            <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-slate-400 bg-white">
                              {checked && <Check className="h-2.5 w-2.5 text-[#1061EC]" strokeWidth={4} />}
                            </div>
                            <span className="font-medium text-slate-800">{field.placeholder || field.label}</span>
                          </div>
                        );
                      }
                      if (field.type === 'image') {
                        const imgValue = isBlank ? undefined : secData[field.id];
                        return (
                          <div key={field.id} className="flex flex-col gap-1 text-[10.5px] leading-tight my-1">
                            <span className="font-semibold text-slate-800">{field.label}:</span>
                            {imgValue ? (
                              <div className="border border-slate-200 rounded-md p-1 bg-slate-50 self-start max-w-[150px]">
                                <img
                                  src={imgValue}
                                  alt={field.label}
                                  className="max-h-[80px] object-contain rounded"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9.5px]">Nenhuma foto anexada</span>
                            )}
                          </div>
                        );
                      }
                      if (field.type === 'static_image') {
                        const staticImgValue = field.staticImageUrl;
                        return (
                          <div key={field.id} className="flex flex-col gap-1 text-[10.5px] leading-tight my-1">
                            <span className="font-semibold text-slate-800">{field.label || 'Imagem de Referência'}:</span>
                            {staticImgValue ? (
                              <div className="border border-slate-200 rounded-md p-1 bg-slate-50 self-start max-w-[150px]">
                                <img
                                  src={staticImgValue}
                                  alt={field.label || 'Referência'}
                                  className="max-h-[80px] object-contain rounded"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9.5px]">Nenhuma imagem de referência</span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <DynamicFieldLine key={field.id} label={field.label} value={secData[field.id]} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* 2. Journal Reference Section */}
      {isNotary && (
        <div className="mt-3">
          <div className="bg-[#0b1d3a] text-white px-3 py-1 text-[9.5px] font-extrabold tracking-wider uppercase rounded-[3px]">
            JOURNAL REFERENCE <span className="text-slate-400 font-normal italic lowercase">(optional)</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1.5 p-1 text-[10px]">
            <div className="flex items-baseline gap-1 grow min-w-[100px]">
              <span className="font-semibold text-slate-800 shrink-0">Journal #:</span>
              <span className="grow border-b border-slate-300 font-medium text-slate-900 min-h-[14px] px-1 truncate">{isBlank ? '' : (journalData.journalNumber || '')}</span>
            </div>
            <div className="flex items-baseline gap-1 grow min-w-[80px]">
              <span className="font-semibold text-slate-800 shrink-0">Entry #:</span>
              <span className="grow border-b border-slate-300 font-medium text-slate-900 min-h-[14px] px-1 truncate">{isBlank ? '' : (journalData.entry || '')}</span>
            </div>
            <div className="flex items-baseline gap-1 grow min-w-[80px]">
              <span className="font-semibold text-slate-800 shrink-0">Page #:</span>
              <span className="grow border-b border-slate-300 font-medium text-slate-900 min-h-[14px] px-1 truncate">{isBlank ? '' : (journalData.page || '')}</span>
            </div>
            <div className="flex items-baseline gap-1 grow min-w-[80px]">
              <span className="font-semibold text-slate-800 shrink-0">Line #:</span>
              <span className="grow border-b border-slate-300 font-medium text-slate-900 min-h-[14px] px-1 truncate"></span>
            </div>
            <div className="flex items-baseline gap-1 grow min-w-[100px]">
              <span className="font-semibold text-slate-800 shrink-0">Invoice #:</span>
              <span className="grow border-b border-slate-300 font-medium text-slate-900 min-h-[14px] px-1 truncate">{isBlank ? '' : (journalData.invoice || '')}</span>
            </div>
            <div className="flex items-baseline gap-1 grow min-w-[110px]">
              <span className="font-semibold text-slate-800 shrink-0">Fee Charged $:</span>
              <span className="grow border-b border-slate-300 font-medium text-slate-900 min-h-[14px] px-1 truncate">{isBlank ? '' : (journalData.feeCharged || '')}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Task Table Column Header */}
      {isNotary ? (
        <div className="mt-3.5 flex text-[9px] font-bold text-slate-400 border-b-2 border-slate-200 pb-1 px-1">
          <div className="w-[55%] uppercase tracking-wider">+ TASK</div>
          <div className="w-[45%] uppercase tracking-wider">PURPOSE</div>
        </div>
      ) : (
        <div className="mt-3.5 flex text-[9px] font-bold text-slate-400 border-b-2 border-slate-200 pb-1 px-1">
          <div className="w-full uppercase tracking-wider">+ TASK</div>
        </div>
      )}

      {/* 4. Checklist Sections */}
      {config.sections
        .filter((sec) => sec.type === 'checklist')
        .map((section, idx) => {
          const secValues = (data[section.id] as Record<string, boolean>) || {};
          const numberLabel = `SECTION ${idx + 1}: ${section.title.toUpperCase()}`;

          return (
            <div key={section.id} className="mt-2">
              <div className="bg-[#1061EC] text-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide rounded-[3px]">
                {numberLabel}
              </div>
              <div className="border border-t-0 border-slate-200 rounded-b-[3px] bg-white divide-y divide-slate-100">
                {section.items.map((item) => {
                  const checked = !isBlank && !!secValues[item.id];
                  const override = NOTARY_OVERRIDES[item.id];
                  const labelToUse = isNotary && override ? override.label : item.label;
                  const purposeToUse = isNotary && override ? override.purpose : '';

                  return (
                    <div key={item.id} className="flex items-center py-1 px-2.5" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <div className={isNotary ? "w-[55%] flex items-center gap-2" : "w-full flex items-center gap-2"}>
                        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-slate-400 bg-white">
                          {checked && <Check className="h-2.5 w-2.5 text-[#1061EC]" strokeWidth={4} />}
                        </div>
                        <span className="text-[10.5px] font-semibold text-slate-800">
                          {labelToUse}
                        </span>
                      </div>
                      {isNotary && (
                        <div className="w-[45%] text-[9.5px] text-slate-500 font-normal">
                          {purposeToUse}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* 5. Notes Section */}
      {isNotary ? (
        <div className="mt-3">
          <div className="bg-[#0b1d3a] text-white px-3 py-1 text-[9.5px] font-extrabold tracking-wider uppercase rounded-sm">
            NOTES
          </div>
          <div className="mt-1 flex flex-col gap-2.5 px-1">
            <div className="border-b border-slate-300 pb-0.5 text-[10.5px] font-medium text-slate-800 min-h-[17px] whitespace-pre-wrap">
              {isBlank ? '' : (notesValue || '')}
            </div>
            <div className="border-b border-slate-300 pb-0.5 min-h-[17px]"></div>
            <div className="border-b border-slate-300 pb-0.5 min-h-[17px]"></div>
          </div>
        </div>
      ) : (
        config.sections
          .filter((sec) => sec.type === 'notes')
          .map((section) => {
            const val = isBlank ? '' : ((data[section.id] as string) || '');
            return (
              <div key={section.id} className="mt-3">
                <div className="bg-[#0b1d3a] text-white px-3 py-1 text-[9.5px] font-extrabold tracking-wider uppercase rounded-sm">
                  {section.title.toUpperCase()}
                </div>
                <div className="mt-1 flex flex-col gap-2.5 px-1">
                  <div className="border-b border-slate-300 pb-0.5 text-[10.5px] font-medium text-slate-800 min-h-[17px] whitespace-pre-wrap">
                    {val}
                  </div>
                  <div className="border-b border-slate-300 pb-0.5 min-h-[17px]"></div>
                  <div className="border-b border-slate-300 pb-0.5 min-h-[17px]"></div>
                </div>
              </div>
            );
          })
      )}

      {/* 6. Appointment Outcome */}
      {isNotary ? (
        <div className="mt-3">
          <div className="bg-[#0b1d3a] text-white px-3 py-1 text-[9.5px] font-extrabold tracking-wider uppercase rounded-sm">
            APPOINTMENT OUTCOME
          </div>
          <div className="mt-2 flex flex-wrap gap-4 justify-between px-1">
            {[
              { id: 'completedSuccessfully', label: 'Completed Successfully' },
              { id: 'followUpNeeded', label: 'Follow-Up Needed' },
              { id: 'additionalDocumentsRequired', label: 'Additional Documents Required' },
              { id: 'invoiceSent', label: 'Invoice Sent' },
            ].map((item) => {
              const checked = !isBlank && !!outcomeValues[item.id];
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-slate-400 bg-white">
                    {checked && <Check className="h-2.5 w-2.5 text-[#1061EC]" strokeWidth={4} />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        config.sections
          .filter((sec) => sec.type === 'outcome')
          .map((section) => {
            const secValues = (data[section.id] as Record<string, boolean>) || {};
            return (
              <div key={section.id} className="mt-3">
                <div className="bg-[#0b1d3a] text-white px-3 py-1 text-[9.5px] font-extrabold tracking-wider uppercase rounded-sm">
                  {section.title.toUpperCase()}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 justify-between px-1">
                  {(section.items || []).map((item) => {
                    const checked = !isBlank && !!secValues[item.id];
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-slate-400 bg-white">
                          {checked && <Check className="h-2.5 w-2.5 text-[#1061EC]" strokeWidth={4} />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
      )}

      {/* 7. Footer */}
      <div className="border-t border-slate-200 pt-1 mt-4 flex justify-between items-center text-[9px] font-extrabold">
        <span className="text-slate-800 uppercase tracking-tight">{companyName}</span>
        <span className="text-slate-400 font-normal">Generated on {today} • {isBlank ? 'Blank Form' : `${percent}% complete`}</span>
        <span className="text-[#1061EC] lowercase">portal.bgrowth.app</span>
      </div>
    </div>
  );
});

PrintableSummary.displayName = 'PrintableSummary';
