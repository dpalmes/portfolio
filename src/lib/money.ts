/**
 * Money as integer centavos.
 *
 * Currency in a floating-point number is a bug waiting for a big enough
 * invoice: 0.1 + 0.2 is 0.30000000000000004, and a booking engine that adds up
 * seven nights and a tax rate will be out by a centavo often enough for someone
 * to notice. Every amount in these engines is an integer number of the smallest
 * unit, and the only place rounding happens is here, deliberately.
 */

export type Centavos = number;

export const PESO = 100;

export function pesos(amount: number): Centavos {
  return Math.round(amount * PESO);
}

/**
 * Formats for display. Not for arithmetic — once a value is a string it is
 * output, and anything that needs to add it up has already gone wrong.
 */
export function formatPeso(centavos: Centavos): string {
  const negative = centavos < 0;
  const absolute = Math.abs(centavos);
  const whole = Math.floor(absolute / PESO);
  const fraction = absolute % PESO;
  const grouped = whole.toLocaleString("en-PH");
  return `${negative ? "-" : ""}₱${grouped}.${String(fraction).padStart(2, "0")}`;
}

/**
 * Applies a rate, rounding half away from zero.
 *
 * JavaScript's `Math.round` rounds half *up*, which is asymmetric for negative
 * numbers: -2.5 rounds to -2. On a refund line that quietly favours the
 * business, which is the kind of thing an auditor asks about.
 */
export function applyRate(amount: Centavos, rate: number): Centavos {
  const exact = amount * rate;
  return exact < 0 ? -Math.round(-exact) : Math.round(exact);
}

/** Percentage of an amount, e.g. `percentOf(10_000, 12)` for 12%. */
export function percentOf(amount: Centavos, percent: number): Centavos {
  return applyRate(amount, percent / 100);
}

export function sum(amounts: readonly Centavos[]): Centavos {
  return amounts.reduce((total, amount) => total + amount, 0);
}
