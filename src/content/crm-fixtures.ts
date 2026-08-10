/**
 * Seed data for the CRM console.
 *
 * Built to contain the awkward cases on purpose: the same person entered three
 * different ways across three businesses, two genuinely different people who
 * share a name, and two who share a phone. A clean dataset would demonstrate
 * nothing.
 */

import { contactPoint, type Customer } from "@/lib/crm/identity";
import type { ConsentEvent } from "@/lib/crm/consent";
import type { Transaction } from "@/lib/crm/segments";
import { pesos } from "@/lib/money";

const DAY = 86_400_000;
/** Fixed so the demo reads identically for everyone. */
export const CRM_NOW = Date.UTC(2026, 2, 2);

function make(
  id: string,
  displayName: string,
  raws: string[],
  daysAgo: number,
): Customer {
  return {
    id,
    displayName,
    contacts: raws.flatMap((raw) => {
      const contact = contactPoint(raw);
      return contact ? [contact] : [];
    }),
    firstSeen: CRM_NOW - daysAgo * DAY,
    mergedFrom: [],
  };
}

export const SEED_CUSTOMERS: Customer[] = [
  // The same person, three times over. Booked the villa by phone, ordered
  // coffee with the number written differently, bought groceries under a
  // fuller name with the same email.
  make("c1", "Ana Cruz", ["0917 123 4567"], 320),
  make("c2", "ana dela cruz", ["+63 917 123 4567", "ana.cruz@example.com"], 90),
  make("c3", "Ana Dela Cruz", ["ana.cruz@example.com"], 40),

  // Two different people who happen to share a very common name.
  make("c4", "Maria Santos", ["0918 222 2222"], 200),
  make("c5", "Maria Santos", ["0919 333 3333", "m.santos@example.com"], 15),

  // A shared handset — a household, not one person.
  make("c6", "Roberto Bautista", ["0920 444 4444"], 150),
  make("c7", "Elena Bautista", ["0920 444 4444"], 150),

  // Unambiguous singles.
  make("c8", "Jose Rizal", ["0921 555 5555", "jose@example.com"], 400),
  make("c9", "Lito Ramos", ["0922 666 6666"], 8),
];

export const SEED_TRANSACTIONS: Transaction[] = [
  // Ana, spread across all three businesses and all three records.
  { id: "x1", customerId: "c1", source: "resort", at: CRM_NOW - 300 * DAY, amount: pesos(28_400), description: "Garden Villa, 3 nights" },
  { id: "x2", customerId: "c1", source: "resort", at: CRM_NOW - 120 * DAY, amount: pesos(31_900), description: "Ocean Suite, 2 nights" },
  { id: "x3", customerId: "c2", source: "shop", at: CRM_NOW - 40 * DAY, amount: pesos(430), description: "Latte, ube cake" },
  { id: "x4", customerId: "c2", source: "shop", at: CRM_NOW - 12 * DAY, amount: pesos(275), description: "Kapeng barako" },
  { id: "x5", customerId: "c3", source: "store", at: CRM_NOW - 5 * DAY, amount: pesos(612), description: "Groceries" },

  { id: "x6", customerId: "c4", source: "store", at: CRM_NOW - 190 * DAY, amount: pesos(240), description: "Groceries" },

  { id: "x7", customerId: "c5", source: "shop", at: CRM_NOW - 10 * DAY, amount: pesos(320), description: "Tapsilog" },
  { id: "x8", customerId: "c5", source: "shop", at: CRM_NOW - 4 * DAY, amount: pesos(155), description: "Latte" },
  { id: "x9", customerId: "c5", source: "store", at: CRM_NOW - 2 * DAY, amount: pesos(188), description: "Sardines, noodles" },

  { id: "x10", customerId: "c6", source: "resort", at: CRM_NOW - 140 * DAY, amount: pesos(19_500), description: "Beach Loft, 2 nights" },
  { id: "x11", customerId: "c7", source: "shop", at: CRM_NOW - 70 * DAY, amount: pesos(390), description: "Coffee and pastry" },

  { id: "x12", customerId: "c8", source: "resort", at: CRM_NOW - 380 * DAY, amount: pesos(46_200), description: "Beach Loft, 4 nights" },
  { id: "x13", customerId: "c8", source: "resort", at: CRM_NOW - 350 * DAY, amount: pesos(38_100), description: "Garden Villa, 3 nights" },
  { id: "x14", customerId: "c8", source: "shop", at: CRM_NOW - 340 * DAY, amount: pesos(510), description: "Breakfast" },

  { id: "x15", customerId: "c9", source: "store", at: CRM_NOW - 6 * DAY, amount: pesos(96), description: "Coffee sachets" },
];

export const SEED_CONSENT: ConsentEvent[] = [
  { id: "k1", customerId: "c1", channel: "email", purpose: "marketing", granted: true, at: CRM_NOW - 300 * DAY, source: "booking form" },
  { id: "k2", customerId: "c1", channel: "sms", purpose: "marketing", granted: true, at: CRM_NOW - 300 * DAY, source: "booking form" },
  // Withdrawn later — the newer event is the one that counts.
  { id: "k3", customerId: "c1", channel: "sms", purpose: "marketing", granted: false, at: CRM_NOW - 30 * DAY, source: "STOP reply" },

  { id: "k4", customerId: "c5", channel: "email", purpose: "marketing", granted: true, at: CRM_NOW - 15 * DAY, source: "counter sign-up" },
  { id: "k5", customerId: "c8", channel: "email", purpose: "marketing", granted: false, at: CRM_NOW - 200 * DAY, source: "unsubscribe link" },
  { id: "k6", customerId: "c9", channel: "sms", purpose: "marketing", granted: true, at: CRM_NOW - 8 * DAY, source: "receipt opt-in" },
  // c4, c6 and c7 have no record at all — and so cannot be marketed to.
];

export const SOURCE_LABELS: Record<Transaction["source"], string> = {
  resort: "Resort",
  shop: "Coffee shop",
  store: "Store",
};
