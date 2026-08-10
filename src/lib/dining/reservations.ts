/**
 * Table reservations.
 *
 * The naive booking form offers every slot the restaurant is open and finds out
 * at the door whether there is a table. Doing it properly means answering, for
 * each slot, a harder question: is there a table — or a combination of tables —
 * that can seat this party for as long as they will be sitting there?
 *
 * Two things make that non-trivial. A party occupies a table for a *turn time*
 * that depends on its size, so a booking blocks more than the instant it names.
 * And seating two people at a table for eight is legal but ruinous: it burns
 * the only table that can take the next large party.
 */

export interface Table {
  id: string;
  seats: number;
  /** Tables that can be pushed together with this one. */
  combinesWith: readonly string[];
}

export interface Reservation {
  id: string;
  /** Minutes from midnight — comparable, sortable, and free of timezone lore. */
  startMinute: number;
  partySize: number;
  tableIds: readonly string[];
  guestName: string;
}

export interface ServiceRules {
  opensAtMinute: number;
  /** Last seating, not closing time. */
  lastSeatingMinute: number;
  slotIntervalMinutes: number;
  /** Turn time by party size, longest matching threshold wins. */
  turnTimes: ReadonlyArray<{ minPartySize: number; minutes: number }>;
  maxPartySize: number;
}

export function turnTimeFor(partySize: number, rules: ServiceRules): number {
  return rules.turnTimes
    .filter((rule) => partySize >= rule.minPartySize)
    .reduce((longest, rule) => Math.max(longest, rule.minutes), 0);
}

export function formatMinute(minute: number): string {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(minutes).padStart(2, "0")}${suffix}`;
}

/** Two bookings clash when their occupied intervals overlap at all. */
function clashes(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Tables busy at any point during the proposed sitting. */
export function occupiedTables(
  startMinute: number,
  endMinute: number,
  reservations: readonly Reservation[],
  rules: ServiceRules,
): Set<string> {
  const busy = new Set<string>();

  for (const reservation of reservations) {
    const reservationEnd =
      reservation.startMinute + turnTimeFor(reservation.partySize, rules);
    if (clashes(startMinute, endMinute, reservation.startMinute, reservationEnd)) {
      for (const tableId of reservation.tableIds) busy.add(tableId);
    }
  }

  return busy;
}

/**
 * Picks tables for a party, or returns null.
 *
 * Prefers the smallest single table that fits. Seating a party of two at a
 * table for eight is the classic covers-killer: it is available, it works, and
 * it costs the restaurant the only table that could have taken the next large
 * booking.
 *
 * Only when no single table fits does it try combining, and then it takes the
 * smallest workable pair for the same reason.
 */
export function assignTables(
  partySize: number,
  startMinute: number,
  reservations: readonly Reservation[],
  tables: readonly Table[],
  rules: ServiceRules,
): string[] | null {
  const endMinute = startMinute + turnTimeFor(partySize, rules);
  const busy = occupiedTables(startMinute, endMinute, reservations, rules);
  const free = tables.filter((table) => !busy.has(table.id));

  const singles = free
    .filter((table) => table.seats >= partySize)
    .sort((a, b) => a.seats - b.seats);
  if (singles.length > 0) return [singles[0].id];

  // Combinations, smallest total that seats the party.
  const freeIds = new Set(free.map((table) => table.id));
  let best: { ids: string[]; seats: number } | null = null;

  for (const table of free) {
    for (const partnerId of table.combinesWith) {
      if (!freeIds.has(partnerId)) continue;
      const partner = tables.find((candidate) => candidate.id === partnerId);
      if (!partner) continue;

      const seats = table.seats + partner.seats;
      if (seats < partySize) continue;
      if (best === null || seats < best.seats) {
        best = { ids: [table.id, partner.id].sort(), seats };
      }
    }
  }

  return best?.ids ?? null;
}

export interface Slot {
  startMinute: number;
  available: boolean;
  /** Why not, when it is not. */
  reason: string | null;
  tableIds: string[] | null;
}

/**
 * Every slot in the service, and whether it can genuinely be booked.
 *
 * Returning the unavailable ones with a reason rather than filtering them out
 * is deliberate: a diner who sees 7:00pm greyed out with "fully booked" knows
 * the restaurant is busy, whereas a list that silently skips it looks like the
 * restaurant does not open until 7:30.
 */
export function slotsFor(
  partySize: number,
  reservations: readonly Reservation[],
  tables: readonly Table[],
  rules: ServiceRules,
): Slot[] {
  const slots: Slot[] = [];

  for (
    let minute = rules.opensAtMinute;
    minute <= rules.lastSeatingMinute;
    minute += rules.slotIntervalMinutes
  ) {
    if (partySize > rules.maxPartySize) {
      slots.push({
        startMinute: minute,
        available: false,
        reason: `Parties over ${rules.maxPartySize} are by arrangement`,
        tableIds: null,
      });
      continue;
    }

    // A sitting that would run past the last seating is still fine — the last
    // seating is when you may be seated, not when you must leave.
    const tableIds = assignTables(partySize, minute, reservations, tables, rules);

    slots.push({
      startMinute: minute,
      available: tableIds !== null,
      reason: tableIds === null ? "Fully booked" : null,
      tableIds,
    });
  }

  return slots;
}

export type ReservationOutcome =
  | { ok: true; reservation: Reservation }
  | { ok: false; reason: string };

export function reserve(
  request: { partySize: number; startMinute: number; guestName: string },
  reservations: readonly Reservation[],
  tables: readonly Table[],
  rules: ServiceRules,
  idGenerator: () => string,
): ReservationOutcome {
  if (request.partySize < 1) {
    return { ok: false, reason: "A party needs at least one person." };
  }
  if (request.partySize > rules.maxPartySize) {
    return {
      ok: false,
      reason: `Parties over ${rules.maxPartySize} are by arrangement — please call.`,
    };
  }
  if (
    request.startMinute < rules.opensAtMinute ||
    request.startMinute > rules.lastSeatingMinute
  ) {
    return {
      ok: false,
      reason: `Seatings run from ${formatMinute(rules.opensAtMinute)} to ${formatMinute(rules.lastSeatingMinute)}.`,
    };
  }

  const tableIds = assignTables(
    request.partySize,
    request.startMinute,
    reservations,
    tables,
    rules,
  );
  if (tableIds === null) {
    return { ok: false, reason: `Fully booked at ${formatMinute(request.startMinute)}.` };
  }

  return {
    ok: true,
    reservation: {
      id: idGenerator(),
      startMinute: request.startMinute,
      partySize: request.partySize,
      tableIds,
      guestName: request.guestName,
    },
  };
}
