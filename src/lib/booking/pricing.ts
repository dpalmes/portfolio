/**
 * What a stay costs, and why.
 *
 * The quote is itemised per night rather than reduced to a total. A guest who
 * sees one number cannot tell a weekend uplift from a peak-season rate, and
 * neither can whoever is answering the phone when they ring to argue about it.
 */

import { percentOf, sum, type Centavos } from "../money";
import { isWeekend, nightsOf, type IsoDate, type Stay } from "./dates";

export interface Season {
  id: string;
  name: string;
  /** Inclusive month-day bounds, e.g. "12-15" to "01-05". Wraps the year end. */
  from: string;
  to: string;
  /** Multiplier on the base rate, e.g. 1.6 for peak. */
  multiplier: number;
}

export interface RatePlan {
  baseRate: Centavos;
  /** Multiplier applied to Friday and Saturday nights. */
  weekendMultiplier: number;
  seasons: readonly Season[];
  /** Discounts keyed by minimum nights, applied to the highest threshold met. */
  lengthOfStayDiscounts: ReadonlyArray<{ minNights: number; percent: number }>;
  taxPercent: number;
}

export interface NightCharge {
  date: IsoDate;
  base: Centavos;
  season: string | null;
  weekend: boolean;
  amount: Centavos;
}

export interface Quote {
  nights: NightCharge[];
  subtotal: Centavos;
  discountPercent: number;
  discount: Centavos;
  taxable: Centavos;
  tax: Centavos;
  total: Centavos;
}

/** Whether a date falls inside a season, handling ranges that wrap the year. */
export function inSeason(date: IsoDate, season: Season): boolean {
  const monthDay = date.slice(5);
  if (season.from <= season.to) {
    return monthDay >= season.from && monthDay <= season.to;
  }
  // A range like 12-15 to 01-05 is two ranges either side of new year.
  return monthDay >= season.from || monthDay <= season.to;
}

export function seasonFor(date: IsoDate, plan: RatePlan): Season | null {
  return plan.seasons.find((season) => inSeason(date, season)) ?? null;
}

export function rateFor(date: IsoDate, plan: RatePlan): NightCharge {
  const season = seasonFor(date, plan);
  const weekend = isWeekend(date);

  // Multipliers compound: a Saturday in peak season is both. Applying only the
  // larger of the two is a common shortcut and it undercharges the busiest
  // nights of the year.
  let amount = plan.baseRate;
  if (season) amount = Math.round(amount * season.multiplier);
  if (weekend) amount = Math.round(amount * plan.weekendMultiplier);

  return {
    date,
    base: plan.baseRate,
    season: season?.name ?? null,
    weekend,
    amount,
  };
}

export function discountPercentFor(nightCount: number, plan: RatePlan): number {
  return plan.lengthOfStayDiscounts
    .filter((tier) => nightCount >= tier.minNights)
    .reduce((best, tier) => Math.max(best, tier.percent), 0);
}

export function quote(stay: Stay, plan: RatePlan): Quote {
  const nights = nightsOf(stay).map((date) => rateFor(date, plan));
  const subtotal = sum(nights.map((night) => night.amount));

  const discountPercent = discountPercentFor(nights.length, plan);
  const discount = percentOf(subtotal, discountPercent);

  // Tax applies after the discount. Taxing the pre-discount amount charges the
  // guest tax on money nobody paid.
  const taxable = subtotal - discount;
  const tax = percentOf(taxable, plan.taxPercent);

  return {
    nights,
    subtotal,
    discountPercent,
    discount,
    taxable,
    tax,
    total: taxable + tax,
  };
}
