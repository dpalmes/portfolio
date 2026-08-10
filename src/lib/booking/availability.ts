/**
 * Availability: can this stay be sold, and how many units are left.
 *
 * The naive version asks "does the requested stay overlap an existing booking?"
 * and refuses if it does. That is wrong twice over. It refuses a stay when only
 * one of five identical rooms is taken, and it says nothing about which night
 * is the constraint — so a seven-night request fails without anyone being able
 * to say why.
 *
 * The right question is per night: on the busiest night of the requested range,
 * how many units of this room type are already occupied? If that number is
 * below the inventory count on every night, the stay can be sold.
 */

import { nightsOf, overlaps, type IsoDate, type Stay } from "./dates";

export interface RoomType {
  id: string;
  name: string;
  /** How many identical units exist. This is what makes it a count, not a flag. */
  units: number;
  maxOccupancy: number;
  description: string;
}

export interface Booking {
  id: string;
  roomTypeId: string;
  stay: Stay;
  guestName: string;
  guests: number;
}

export interface AvailabilityResult {
  available: boolean;
  /** Fewest free units across the requested nights. */
  unitsLeft: number;
  /** The night that constrains the stay, when there is one. */
  constrainedOn: IsoDate | null;
}

/** Occupied units of one room type, per night, across the given stay. */
export function occupancyByNight(
  roomTypeId: string,
  stay: Stay,
  bookings: readonly Booking[],
): Map<IsoDate, number> {
  const relevant = bookings.filter(
    (booking) => booking.roomTypeId === roomTypeId && overlaps(booking.stay, stay),
  );

  const counts = new Map<IsoDate, number>();
  for (const night of nightsOf(stay)) counts.set(night, 0);

  for (const booking of relevant) {
    for (const night of nightsOf(booking.stay)) {
      // Only nights inside the requested range matter; a booking may extend
      // beyond it in either direction.
      if (counts.has(night)) counts.set(night, counts.get(night)! + 1);
    }
  }

  return counts;
}

export function checkAvailability(
  roomType: RoomType,
  stay: Stay,
  bookings: readonly Booking[],
): AvailabilityResult {
  const occupancy = occupancyByNight(roomType.id, stay, bookings);

  let worstFree = roomType.units;
  let constrainedOn: IsoDate | null = null;

  for (const [night, occupied] of occupancy) {
    const free = roomType.units - occupied;
    if (free < worstFree) {
      worstFree = free;
      constrainedOn = night;
    }
  }

  return {
    available: worstFree > 0,
    unitsLeft: Math.max(0, worstFree),
    // Only worth naming a night when it is actually the binding constraint.
    constrainedOn: worstFree < roomType.units ? constrainedOn : null,
  };
}

export type BookingRefusal =
  | { reason: "invalid-dates"; message: string }
  | { reason: "no-availability"; message: string; constrainedOn: IsoDate | null }
  | { reason: "over-occupancy"; message: string };

export type BookingOutcome =
  | { ok: true; booking: Booking }
  | { ok: false; refusal: BookingRefusal };

/**
 * Attempts a booking against the current set.
 *
 * Returns a refusal rather than throwing, and the refusal says which night was
 * the problem. "Not available" is a dead end for a guest; "the 14th is the only
 * night we are full" lets them shift by a day and book anyway.
 */
export function book(
  roomType: RoomType,
  stay: Stay,
  guest: { name: string; guests: number },
  bookings: readonly Booking[],
  idGenerator: () => string,
): BookingOutcome {
  if (!isPositiveStay(stay)) {
    return {
      ok: false,
      refusal: {
        reason: "invalid-dates",
        message: "Check-out must be at least one night after check-in.",
      },
    };
  }

  if (guest.guests > roomType.maxOccupancy) {
    return {
      ok: false,
      refusal: {
        reason: "over-occupancy",
        message: `${roomType.name} sleeps ${roomType.maxOccupancy}; you asked for ${guest.guests}.`,
      },
    };
  }

  const availability = checkAvailability(roomType, stay, bookings);
  if (!availability.available) {
    return {
      ok: false,
      refusal: {
        reason: "no-availability",
        message: availability.constrainedOn
          ? `${roomType.name} is fully booked on ${availability.constrainedOn}.`
          : `${roomType.name} is fully booked for those dates.`,
        constrainedOn: availability.constrainedOn,
      },
    };
  }

  return {
    ok: true,
    booking: {
      id: idGenerator(),
      roomTypeId: roomType.id,
      stay,
      guestName: guest.name,
      guests: guest.guests,
    },
  };
}

function isPositiveStay(stay: Stay): boolean {
  return nightsOf(stay).length > 0;
}

/** Free units per night across a window, for a calendar view. */
export function availabilityCalendar(
  roomType: RoomType,
  window: Stay,
  bookings: readonly Booking[],
): Array<{ date: IsoDate; unitsLeft: number }> {
  const occupancy = occupancyByNight(roomType.id, window, bookings);
  return [...occupancy.entries()].map(([date, occupied]) => ({
    date,
    unitsLeft: Math.max(0, roomType.units - occupied),
  }));
}
