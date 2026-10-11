import type { CalculatorConfig } from './types';

export const mileageDeductionCalc: CalculatorConfig = {
  productId: 'mileage-deduction-calculator',
  name: 'Mileage Deduction Calculator',
  subtitle: 'Calculate your IRS mileage deduction for business travel.',
  category: 'Tax Calculators',
  icon: 'car',
  primaryColor: '#0EA5A0',
  notesEnabled: true,

  sections: [
    {
      id: 'trip_details',
      number: 1,
      title: 'Trip Details',
      description: 'Enter your mileage information.',
      icon: 'map-pin',
      fields: [
        { id: 'trip_type', label: 'Trip Type', type: 'select', defaultValue: 'oneway', required: true, options: [{ label: 'One Way', value: 'oneway' }, { label: 'Round Trip', value: 'roundtrip' }, { label: 'Custom Miles', value: 'custom' }] },
        { id: 'distance', label: 'Distance (miles)', type: 'number', defaultValue: 0, required: true, suffix: 'mi', tooltip: 'One-way distance to the job' },
        { id: 'num_trips', label: 'Number of Trips', type: 'number', defaultValue: 1, min: 1 },
        { id: 'tax_year', label: 'Tax Year', type: 'select', defaultValue: '2026', options: [{ label: '2026 ($0.725/mi)', value: '2026' }, { label: '2025 ($0.700/mi)', value: '2025' }] },
      ],
    },
    {
      id: 'vehicle',
      number: 2,
      title: 'Vehicle & Costs',
      description: 'Optional: enter actual costs for comparison.',
      icon: 'car',
      fields: [
        { id: 'gas_cost', label: 'Gas Cost per Mile', type: 'currency', defaultValue: 0.12, prefix: '$', suffix: '/mi' },
        { id: 'maintenance', label: 'Maintenance per Mile', type: 'currency', defaultValue: 0.08, prefix: '$', suffix: '/mi' },
        { id: 'insurance_per_mile', label: 'Insurance per Mile', type: 'currency', defaultValue: 0.05, prefix: '$', suffix: '/mi' },
      ],
    },
  ],

  formulas: [
    { id: 'irs_rate', name: 'IRS Rate', expression: 'tax_year === 2026 ? 0.725 : 0.700', variables: ['tax_year'] },
    { id: 'total_miles', name: 'Total Miles', expression: 'trip_type === "roundtrip" ? distance * 2 * num_trips : distance * num_trips', variables: ['trip_type', 'distance', 'num_trips'] },
    { id: 'standard_deduction', name: 'Standard Deduction', expression: 'total_miles * irs_rate', variables: ['total_miles', 'irs_rate'] },
    { id: 'actual_cost_per_mile', name: 'Actual Cost per Mile', expression: 'gas_cost + maintenance + insurance_per_mile', variables: ['gas_cost', 'maintenance', 'insurance_per_mile'] },
    { id: 'actual_deduction', name: 'Actual Cost Deduction', expression: 'total_miles * actual_cost_per_mile', variables: ['total_miles', 'actual_cost_per_mile'] },
    { id: 'tax_savings', name: 'Estimated Tax Savings (22%)', expression: 'standard_deduction * 0.22', variables: ['standard_deduction'] },
  ],

  results: [
    { id: 'r_miles', label: 'Total Miles', formulaId: 'total_miles', type: 'number' },
    { id: 'r_standard', label: 'Standard Deduction', formulaId: 'standard_deduction', type: 'currency', highlight: true, description: 'IRS standard rate for the tax year' },
    { id: 'r_savings', label: 'Est. Tax Savings', formulaId: 'tax_savings', type: 'currency' },
    { id: 'r_actual', label: 'Actual Cost Method', formulaId: 'actual_deduction', type: 'currency' },
  ],

  quickCalcs: [
    { label: 'IRS Rate 2026', formulaId: 'irs_rate', type: 'currency', suffix: '/mi' },
    { label: 'Actual Cost/Mile', formulaId: 'actual_cost_per_mile', type: 'currency', suffix: '/mi' },
    { label: 'Tax Savings (22%)', formulaId: 'tax_savings', type: 'currency' },
  ],
};
