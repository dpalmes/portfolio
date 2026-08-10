import { describe, expect, it } from "vitest";
import {
  AUTO_MERGE_THRESHOLD,
  contactPoint,
  editDistance,
  findDuplicates,
  matchCustomers,
  mergeCustomers,
  nameSimilarity,
  nameTokens,
  normaliseEmail,
  normalisePhone,
  preferredName,
  type Customer,
} from "./identity";
import {
  DEFAULT_SEGMENT_RULES,
  crossSellCandidates,
  segmentAll,
  segmentOf,
  statsFor,
  type Transaction,
} from "./segments";
import { canContact, consentStates, contactable, mergeConsent, type ConsentEvent } from "./consent";
import { pesos } from "../money";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

function customer(
  id: string,
  displayName: string,
  raws: string[],
  firstSeen = NOW - 30 * DAY,
): Customer {
  return {
    id,
    displayName,
    contacts: raws.flatMap((raw) => {
      const contact = contactPoint(raw);
      return contact ? [contact] : [];
    }),
    firstSeen,
    mergedFrom: [],
  };
}

describe("phone normalisation", () => {
  it("reduces every way of writing the same mobile to one form", () => {
    // Four people, four forms, one number.
    for (const raw of [
      "0917 123 4567",
      "+63 917 123 4567",
      "63917-123-4567",
      "9171234567",
      "(0917) 1234567",
    ]) {
      expect(normalisePhone(raw)).toBe("+639171234567");
    }
  });

  it("refuses shapes it does not recognise rather than guessing", () => {
    // A landline, a truncated number, and junk. Guessing here would merge
    // strangers who happen to share digits.
    expect(normalisePhone("02 8123 4567")).toBeNull();
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("not a phone")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });

  it("requires a Philippine mobile prefix", () => {
    expect(normalisePhone("0817 123 4567")).toBeNull();
  });
});

describe("email normalisation", () => {
  it("lowercases and trims", () => {
    expect(normaliseEmail("  Ana.Cruz@Example.COM ")).toBe("ana.cruz@example.com");
  });

  it("leaves dots and plus tags alone", () => {
    // Stripping them is right for some providers and wrong for others, and
    // being wrong merges two strangers.
    expect(normaliseEmail("a.cruz+resort@example.com")).toBe("a.cruz+resort@example.com");
  });

  it("rejects things that are not addresses", () => {
    expect(normaliseEmail("ana at example")).toBeNull();
    expect(normaliseEmail("@example.com")).toBeNull();
  });
});

describe("contact points", () => {
  it("classifies by shape", () => {
    expect(contactPoint("ana@example.com")?.kind).toBe("email");
    expect(contactPoint("0917 123 4567")?.kind).toBe("phone");
    expect(contactPoint("nonsense")).toBeNull();
  });

  it("keeps the raw form for display", () => {
    expect(contactPoint("0917 123 4567")?.raw).toBe("0917 123 4567");
  });
});

describe("name similarity", () => {
  it("tokenises, stripping punctuation and accents", () => {
    expect(nameTokens("Ana  Peña-Cruz")).toEqual(["ana", "pena", "cruz"]);
  });

  it("is 1 for the same name in different case", () => {
    expect(nameSimilarity("Ana Cruz", "ANA CRUZ")).toBe(1);
  });

  it("is symmetric", () => {
    expect(nameSimilarity("Ana Cruz", "Ana Dela Cruz")).toBeCloseTo(
      nameSimilarity("Ana Dela Cruz", "Ana Cruz"),
      10,
    );
  });

  it("scores a typo highly", () => {
    expect(nameSimilarity("Ana Cruz", "Anna Cruz")).toBeGreaterThan(0.85);
  });

  it("penalises an extra name token without dismissing it", () => {
    // "Ana Cruz" and "Ana Dela Cruz" may be the same person or two people.
    const score = nameSimilarity("Ana Cruz", "Ana Dela Cruz");
    expect(score).toBeGreaterThan(0.6);
    expect(score).toBeLessThan(1);
  });

  it("is low for different people", () => {
    expect(nameSimilarity("Ana Cruz", "Mario Santos")).toBeLessThan(0.4);
  });

  it("handles an empty name", () => {
    expect(nameSimilarity("", "Ana Cruz")).toBe(0);
  });

  it("computes edit distance correctly", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("same", "same")).toBe(0);
  });
});

describe("matching customers", () => {
  it("treats a shared phone as near-certain", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"]);
    const b = customer("c2", "ana dela cruz", ["+63 917 123 4567"]);

    const match = matchCustomers(a, b);
    expect(match.strength).toBe("certain");
    expect(match.score).toBeGreaterThanOrEqual(AUTO_MERGE_THRESHOLD);
    expect(match.reasons.join(" ")).toContain("Same phone");
  });

  it("treats a shared email as near-certain", () => {
    const a = customer("c1", "Ana Cruz", ["ana@example.com"]);
    const b = customer("c2", "A. Cruz", ["ANA@example.com"]);

    expect(matchCustomers(a, b).strength).toBe("certain");
  });

  it("will NOT auto-merge on an identical name alone", () => {
    // There are a great many people called Maria Santos, and welding two of
    // them together is harder to undo than leaving a duplicate.
    const a = customer("c1", "Maria Santos", ["0917 111 1111"]);
    const b = customer("c2", "Maria Santos", ["0918 222 2222"]);

    const match = matchCustomers(a, b);
    expect(match.score).toBeLessThan(AUTO_MERGE_THRESHOLD);
    expect(match.strength).toBe("review");
  });

  it("flags a shared phone with a very different name for review, not merge", () => {
    // A family handset, a shared office line, or a typo.
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"]);
    const b = customer("c2", "Roberto Bautista", ["0917 123 4567"]);

    const match = matchCustomers(a, b);
    expect(match.strength).toBe("review");
    expect(match.score).toBeLessThan(AUTO_MERGE_THRESHOLD);
    expect(match.reasons.join(" ")).toContain("Names do not match");
  });

  it("holds back a family sharing a handset, even with a shared surname", () => {
    // The case the demo caught. Relatives share both a surname and a phone, so
    // the name score sits in the middle — high enough that a "wildly different
    // names" rule misses it, low enough that these are clearly two people.
    const a = customer("c1", "Roberto Bautista", ["0920 444 4444"]);
    const b = customer("c2", "Elena Bautista", ["0920 444 4444"]);

    const match = matchCustomers(a, b);
    expect(match.strength).toBe("review");
    expect(match.score).toBeLessThan(AUTO_MERGE_THRESHOLD);
  });

  it("still treats an initial as the name it abbreviates", () => {
    // The fix above must not make "A. Cruz" and "Ana Cruz" look like strangers.
    expect(nameSimilarity("Ana Cruz", "A. Cruz")).toBeGreaterThan(0.9);

    const a = customer("c1", "Ana Cruz", ["ana@example.com"]);
    const b = customer("c2", "A. Cruz", ["ana@example.com"]);
    expect(matchCustomers(a, b).strength).toBe("certain");
  });

  it("does not treat an initial as matching a different name", () => {
    expect(nameSimilarity("Bautista R", "Bautista Elena")).toBeLessThan(0.8);
  });

  it("ignores two unrelated people", () => {
    const a = customer("c1", "Ana Cruz", ["0917 111 1111"]);
    const b = customer("c2", "Mario Bautista", ["0918 222 2222"]);

    expect(matchCustomers(a, b).strength).toBe("none");
  });

  it("always explains itself", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"]);
    const b = customer("c2", "Ana Cruz", ["+639171234567"]);
    expect(matchCustomers(a, b).reasons.length).toBeGreaterThan(0);
  });

  it("finds duplicates strongest first", () => {
    const people = [
      customer("c1", "Ana Cruz", ["0917 123 4567"]),
      customer("c2", "Ana Dela Cruz", ["+63 917 123 4567"]),
      customer("c3", "Maria Santos", ["0918 222 2222"]),
      customer("c4", "Maria Santos", ["0919 333 3333"]),
      customer("c5", "Jose Rizal", ["0920 444 4444"]),
    ];

    const duplicates = findDuplicates(people);
    expect(duplicates[0].match.strength).toBe("certain");
    expect([duplicates[0].a.id, duplicates[0].b.id].sort()).toEqual(["c1", "c2"]);
    // The two Maria Santoses are worth a look but must not be automatic.
    expect(duplicates.some((candidate) => candidate.match.strength === "review")).toBe(true);
    expect(duplicates.every((candidate) => candidate.match.strength !== "none")).toBe(true);
  });
});

describe("merging", () => {
  it("unions contact points without duplicating them", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567", "ana@example.com"]);
    const b = customer("c2", "Ana Dela Cruz", ["+639171234567", "ana.cruz@work.com"]);

    const merged = mergeCustomers(a, b);
    expect(merged.contacts).toHaveLength(3);
  });

  it("keeps the earlier first-seen date", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"], NOW - 10 * DAY);
    const b = customer("c2", "Ana Cruz", ["+639171234567"], NOW - 400 * DAY);

    // A merged customer has been a customer since their first visit, not since
    // somebody pressed merge.
    expect(mergeCustomers(a, b).firstSeen).toBe(NOW - 400 * DAY);
  });

  it("prefers the fuller name", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"]);
    const b = customer("c2", "Ana Dela Cruz", ["+639171234567"]);
    expect(mergeCustomers(a, b).displayName).toBe("Ana Dela Cruz");
  });

  it("records what it absorbed", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"]);
    const b = customer("c2", "Ana Cruz", ["+639171234567"]);

    // A merge that leaves no trace is a merge nobody can undo.
    expect(mergeCustomers(a, b).mergedFrom).toContain("c2");
  });

  it("carries forward ids from a previous merge", () => {
    const a = { ...customer("c1", "Ana", ["0917 123 4567"]), mergedFrom: ["c9"] };
    const b = { ...customer("c2", "Ana", ["0918 222 2222"]), mergedFrom: ["c8"] };

    expect(mergeCustomers(a, b).mergedFrom.sort()).toEqual(["c2", "c8", "c9"]);
  });

  it("keeps the primary id", () => {
    const a = customer("c1", "Ana Cruz", ["0917 123 4567"]);
    const b = customer("c2", "Ana Cruz", ["+639171234567"]);
    expect(mergeCustomers(a, b).id).toBe("c1");
  });
});

describe("customer stats", () => {
  const transactions: Transaction[] = [
    { id: "t1", customerId: "c1", source: "resort", at: NOW - 5 * DAY, amount: pesos(12_000), description: "" },
    { id: "t2", customerId: "c1", source: "shop", at: NOW - 20 * DAY, amount: pesos(400), description: "" },
    { id: "t3", customerId: "c1", source: "shop", at: NOW - 90 * DAY, amount: pesos(300), description: "" },
    { id: "t4", customerId: "c2", source: "store", at: NOW - 300 * DAY, amount: pesos(200), description: "" },
  ];

  it("summarises recency, frequency and value", () => {
    const stats = statsFor("c1", transactions, NOW);
    expect(stats.recencyDays).toBe(5);
    expect(stats.frequency).toBe(3);
    expect(stats.monetary).toBe(pesos(12_700));
    // Rounded to a whole centavo, because an average that carries a fraction
    // of one is not money.
    expect(stats.averageOrder).toBe(Math.round(pesos(12_700) / 3));
    expect(Number.isInteger(stats.averageOrder)).toBe(true);
  });

  it("records which businesses they used", () => {
    expect(statsFor("c1", transactions, NOW).sources.sort()).toEqual(["resort", "shop"]);
  });

  it("handles a customer with no purchases", () => {
    const stats = statsFor("nobody", transactions, NOW);
    expect(stats.frequency).toBe(0);
    expect(stats.monetary).toBe(0);
    expect(stats.recencyDays).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("segmentation", () => {
  const rules = DEFAULT_SEGMENT_RULES;
  const base = {
    customerId: "c1",
    averageOrder: 0,
    firstPurchase: NOW - 100 * DAY,
    lastPurchase: NOW,
    sources: [] as Transaction["source"][],
  };

  it("calls a high-value active customer a champion", () => {
    const result = segmentOf(
      { ...base, recencyDays: 5, frequency: 6, monetary: pesos(50_000) },
      rules,
    );
    expect(result.segment).toBe("champion");
  });

  it("calls a frequent active customer loyal", () => {
    const result = segmentOf(
      { ...base, recencyDays: 5, frequency: 4, monetary: pesos(900) },
      rules,
    );
    expect(result.segment).toBe("loyal");
  });

  it("puts recency ahead of value", () => {
    // Somebody who spent a fortune and vanished a year ago is lapsed with a
    // good history — not a champion. Treating them as one is how a "thanks for
    // your loyalty" message lands on somebody who left.
    const result = segmentOf(
      { ...base, recencyDays: 400, frequency: 9, monetary: pesos(90_000) },
      rules,
    );
    expect(result.segment).toBe("lapsed");
    expect(result.rationale).toContain("400 days");
  });

  it("flags a drifting regular as at risk", () => {
    const result = segmentOf(
      { ...base, recencyDays: 90, frequency: 5, monetary: pesos(5_000) },
      rules,
    );
    expect(result.segment).toBe("at-risk");
  });

  it("calls a single recent purchase new", () => {
    const result = segmentOf(
      { ...base, recencyDays: 2, frequency: 1, monetary: pesos(300) },
      rules,
    );
    expect(result.segment).toBe("new");
  });

  it("has a segment for somebody who has bought nothing", () => {
    const result = segmentOf(
      { ...base, recencyDays: Number.POSITIVE_INFINITY, frequency: 0, monetary: 0 },
      rules,
    );
    expect(result.segment).toBe("none");
  });

  it("always gives a rationale somebody can act on", () => {
    const result = segmentOf(
      { ...base, recencyDays: 90, frequency: 5, monetary: pesos(5_000) },
      rules,
    );
    expect(result.rationale.length).toBeGreaterThan(10);
  });

  it("sorts a segmented list by value", () => {
    const transactions: Transaction[] = [
      { id: "t1", customerId: "small", source: "store", at: NOW, amount: pesos(100), description: "" },
      { id: "t2", customerId: "big", source: "resort", at: NOW, amount: pesos(50_000), description: "" },
    ];
    const result = segmentAll(["small", "big"], transactions, rules, NOW);
    expect(result[0].customerId).toBe("big");
  });

  it("finds customers who used more than one business", () => {
    const transactions: Transaction[] = [
      { id: "t1", customerId: "c1", source: "resort", at: NOW, amount: pesos(9_000), description: "" },
      { id: "t2", customerId: "c1", source: "shop", at: NOW, amount: pesos(300), description: "" },
      { id: "t3", customerId: "c2", source: "store", at: NOW, amount: pesos(120), description: "" },
    ];

    const segmented = segmentAll(["c1", "c2"], transactions, rules, NOW);
    expect(crossSellCandidates(segmented).map((customer) => customer.customerId)).toEqual([
      "c1",
    ]);
  });
});

describe("consent", () => {
  const events: ConsentEvent[] = [
    { id: "e1", customerId: "c1", channel: "email", purpose: "marketing", granted: true, at: NOW - 100 * DAY, source: "booking form" },
    { id: "e2", customerId: "c1", channel: "sms", purpose: "marketing", granted: true, at: NOW - 100 * DAY, source: "booking form" },
    { id: "e3", customerId: "c1", channel: "sms", purpose: "marketing", granted: false, at: NOW - 2 * DAY, source: "STOP reply" },
  ];

  it("defaults to refusing when there is no record", () => {
    // Silence is not permission.
    const decision = canContact("stranger", "email", "marketing", events);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("No email marketing consent");
  });

  it("allows a channel that was consented to", () => {
    expect(canContact("c1", "email", "marketing", events).allowed).toBe(true);
  });

  it("honours a withdrawal, and the latest event wins", () => {
    const decision = canContact("c1", "sms", "marketing", events);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("STOP reply");
  });

  it("keeps channels separate", () => {
    // Unsubscribing from SMS does not unsubscribe from email.
    expect(canContact("c1", "email", "marketing", events).allowed).toBe(true);
    expect(canContact("c1", "sms", "marketing", events).allowed).toBe(false);
  });

  it("allows transactional messages without marketing consent", () => {
    // A booking confirmation is not marketing, and blocking it would withhold
    // from a customer the thing they asked for.
    expect(canContact("stranger", "email", "transactional", events).allowed).toBe(true);
  });

  it("reports the current state per channel with its source", () => {
    const states = consentStates("c1", events);
    const sms = states.find((state) => state.channel === "sms")!;
    expect(sms.granted).toBe(false);
    expect(sms.source).toBe("STOP reply");
  });

  it("filters an audience down to who may actually be contacted", () => {
    const audience = ["c1", "stranger"];
    expect(contactable(audience, "email", "marketing", events)).toEqual(["c1"]);
    expect(contactable(audience, "sms", "marketing", events)).toEqual([]);
  });

  it("carries consent to the surviving record on a merge", () => {
    const withSecondary: ConsentEvent[] = [
      ...events,
      { id: "e4", customerId: "c2", channel: "email", purpose: "marketing", granted: true, at: NOW, source: "counter" },
    ];

    const merged = mergeConsent("c1", "c2", withSecondary);
    expect(canContact("c1", "email", "marketing", merged).allowed).toBe(true);
    expect(merged.some((event) => event.customerId === "c2")).toBe(false);
  });

  it("does not resurrect consent that was withdrawn", () => {
    const withdrawn: ConsentEvent[] = [
      { id: "e1", customerId: "c1", channel: "email", purpose: "marketing", granted: true, at: NOW - 10 * DAY, source: "form" },
      { id: "e2", customerId: "c1", channel: "email", purpose: "marketing", granted: false, at: NOW - 1 * DAY, source: "unsubscribe" },
      { id: "e3", customerId: "c2", channel: "email", purpose: "marketing", granted: true, at: NOW - 5 * DAY, source: "form" },
    ];

    // c2 consented more recently than c1 withdrew — but c1's withdrawal is the
    // later event on the merged record, so it stands.
    const merged = mergeConsent("c1", "c2", withdrawn);
    expect(canContact("c1", "email", "marketing", merged).allowed).toBe(false);
  });
});

describe("preferred name on merge", () => {
  it("keeps the fuller name", () => {
    expect(preferredName("Ana Cruz", "Ana Dela Cruz")).toBe("Ana Dela Cruz");
  });

  it("keeps the properly written one when both carry the same amount", () => {
    // People type their name carefully on a booking form and carelessly at a
    // till. A CRM full of lowercase names looks broken even when it is right.
    expect(preferredName("ana dela cruz", "Ana Dela Cruz")).toBe("Ana Dela Cruz");
  });
});
