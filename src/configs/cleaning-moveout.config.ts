import type { ChecklistConfig } from '../engine/types';

/**
 * Proof of concept: a completely different product — different brand color,
 * different section count, different field mix — rendered by the exact same
 * engine used for the Notary config. Nothing in `src/engine` or
 * `src/components` changes to support this; only this file exists.
 *
 * To try it: in App.tsx, swap the `activeConfig` import to this one.
 */
export const cleaningMoveOutConfig: ChecklistConfig = {
  productId: 'cleaning-moveout-checklist',
  brand: {
    name: 'Move-Out Cleaning Inspection Checklist',
    companyLabel: 'BGrowth',
    primaryColor: '#0EA5A0', // teal, matches BGrowth Cleaning module branding
  },
  footer: {
    proTip: 'Photograph every room before and after — it settles deposit disputes in seconds.',
    helpText: 'Visit bgrowthclub.com for resources and support.',
    helpUrl: 'https://bgrowthclub.com',
  },
  sections: [
    {
      id: 'client',
      number: 1,
      type: 'form',
      title: 'Client & Property',
      description: 'Who the job is for and where it takes place.',
      icon: 'user',
      whyItMatters: 'Getting the address and contact right avoids wasted trips and mismatched invoices.',
      fields: [
        { id: 'clientName', label: 'Client Name', type: 'text', icon: 'user', required: true, placeholder: 'Jane Doe' },
        { id: 'phone', label: 'Phone Number', type: 'phone', icon: 'phone', required: true, placeholder: '(555) 234-5678' },
        { id: 'email', label: 'Email Address', type: 'email', icon: 'mail', required: true, placeholder: 'jane@email.com' },
        { id: 'address', label: 'Property Address', type: 'text', icon: 'map-pin', required: true, placeholder: '456 Oak Ave, Apt 3B', fullWidth: true },
        { id: 'bedrooms', label: 'Bedrooms', type: 'select', icon: 'building', required: true, options: ['Studio', '1', '2', '3', '4+'] },
      ],
    },
    {
      id: 'kitchen',
      number: 2,
      type: 'checklist',
      title: 'Kitchen',
      description: 'Standard move-out kitchen tasks.',
      icon: 'clipboard-list',
      items: [
        { id: 'insideFridge', label: 'Inside refrigerator wiped and deodorized' },
        { id: 'insideOven', label: 'Inside oven degreased' },
        { id: 'cabinets', label: 'Cabinets and drawers wiped inside and out' },
        { id: 'counters', label: 'Counters and backsplash cleaned' },
        { id: 'floor', label: 'Floor swept and mopped' },
      ],
    },
    {
      id: 'bathrooms',
      number: 3,
      type: 'checklist',
      title: 'Bathrooms',
      description: 'Standard move-out bathroom tasks.',
      icon: 'shield-check',
      items: [
        { id: 'toilet', label: 'Toilet scrubbed inside and out' },
        { id: 'shower', label: 'Shower/tub descaled' },
        { id: 'mirrors', label: 'Mirrors streak-free' },
        { id: 'grout', label: 'Grout spot-treated' },
      ],
    },
    {
      id: 'general',
      number: 4,
      type: 'checklist',
      title: 'General Living Areas',
      description: 'Bedrooms, living room, and hallways.',
      icon: 'file-check-2',
      items: [
        { id: 'baseboards', label: 'Baseboards dusted and wiped' },
        { id: 'windowSills', label: 'Window sills and tracks cleaned' },
        { id: 'closets', label: 'Closets emptied and wiped' },
        { id: 'floors', label: 'Floors vacuumed and mopped' },
      ],
    },
    {
      id: 'notes',
      number: 5,
      type: 'notes',
      title: 'Notes',
      description: 'Damage, pre-existing wear, or anything the client should know.',
      icon: 'file-text',
    },
    {
      id: 'outcome',
      number: 6,
      type: 'outcome',
      title: 'Job Outcome',
      description: 'Final status for this job.',
      icon: 'check-circle-2',
      items: [
        { id: 'completedSuccessfully', label: 'Completed Successfully' },
        { id: 'clientWalkthroughDone', label: 'Client Walkthrough Done' },
        { id: 'touchUpNeeded', label: 'Touch-Up Needed' },
        { id: 'invoiceSent', label: 'Invoice Sent' },
      ],
    },
  ],
};
