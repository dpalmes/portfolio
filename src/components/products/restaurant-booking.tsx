"use client";

import { useMemo, useState, type ReactNode } from "react";
import { priceLine, type OrderLine } from "@/lib/dining/menu";
import {
  formatMinute,
  reserve,
  slotsFor,
  turnTimeFor,
  type Reservation,
} from "@/lib/dining/reservations";
import { formatPeso, sum } from "@/lib/money";
import { MENU, SERVICE_RULES, TABLES } from "@/content/product-fixtures";

/**
 * Reservations and menu for a coffee shop.
 *
 * The slot grid is the part worth watching: booking a table at 7pm greys out
 * 7:30 and 8:00 as well, because a party of four sits for ninety minutes. A
 * booking form that only blocks the exact time it was given will cheerfully
 * double-seat the same table.
 */
export function RestaurantBooking() {
  const [reservations, setReservations] = useState<Reservation[]>([
    { id: "r1", startMinute: 12 * 60, partySize: 4, tableIds: ["t3"], guestName: "Dela Cruz" },
    { id: "r2", startMinute: 19 * 60, partySize: 2, tableIds: ["t1"], guestName: "Garcia" },
    { id: "r3", startMinute: 19 * 60, partySize: 6, tableIds: ["t5"], guestName: "Lim" },
  ]);
  const [partySize, setPartySize] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const [order, setOrder] = useState<OrderLine[]>([]);

  const slots = useMemo(
    () => slotsFor(partySize, reservations, TABLES, SERVICE_RULES),
    [partySize, reservations],
  );

  const turnTime = turnTimeFor(partySize, SERVICE_RULES);

  const pricedOrder = order.map((line) => priceLine(line, MENU));
  const orderTotal = sum(
    pricedOrder.flatMap((result) => (result.ok ? [result.line.lineTotal] : [])),
  );

  const takeSlot = (startMinute: number) => {
    const result = reserve(
      { partySize, startMinute, guestName: guestName.trim() || "Walk-in" },
      reservations,
      TABLES,
      SERVICE_RULES,
      () => `r-${Date.now()}`,
    );

    if (result.ok) {
      setReservations((current) => [...current, result.reservation]);
      setMessage({
        kind: "ok",
        text: `Table ${result.reservation.tableIds.join(" + ")} held for ${partySize} at ${formatMinute(startMinute)} (${turnTime} min).`,
      });
      setGuestName("");
    } else {
      setMessage({ kind: "error", text: result.reason });
    }
  };

  const addToOrder = (itemId: string) => {
    const item = MENU.find((candidate) => candidate.id === itemId)!;
    // Required groups default to their first option so a click adds something
    // sensible; the engine still refuses a line with a required group unset.
    const selections: Record<string, string> = {};
    for (const group of item.modifierGroups) {
      if (group.required) selections[group.id] = group.options[0].id;
    }
    setOrder((current) => [...current, { itemId, quantity: 1, selections }]);
  };

  const setSelection = (index: number, groupId: string, optionId: string) =>
    setOrder((current) =>
      current.map((line, position) =>
        position === index
          ? { ...line, selections: { ...line.selections, [groupId]: optionId } }
          : line,
      ),
    );

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-end gap-4 border-b border-line p-4 sm:p-5">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Party size
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPartySize(size)}
                aria-pressed={size === partySize}
                className={`h-8 w-8 rounded border font-mono text-xs transition-colors ${
                  size === partySize
                    ? "border-accent bg-accent text-canvas"
                    : "border-line text-ink-muted hover:border-accent-line"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Name
          </span>
          <input
            type="text"
            value={guestName}
            placeholder="Walk-in"
            onChange={(event) => setGuestName(event.target.value)}
            className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          />
        </label>

        <p className="ml-auto font-mono text-xs text-ink-muted">
          turn time {turnTime} min
        </p>
      </div>

      <div className="border-b border-line p-4 sm:p-5">
        <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          Seatings
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-7">
          {slots.map((slot) => (
            <button
              key={slot.startMinute}
              type="button"
              disabled={!slot.available}
              onClick={() => takeSlot(slot.startMinute)}
              title={slot.available ? `Table ${slot.tableIds?.join(" + ")}` : slot.reason ?? ""}
              className={`rounded border px-1 py-2 font-mono text-xs transition-colors ${
                slot.available
                  ? "border-line text-ink hover:border-accent hover:text-accent"
                  : "cursor-not-allowed border-line/50 bg-raised/50 text-ink-faint line-through"
              }`}
            >
              {formatMinute(slot.startMinute)}
            </button>
          ))}
        </div>

        {message ? (
          <p
            role="status"
            className={`mt-3 text-sm ${message.kind === "ok" ? "text-good" : "text-bad"}`}
          >
            {message.text}
          </p>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Struck-through slots are genuinely unbookable, not merely outside
          opening hours. Book one and watch the following slots close too — a
          party occupies its table for the whole turn, not just the minute it
          arrives.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Menu
          </p>
          <div className="mt-3 space-y-2">
            {MENU.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-line p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {item.name}
                    {!item.available ? (
                      <span className="ml-2 font-mono text-[10px] text-bad">
                        sold out
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-muted">{item.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm text-ink">{formatPeso(item.basePrice)}</p>
                  <button
                    type="button"
                    disabled={!item.available}
                    onClick={() => addToOrder(item.id)}
                    className="mt-1 rounded border border-line px-2 py-0.5 text-xs text-ink-muted transition-colors hover:border-accent-line hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Order
          </p>
          {order.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Nothing added yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {order.map((line, index) => {
                const item = MENU.find((candidate) => candidate.id === line.itemId)!;
                const result = pricedOrder[index];
                return (
                  <div key={index} className="rounded-lg border border-line p-3">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-ink">{item.name}</span>
                      <span className="tabular text-sm text-ink">
                        {result.ok ? formatPeso(result.line.lineTotal) : "—"}
                      </span>
                    </div>

                    {item.modifierGroups.map((group) => (
                      <div key={group.id} className="mt-2 flex flex-wrap gap-1">
                        {group.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelection(index, group.id, option.id)}
                            aria-pressed={line.selections[group.id] === option.id}
                            className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                              line.selections[group.id] === option.id
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-line text-ink-muted hover:border-accent-line"
                            }`}
                          >
                            {option.name}
                            {option.priceDelta > 0
                              ? ` +${formatPeso(option.priceDelta)}`
                              : ""}
                          </button>
                        ))}
                      </div>
                    ))}

                    {!result.ok ? (
                      <p className="mt-2 text-xs text-bad">
                        {result.error.kind === "missing-modifier"
                          ? `Choose a ${result.error.groupName.toLowerCase()}.`
                          : "This item cannot be ordered."}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular">{formatPeso(orderTotal)}</span>
              </div>

              <button
                type="button"
                onClick={() => setOrder([])}
                className="text-xs text-ink-muted underline decoration-line underline-offset-4"
              >
                Clear order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ReactNode };
