import type { ChecklistData } from '../../engine/types';

/**
 * Fixture only — near-empty fill (a user who just opened the checklist),
 * mirroring bgrowth-portal's notaryWorkspaceDataEmpty.ts field-for-field.
 * See ../PrintableSummaryDevPreview.tsx.
 */
export const notaryDataEmpty: ChecklistData = {
  signer: {
    signerName: 'Elena Marquez',
    // phone, email, numSigners, notarizationType, documents intentionally left blank.
  },
  appointment: {
    date: '2026-10-02',
  },
  agency: {},
  journal: {},
  beforeAppointment: {
    confirmAppointment: true,
  },
  duringAppointment: {},
  beforeClosing: {},
  professionalHabits: {},
  notes: '',
  outcome: {},
};
