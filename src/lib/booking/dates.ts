/**
 * Date handling for stays.
 *
 * Dates are plain `YYYY-MM-DD` strings, not `Date` objects. A stay is a
 * calendar concept: checking in on the 5th means the 5th, regardless of what
 * time zone the browser happens to be in. Using `Date` here is how a booking
 * made at 11pm in Manila becomes a booking for the previous day on a server in
 * UTC — and the bug only appears for guests booking late at night.
 */

export type IsoDate = string;

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLIS_PER_DAY = 86_400_000;

export function isIsoDate(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Days since the epoch. Arithmetic on this is exact; arithmetic on dates is not. */
export function toDayNumber(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MILLIS_PER_DAY);
}

export function fromDayNumber(dayNumber: number): IsoDate {
  const date = new Date(dayNumber * MILLIS_PER_DAY);
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** 0 is Sunday, 6 is Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(toDayNumber(date) * MILLIS_PER_DAY).getUTCDay();
}

export function isWeekend(date: IsoDate): boolean {
  const day = dayOfWeek(date);
  return day === 5 || day === 6; // Friday and Saturday nights
}

/**
 * A stay, half-open: the guest occupies `checkIn` up to but not including
 * `checkOut`.
 *
 * This is the single most important decision in the whole engine. A guest
 * checking out on the 5th and a guest checking in on the 5th share a date but
 * not a night, so treating the range as closed would refuse a booking the hotel
 * can absolutely honour — and would do it silently, on every changeover day, on
 * every room.
 */
export interface Stay {
  checkIn: IsoDate;
  checkOut: IsoDate;
}

export function nights(stay: Stay): number {
  return toDayNumber(stay.checkOut) - toDayNumber(stay.checkIn);
}

/** Every night occupied by the stay — that is, excluding the checkout date. */
export function nightsOf(stay: Stay): IsoDate[] {
  const count = nights(stay);
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => addDays(stay.checkIn, index));
}

/** True when the two stays share at least one night. */
export function overlaps(a: Stay, b: Stay): boolean {
  return (
    toDayNumber(a.checkIn) < toDayNumber(b.checkOut) &&
    toDayNumber(b.checkIn) < toDayNumber(a.checkOut)
  );
}

export function isValidStay(stay: Stay): boolean {
  return (
    isIsoDate(stay.checkIn) && isIsoDate(stay.checkOut) && nights(stay) > 0
  );
}
