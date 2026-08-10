/**
 * Working out whether two records are the same person.
 *
 * This is the part of a CRM that is actually hard. Storing customers is a
 * table; knowing that "Ana Cruz" who booked a villa on 0917 123 4567 is the
 * same person as "ana dela cruz" who ordered coffee on +63 917 123 4567 is a
 * matching problem, and getting it wrong is expensive in both directions.
 *
 * Duplicates make lifetime value meaningless and send the same customer the
 * same message twice. Over-merging is worse: it welds two real people into one
 * record, and one of them starts seeing the other's history.
 *
 * So matching returns a score and a reason, never a bare boolean, and only
 * evidence that identifies a person — a phone number, an email — is allowed to
 * clear the automatic threshold. A similar name is a hint, not a decision.
 */

export interface ContactPoint {
  kind: "phone" | "email";
  /** As the customer gave it, kept for display. */
  raw: string;
  /** Comparable form. Matching happens on this. */
  normalised: string;
}

export interface Customer {
  id: string;
  displayName: string;
  contacts: ContactPoint[];
  firstSeen: number;
  /** Ids this record absorbed, so a merge can be explained or undone. */
  mergedFrom: string[];
}

// ------------------------------------------------------------ normalising

/**
 * Philippine mobile numbers, reduced to one form.
 *
 * The same number is written `0917 123 4567`, `+63 917 123 4567`,
 * `63917-123-4567` and `9171234567` by four different people on four different
 * forms. Comparing the strings finds nothing; comparing the digits finds
 * everybody.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  let national: string;
  if (digits.startsWith("63") && digits.length === 12) {
    national = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    // Not a shape we recognise. Returning null rather than guessing keeps a
    // landline or a typo from matching a mobile that happens to share digits.
    return null;
  }

  // Philippine mobile numbers are ten digits beginning with 9.
  if (national.length !== 10 || !national.startsWith("9")) return null;
  return `+63${national}`;
}

/**
 * Emails, lowercased and trimmed.
 *
 * Deliberately does *not* strip Gmail dots or `+tags`. Those normalisations are
 * true for some providers and false for others, and a rule that is wrong for
 * one provider merges two strangers. The conservative form is the safe one.
 */
export function normaliseEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function contactPoint(raw: string): ContactPoint | null {
  const email = normaliseEmail(raw);
  if (email) return { kind: "email", raw: raw.trim(), normalised: email };

  const phone = normalisePhone(raw);
  if (phone) return { kind: "phone", raw: raw.trim(), normalised: phone };

  return null;
}

/** Lowercased, punctuation stripped, whitespace collapsed. */
export function nameTokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .normalize("NFD")
    // Strip accents so "Peña" and "Pena" compare equal.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

// -------------------------------------------------------------- similarity

/** Levenshtein distance, iterative with a single row. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(substitution, previous[j] + 1, current[j - 1] + 1);
    }
    previous = current;
  }

  return previous[b.length];
}

/** 1 for identical, 0 for nothing in common. */
export function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  // An initial is a legitimate abbreviation, not a different name: "A. Cruz"
  // and "Ana Cruz" are the same person far more often than not. Without this,
  // edit distance scores them as barely related.
  const initial = a.length === 1 ? a : b.length === 1 ? b : null;
  if (initial) {
    const full = a.length === 1 ? b : a;
    return full.startsWith(initial) ? 0.9 : 0;
  }

  const distance = editDistance(a, b);
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - distance / longest;
}

/**
 * How alike two names are, 0 to 1.
 *
 * Symmetric and token-based: every token on each side is scored against its
 * best partner on the other, and the average is taken over both sides. That
 * makes "Ana Cruz" and "Ana Dela Cruz" score well but not perfectly — the extra
 * token costs something, which is right, because they might be two people.
 */
export function nameSimilarity(a: string, b: string): number {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (left.length === 0 || right.length === 0) return 0;

  const best = (token: string, against: string[]) =>
    against.reduce((highest, other) => Math.max(highest, tokenSimilarity(token, other)), 0);

  const leftScore = left.reduce((total, token) => total + best(token, right), 0);
  const rightScore = right.reduce((total, token) => total + best(token, left), 0);

  return (leftScore + rightScore) / (left.length + right.length);
}

// ----------------------------------------------------------------- matching

export type MatchStrength = "certain" | "review" | "none";

export interface Match {
  score: number;
  strength: MatchStrength;
  /** Plain-language justification, shown to whoever approves the merge. */
  reasons: string[];
}

/** Above this a merge is safe to apply without asking. */
export const AUTO_MERGE_THRESHOLD = 0.9;
/** Above this it is worth a human's attention. */
export const REVIEW_THRESHOLD = 0.5;

/**
 * Scores two customers against each other.
 *
 * Only a shared contact point can reach the automatic threshold. A name, however
 * similar, cannot — there are a great many people called Maria Santos, and
 * merging two of them is a harder mistake to undo than leaving a duplicate.
 */
export function matchCustomers(a: Customer, b: Customer): Match {
  if (a.id === b.id) {
    return { score: 1, strength: "certain", reasons: ["Same record"] };
  }

  const reasons: string[] = [];
  let score = 0;

  const sharedPhone = sharedContact(a, b, "phone");
  const sharedEmail = sharedContact(a, b, "email");

  if (sharedPhone) {
    score = Math.max(score, 0.97);
    reasons.push(`Same phone number (${sharedPhone})`);
  }
  if (sharedEmail) {
    score = Math.max(score, 0.95);
    reasons.push(`Same email address (${sharedEmail})`);
  }

  const names = nameSimilarity(a.displayName, b.displayName);
  if (names >= 0.95) {
    reasons.push("Names match");
  } else if (names >= 0.75) {
    reasons.push(`Names are similar (${Math.round(names * 100)}%)`);
  }

  if (!sharedPhone && !sharedEmail) {
    // No identifying evidence. A name alone tops out below the automatic
    // threshold on purpose, however identical it looks.
    score = Math.min(0.75, names * 0.8);
    if (names < 0.75) reasons.length = 0;
  } else if (names >= 0.75) {
    // A matching contact and a matching name is stronger than either alone.
    score = Math.min(0.99, score + 0.02);
  } else {
    // A shared contact point with names that do not agree is the household
    // case: a family handset, a shared office line, a couple using one address.
    // Roberto and Elena Bautista answer the same phone and are not the same
    // person, so this is held back for a human however strong the contact
    // evidence looks.
    score = Math.min(score, 0.7);
    reasons.push("Names do not match — could be a shared phone or address");
  }

  return {
    score: Number(score.toFixed(3)),
    strength:
      score >= AUTO_MERGE_THRESHOLD
        ? "certain"
        : score >= REVIEW_THRESHOLD
          ? "review"
          : "none",
    reasons,
  };
}

/**
 * Picks the better-written of two names for the same person.
 *
 * More tokens wins, because "Ana Dela Cruz" carries more than "Ana Cruz". When
 * they carry the same amount, the one that was typed properly wins — people
 * fill in their name carefully on a booking form and carelessly at a till, and
 * a CRM full of lowercase names looks broken even when it is correct.
 */
export function preferredName(a: string, b: string): string {
  const tokensA = nameTokens(a).length;
  const tokensB = nameTokens(b).length;
  if (tokensA !== tokensB) return tokensA > tokensB ? a : b;

  const capitals = (value: string) => value.replace(/[^A-Z]/g, "").length;
  return capitals(b) > capitals(a) ? b : a;
}

function sharedContact(
  a: Customer,
  b: Customer,
  kind: ContactPoint["kind"],
): string | null {
  const theirs = new Set(
    b.contacts.filter((contact) => contact.kind === kind).map((contact) => contact.normalised),
  );
  const hit = a.contacts.find(
    (contact) => contact.kind === kind && theirs.has(contact.normalised),
  );
  return hit?.normalised ?? null;
}

export interface MergeCandidate {
  a: Customer;
  b: Customer;
  match: Match;
}

/** Every pair worth acting on, strongest first. */
export function findDuplicates(customers: readonly Customer[]): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];

  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const match = matchCustomers(customers[i], customers[j]);
      if (match.strength !== "none") {
        candidates.push({ a: customers[i], b: customers[j], match });
      }
    }
  }

  return candidates.sort((left, right) => right.match.score - left.match.score);
}

/**
 * Combines two records into one.
 *
 * Keeps the earlier `firstSeen` — a merged customer has been a customer since
 * their first visit, not since the merge — unions the contact points, and
 * records what was absorbed so the operation can be explained later. A merge
 * that leaves no trace is a merge nobody can undo.
 */
export function mergeCustomers(primary: Customer, secondary: Customer): Customer {
  const seen = new Set(primary.contacts.map((contact) => contact.normalised));
  const contacts = [...primary.contacts];

  for (const contact of secondary.contacts) {
    if (!seen.has(contact.normalised)) {
      seen.add(contact.normalised);
      contacts.push(contact);
    }
  }

  return {
    id: primary.id,
    displayName: preferredName(primary.displayName, secondary.displayName),
    contacts,
    firstSeen: Math.min(primary.firstSeen, secondary.firstSeen),
    mergedFrom: [...primary.mergedFrom, secondary.id, ...secondary.mergedFrom],
  };
}
