import type { Formula, CalculatorValues, CalculatorResults, CalculatorConfig } from './types';

/**
 * Safely evaluates a formula expression given a map of variable values.
 *
 * Expressions are plain JS arithmetic strings where field IDs are variable
 * names. We substitute values and evaluate with new Function(), which runs
 * in strict mode inside a closure — no access to globals.
 *
 * Example:
 *   expression: "labor_cost + supplies + equipment"
 *   values:     { labor_cost: 40, supplies: 25, equipment: 15 }
 *   result:     80
 */
export function evaluateFormula(formula: Formula, values: CalculatorValues): number {
  try {
    const vars = formula.variables;
    const args = vars.map((v) => {
      const val = values[v];
      return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    });

    // Build a function: (a, b, c) => expression
    // Replace variable names with positional arg names
    let expr = formula.expression;
    vars.forEach((varName, idx) => {
      expr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), `__v${idx}`);
    });

    // Only arithmetic may reach new Function: after the variables, nothing
    // but numbers, operators, parentheses and Math.pow/min/max/round/abs/
    // floor/ceil/sqrt is allowed — anything else evaluates to 0.
    const leftover = expr
      .replace(/__v\d+/g, '')
      .replace(/Math\.(pow|min|max|round|abs|floor|ceil|sqrt)\b/g, '');
    if (!/^[0-9+\-*\/%().,?:<>=!&|\s]*$/.test(leftover)) return 0;

    const paramNames = vars.map((_, idx) => `__v${idx}`);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...paramNames, `'use strict'; return (${expr});`);
    const result = fn(...args);

    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return 0;
    return Math.round(result * 100) / 100; // round to 2 decimal places
  } catch {
    return 0;
  }
}

/**
 * Computes ALL formulas for a config given the current field values.
 * Returns a map of formulaId → number.
 *
 * Formulas can reference other formula results (computed in order),
 * so we run a simple single-pass: field values first, then formulas
 * in declaration order, making previously computed results available
 * as variables in later formulas.
 */
export function computeAll(config: CalculatorConfig, values: CalculatorValues): CalculatorResults {
  const results: CalculatorResults = {};

  // Merge field values + previously computed formula results into one namespace
  const namespace: CalculatorValues = { ...values };

  for (const formula of config.formulas) {
    // Augment variables with any formula result already computed
    const augmented: Formula = {
      ...formula,
      variables: formula.variables,
    };

    // Add formula results to namespace for cross-formula references
    Object.entries(results).forEach(([k, v]) => {
      if (!(k in namespace)) namespace[k] = v;
    });

    const val = evaluateFormula(augmented, namespace);
    results[formula.id] = val;
    namespace[formula.id] = val; // make available to subsequent formulas
  }

  return results;
}

/**
 * Calculates the overall completion percentage:
 * how many required fields have non-zero / non-empty values.
 */
export function calcCompletion(config: CalculatorConfig, values: CalculatorValues): number {
  const required = config.sections.flatMap((s) => s.fields.filter((f) => f.required));
  if (required.length === 0) return 100;
  const filled = required.filter((f) => {
    const v = values[f.id];
    return v !== undefined && v !== '' && v !== 0 && v !== '0';
  });
  return Math.round((filled.length / required.length) * 100);
}

/**
 * Builds the initial values map from field defaults.
 */
export function buildDefaultValues(config: CalculatorConfig): CalculatorValues {
  const values: CalculatorValues = {};
  for (const section of config.sections) {
    for (const field of section.fields) {
      values[field.id] = field.defaultValue ?? (field.type === 'number' || field.type === 'currency' || field.type === 'percentage' || field.type === 'slider' ? 0 : '');
    }
  }
  return values;
}

/** Format a number as currency */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
}

/** Format a number as percentage */
export function formatPercent(val: number, decimals = 1): string {
  return `${val.toFixed(decimals)}%`;
}

/** Format based on ResultType */
export function formatResult(val: number, type: string, prefix?: string, suffix?: string): string {
  let base: string;
  switch (type) {
    case 'currency': base = formatCurrency(val); break;
    case 'percentage': base = formatPercent(val); break;
    default: base = val.toFixed(2).replace(/\.00$/, '');
  }
  // Don't add prefix for currency — formatCurrency already includes $
  const pre = type === 'currency' ? '' : (prefix ?? '');
  return `${pre}${base}${suffix ?? ''}`;
}
