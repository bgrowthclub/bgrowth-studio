import type { ChecklistData } from '../../engine/types';

/**
 * Fixture only — used by the isolated PrintableSummary dev preview (see
 * ../PrintableSummaryDevPreview.tsx). Field ids match
 * ../../configs/notary.config.ts exactly, and values are copied verbatim
 * from bgrowth-portal's own notaryWorkspaceData.ts fixture so the two
 * repos' PDF output can be visually compared against literally the same
 * underlying data (see the PDF/Print unification report). Not read from or
 * written to any real instance.
 */
export const notaryDataPopulated: ChecklistData = {
  signer: {
    signerName: 'Elena Marquez',
    phone: '(555) 214-7788',
    email: 'elena.marquez@email.com',
    numSigners: '2 Signers',
    notarizationType: 'Acknowledgement',
    documents: 'Power of Attorney, Deed of Trust',
  },
  appointment: {
    date: '2026-10-02',
    time: '14:30',
    location: '123 Main Street, Suite 200',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90001',
    specialInstructions: 'Parking is in the rear lot. Buzz unit 200 at the gate.',
  },
  agency: {
    companyName: 'Pacific Title & Escrow',
    contactName: 'Maria Lopez',
    phone: '(555) 987-6543',
    email: 'orders@pacifictitle.com',
    orderNumber: 'ORD-2026-4471',
    escrowNumber: 'ESC-88213',
  },
  journal: {
    journalNumber: 'JN-014',
    page: '42',
    entry: '7',
    invoice: 'INV-3390',
    feeCharged: '$15.00',
  },
  beforeAppointment: {
    confirmAppointment: true,
    reviewDocuments: true,
    selectCertificate: true,
    prepareSupplies: true,
    clarifyPayment: false,
  },
  duringAppointment: {
    signerPresent: true,
    verifyId: true,
    correctNotarialAct: true,
    completeCertificate: false,
    answerQuestions: false,
  },
  beforeClosing: {
    journalEntry: true,
    reviewSeal: true,
    reviewDocumentsClosing: false,
    returnDocuments: false,
    thankSigner: false,
  },
  professionalHabits: {
    followedProcess: true,
    nothingSkipped: true,
    recordsSecured: false,
    educationCompleted: false,
    reflectImprove: false,
  },
  notes:
    "Signer arrived a few minutes early. Confirmed ID with California driver's license, expiration verified. Second signer joined by phone for a brief acknowledgement — followed up in person same day.",
  outcome: {
    completedSuccessfully: true,
    followUpNeeded: false,
    additionalDocumentsRequired: false,
    invoiceSent: true,
  },
};
