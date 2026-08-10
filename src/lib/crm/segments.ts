/**
 * Who is worth contacting, and about what.
 *
 * RFM — recency, frequency, monetary — because it is derived entirely from
 * transactions that already exist. Nobody has to tag a customer as "loyal", and
 * nobody's opinion of them can drift out of date: the segment is a function of
 * what they actually did, recomputed every time it is asked for.
 */

import { sum, type Centavos } from "../money";

/** A purchase in any of the three businesses. */
export interface Transaction {
  id: string;
  customerId: string;
  /** Which business it happened in. */
  source: "resort" | "shop" | "store";
  at: number;
  amount: Centavos;
  description: string;
}

export interface CustomerStats {
  customerId: string;
  /** Days since the most recent transaction. */
  recencyDays: number;
  frequency: number;
  monetary: Centavos;
  averageOrder: Centavos;
  firstPurchase: number | null;
  lastPurchase: number | null;
  sources: Array<Transaction["source"]>;
}

export type Segment =
  | "champion"
  | "loyal"
  | "promising"
  | "at-risk"
  | "lapsed"
  | "new"
  | "none";

export interface SegmentedCustomer extends CustomerStats {
  segment: Segment;
  /** Why this segment, in words somebody in marketing can act on. */
  rationale: string;
}

const DAY = 86_400_000;

export function statsFor(
  customerId: string,
  transactions: readonly Transaction[],
  now: number,
): CustomerStats {
  const theirs = transactions.filter(
    (transaction) => transaction.customerId === customerId,
  );

  if (theirs.length === 0) {
    return {
      customerId,
      recencyDays: Number.POSITIVE_INFINITY,
      frequency: 0,
      monetary: 0,
      averageOrder: 0,
      firstPurchase: null,
      lastPurchase: null,
      sources: [],
    };
  }

  const times = theirs.map((transaction) => transaction.at);
  const monetary = sum(theirs.map((transaction) => transaction.amount));
  const last = Math.max(...times);

  return {
    customerId,
    recencyDays: Math.floor((now - last) / DAY),
    frequency: theirs.length,
    monetary,
    averageOrder: Math.round(monetary / theirs.length),
    firstPurchase: Math.min(...times),
    lastPurchase: last,
    sources: [...new Set(theirs.map((transaction) => transaction.source))],
  };
}

export interface SegmentRules {
  /** Beyond this many days without a purchase, a customer is lapsed. */
  lapsedAfterDays: number;
  /** Beyond this, they are drifting. */
  atRiskAfterDays: number;
  /** Purchases needed before "loyal" is a fair description. */
  loyalFrequency: number;
  /** Lifetime spend that marks somebody out regardless of count. */
  championMonetary: Centavos;
}

/**
 * Assigns a segment.
 *
 * Order matters, and it encodes a judgement: recency dominates. Somebody who
 * spent a fortune and has not been seen for a year is a lapsed customer with a
 * good history, not a champion — and treating them as a champion is how a
 * "thanks for your loyalty" message lands on somebody who left months ago.
 */
export function segmentOf(stats: CustomerStats, rules: SegmentRules): SegmentedCustomer {
  const base = { ...stats };

  if (stats.frequency === 0) {
    return { ...base, segment: "none", rationale: "No purchases yet." };
  }

  if (stats.recencyDays > rules.lapsedAfterDays) {
    return {
      ...base,
      segment: "lapsed",
      rationale: `Last seen ${stats.recencyDays} days ago, over the ${rules.lapsedAfterDays}-day threshold.`,
    };
  }

  if (stats.recencyDays > rules.atRiskAfterDays) {
    return {
      ...base,
      segment: "at-risk",
      rationale: `${stats.frequency} purchase${stats.frequency === 1 ? "" : "s"} but quiet for ${stats.recencyDays} days.`,
    };
  }

  if (
    stats.monetary >= rules.championMonetary &&
    stats.frequency >= rules.loyalFrequency
  ) {
    return {
      ...base,
      segment: "champion",
      rationale: `${stats.frequency} purchases and high lifetime value, still active.`,
    };
  }

  if (stats.frequency >= rules.loyalFrequency) {
    return {
      ...base,
      segment: "loyal",
      rationale: `${stats.frequency} purchases and still active.`,
    };
  }

  if (stats.frequency === 1) {
    return {
      ...base,
      segment: "new",
      rationale: "One purchase, recently. Worth a second.",
    };
  }

  return {
    ...base,
    segment: "promising",
    rationale: `${stats.frequency} purchases, recent, not yet a regular.`,
  };
}

export function segmentAll(
  customerIds: readonly string[],
  transactions: readonly Transaction[],
  rules: SegmentRules,
  now: number,
): SegmentedCustomer[] {
  return customerIds
    .map((id) => segmentOf(statsFor(id, transactions, now), rules))
    .sort((a, b) => b.monetary - a.monetary);
}

/**
 * Customers who bought in more than one of the businesses.
 *
 * The reason a single CRM across three shops is worth building at all: without
 * it, the resort and the coffee shop each see a stranger, and neither knows the
 * other is talking to the same person.
 */
export function crossSellCandidates(
  segmented: readonly SegmentedCustomer[],
): SegmentedCustomer[] {
  return segmented.filter((customer) => customer.sources.length > 1);
}

export const DEFAULT_SEGMENT_RULES: SegmentRules = {
  lapsedAfterDays: 180,
  atRiskAfterDays: 60,
  loyalFrequency: 3,
  championMonetary: 2_000_00,
};
