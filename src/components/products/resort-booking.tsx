"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import {
  availabilityCalendar,
  book,
  checkAvailability,
  type Booking,
} from "@/lib/booking/availability";
import { addDays, nights } from "@/lib/booking/dates";
import { quote } from "@/lib/booking/pricing";
import { formatPeso } from "@/lib/money";
import { RATE_PLAN, ROOM_TYPES, seedBookings } from "@/content/product-fixtures";

/**
 * The booking side of a resort site.
 *
 * Deliberately small inventory — four villas, two suites, one loft — because a
 * property with a hundred rooms never runs out while you are looking at it, and
 * the refusal is the interesting part.
 */
export function ResortBooking() {
  // Fixed base date so the demo is identical for everyone and does not drift
  // as the seed bookings age past today.
  const today = "2026-03-02";

  const [bookings, setBookings] = useState<Booking[]>(() => seedBookings(today));
  const [roomTypeId, setRoomTypeId] = useState(ROOM_TYPES[0].id);
  const [checkIn, setCheckIn] = useState(addDays(today, 3));
  const [checkOut, setCheckOut] = useState(addDays(today, 6));
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const roomType = ROOM_TYPES.find((room) => room.id === roomTypeId)!;
  const stay = { checkIn, checkOut };
  const nightCount = nights(stay);

  const availability = useMemo(
    () => checkAvailability(roomType, stay, bookings),
    [roomType, checkIn, checkOut, bookings],
  );

  const priced = useMemo(() => quote(stay, RATE_PLAN), [checkIn, checkOut]);

  const calendar = useMemo(
    () =>
      availabilityCalendar(
        roomType,
        { checkIn: today, checkOut: addDays(today, 14) },
        bookings,
      ),
    [roomType, bookings],
  );

  const submit = () => {
    const result = book(
      roomType,
      stay,
      { name: name.trim() || "Guest", guests },
      bookings,
      () => `bk-${Date.now()}`,
    );

    if (result.ok) {
      setBookings((current) => [...current, result.booking]);
      setMessage({
        kind: "ok",
        text: `Booked — ${roomType.name}, ${nightCount} night${nightCount === 1 ? "" : "s"}, ${formatPeso(priced.total)}.`,
      });
      setName("");
    } else {
      setMessage({ kind: "error", text: result.refusal.message });
    }
  };

  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-6 border-b border-line p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Room type
          </p>
          <div className="mt-2 space-y-2">
            {ROOM_TYPES.map((room) => {
              const left = checkAvailability(room, stay, bookings);
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setRoomTypeId(room.id)}
                  aria-pressed={room.id === roomTypeId}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                    room.id === roomTypeId
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:border-accent-line"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {room.name}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      Sleeps {room.maxOccupancy} · {room.units} unit
                      {room.units === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      left.available ? "text-good" : "text-bad"
                    }`}
                  >
                    {left.available ? `${left.unitsLeft} left` : "full"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check in">
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
            </Field>
            <Field label="Check out">
              <input
                type="date"
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Guests">
              <input
                type="number"
                min={1}
                max={12}
                value={guests}
                onChange={(event) => setGuests(Number(event.target.value) || 1)}
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
            </Field>
            <Field label="Name">
              <input
                type="text"
                value={name}
                placeholder="Guest"
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
            </Field>
          </div>

          <Button onClick={submit} className="w-full">
            {nightCount > 0
              ? `Book ${nightCount} night${nightCount === 1 ? "" : "s"} · ${formatPeso(priced.total)}`
              : "Book"}
          </Button>

          {message ? (
            <p
              role="status"
              className={`text-sm ${message.kind === "ok" ? "text-good" : "text-bad"}`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            {roomType.name} · next 14 nights
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {calendar.map((night) => (
              <div
                key={night.date}
                title={`${night.date}: ${night.unitsLeft} of ${roomType.units} free`}
                className={`rounded p-1.5 text-center ${
                  night.unitsLeft === 0
                    ? "bg-bad/15 text-bad"
                    : night.unitsLeft < roomType.units
                      ? "bg-warn/15 text-warn"
                      : "bg-raised text-ink-muted"
                }`}
              >
                <span className="block font-mono text-[10px]">
                  {night.date.slice(8)}
                </span>
                <span className="block font-mono text-[11px] font-semibold">
                  {night.unitsLeft}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Free units per night, not per booking. A stay is refused only when
            every unit is taken on one of its nights — and the refusal names that
            night.
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Quote
          </p>
          {nightCount > 0 ? (
            <div className="mt-3 space-y-1 text-sm">
              {priced.nights.map((night) => (
                <div key={night.date} className="flex justify-between gap-3">
                  <span className="text-ink-muted">
                    {night.date}
                    {night.season ? (
                      <span className="ml-1.5 font-mono text-[10px] text-accent">
                        {night.season}
                      </span>
                    ) : null}
                    {night.weekend ? (
                      <span className="ml-1.5 font-mono text-[10px] text-warn">
                        weekend
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular text-ink">{formatPeso(night.amount)}</span>
                </div>
              ))}

              <div className="mt-2 space-y-1 border-t border-line pt-2">
                <Row label="Subtotal" value={formatPeso(priced.subtotal)} />
                {priced.discount > 0 ? (
                  <Row
                    label={`Length of stay (${priced.discountPercent}%)`}
                    value={`-${formatPeso(priced.discount)}`}
                    accent
                  />
                ) : null}
                <Row label={`Tax (${RATE_PLAN.taxPercent}%)`} value={formatPeso(priced.tax)} />
                <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold">
                  <span>Total</span>
                  <span className="tabular">{formatPeso(priced.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Check-out must be at least one night after check-in.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-line px-4 py-3 sm:px-5">
        <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          Reservations · {bookings.length}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-ink-muted">
          {bookings.slice(-6).map((entry) => (
            <li key={entry.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {entry.guestName} ·{" "}
                {ROOM_TYPES.find((room) => room.id === entry.roomTypeId)?.name}
              </span>
              <span className="font-mono">
                {entry.stay.checkIn} → {entry.stay.checkOut}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className={`tabular ${accent ? "text-accent" : "text-ink"}`}>{value}</span>
    </div>
  );
}
