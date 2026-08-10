/**
 * Whether you are allowed to contact somebody.
 *
 * A CRM that can segment a customer but cannot say whether it may email them is
 * a liability rather than an asset. Under the Data Privacy Act the burden is on
 * the business to show consent was given — so consent is stored as a record of
 * events with timestamps, not as a boolean somebody can flip.
 *
 * The design rule here is that permission must be *proved*, not assumed:
 * `canContact` starts from no and requires evidence, so a customer with no
 * consent record on file cannot be marketed to by accident.
 */

export type ConsentChannel = "email" | "sms" | "phone";
export type ConsentPurpose = "marketing" | "transactional";

export interface ConsentEvent {
  id: string;
  customerId: string;
  channel: ConsentChannel;
  purpose: ConsentPurpose;
  granted: boolean;
  at: number;
  /** Where the customer did this — a booking form, a reply, the counter. */
  source: string;
}

export interface ConsentState {
  channel: ConsentChannel;
  purpose: ConsentPurpose;
  granted: boolean;
  since: number;
  source: string;
}

/**
 * The current state per channel and purpose, from the event history.
 *
 * Latest event wins. Storing the history rather than the answer means a
 * withdrawal can be evidenced later — "they unsubscribed on the 3rd" is a fact
 * you can produce, where a flipped boolean is an assertion.
 */
export function consentStates(
  customerId: string,
  events: readonly ConsentEvent[],
): ConsentState[] {
  const latest = new Map<string, ConsentEvent>();

  for (const event of events) {
    if (event.customerId !== customerId) continue;
    const key = `${event.channel}:${event.purpose}`;
    const existing = latest.get(key);
    if (!existing || event.at >= existing.at) latest.set(key, event);
  }

  return [...latest.values()]
    .map((event) => ({
      channel: event.channel,
      purpose: event.purpose,
      granted: event.granted,
      since: event.at,
      source: event.source,
    }))
    .sort((a, b) => a.channel.localeCompare(b.channel));
}

export interface ContactDecision {
  allowed: boolean;
  reason: string;
}

/**
 * May this customer be contacted on this channel for this purpose?
 *
 * Transactional messages — a booking confirmation, a receipt — do not need
 * marketing consent, because the customer asked for the thing they are about.
 * Conflating the two is how businesses either spam people or fail to send them
 * their own booking reference.
 */
export function canContact(
  customerId: string,
  channel: ConsentChannel,
  purpose: ConsentPurpose,
  events: readonly ConsentEvent[],
): ContactDecision {
  if (purpose === "transactional") {
    return {
      allowed: true,
      reason: "Transactional messages relate to something the customer asked for.",
    };
  }

  const state = consentStates(customerId, events).find(
    (candidate) => candidate.channel === channel && candidate.purpose === "marketing",
  );

  if (!state) {
    // The default is no. Silence is not permission.
    return { allowed: false, reason: `No ${channel} marketing consent on file.` };
  }

  return state.granted
    ? { allowed: true, reason: `Consented via ${state.source}.` }
    : { allowed: false, reason: `Withdrawn — recorded via ${state.source}.` };
}

/**
 * Filters an audience down to the people you may actually contact.
 *
 * Exposed as a function so the check cannot be skipped by whoever builds the
 * campaign screen. A consent rule enforced only in the UI is a consent rule
 * that will be bypassed by the first export to a spreadsheet.
 */
export function contactable(
  customerIds: readonly string[],
  channel: ConsentChannel,
  purpose: ConsentPurpose,
  events: readonly ConsentEvent[],
): string[] {
  return customerIds.filter(
    (id) => canContact(id, channel, purpose, events).allowed,
  );
}

/** Consent carries over on a merge only where it was actually given. */
export function mergeConsent(
  primaryId: string,
  secondaryId: string,
  events: readonly ConsentEvent[],
): ConsentEvent[] {
  return events.map((event) =>
    event.customerId === secondaryId ? { ...event, customerId: primaryId } : event,
  );
}
