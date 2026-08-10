"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { buildReceipt, renderReceipt, settle } from "@/lib/inventory/billing";
import {
  ledgerFor,
  marginOf,
  positionOf,
  reconciles,
  reorderAlerts,
  sell,
  totalStockValue,
  type Movement,
} from "@/lib/inventory/ledger";
import { formatPeso } from "@/lib/money";
import { SEED_MOVEMENTS, STORE_PRODUCTS, VAT_PERCENT } from "@/content/product-fixtures";

/**
 * Till and stock book for a sari-sari store.
 *
 * Ringing up a sale writes a movement rather than decrementing a counter, so
 * the ledger below is the same data the quantities are derived from. The
 * reconciliation line is not decoration — it is the invariant being checked
 * live, and it is why the number on screen can be trusted against the shelf.
 */
export function StoreTill() {
  const [movements, setMovements] = useState<Movement[]>(SEED_MOVEMENTS);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [tendered, setTendered] = useState(0);
  const [ledgerSku, setLedgerSku] = useState(STORE_PRODUCTS[0].sku);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const positions = useMemo(
    () =>
      Object.fromEntries(
        STORE_PRODUCTS.map((product) => [product.sku, positionOf(product.sku, movements)]),
      ),
    [movements],
  );

  const receipt = useMemo(() => {
    const lines = Object.entries(basket)
      .filter(([, quantity]) => quantity > 0)
      .map(([sku, quantity]) => {
        const product = STORE_PRODUCTS.find((candidate) => candidate.sku === sku)!;
        return { sku, name: product.name, quantity, unitPrice: product.price };
      });
    return buildReceipt(lines, { vatPercent: VAT_PERCENT });
  }, [basket]);

  const payment = settle(receipt, tendered);
  const alerts = reorderAlerts(STORE_PRODUCTS, movements);
  const stockValue = totalStockValue(STORE_PRODUCTS, movements);
  const ledger = ledgerFor(ledgerSku, movements);
  const balances = reconciles(ledgerSku, movements);

  const addToBasket = (sku: string) => {
    const available = positions[sku].quantity;
    const current = basket[sku] ?? 0;
    if (current + 1 > available) {
      setMessage({ kind: "error", text: `Only ${available} ${sku} in stock.` });
      return;
    }
    setMessage(null);
    setBasket((state) => ({ ...state, [sku]: current + 1 }));
  };

  const checkout = () => {
    const entries = Object.entries(basket).filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) return;

    // Each line goes through `sell`, which refuses to take stock that is not
    // there — so a basket assembled before a delivery ran out still cannot
    // drive the ledger negative.
    let working = movements;
    const recorded: Movement[] = [];

    for (const [sku, quantity] of entries) {
      const result = sell(sku, quantity, working, () => `mv-${Date.now()}-${sku}`);
      if (!result.ok) {
        setMessage({ kind: "error", text: `${sku}: ${result.reason}` });
        return;
      }
      recorded.push(result.movement);
      working = [...working, result.movement];
    }

    setMovements(working);
    setBasket({});
    setTendered(0);
    setMessage({
      kind: "ok",
      text: `Sold ${recorded.length} line${recorded.length === 1 ? "" : "s"} · ${formatPeso(receipt.total)} · change ${formatPeso(payment.change)}`,
    });
  };

  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-6 border-b border-line p-4 sm:p-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Stock
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {STORE_PRODUCTS.map((product) => {
              const position = positions[product.sku];
              const margin = marginOf(product.price, position.averageCost);
              const low = position.quantity <= product.reorderPoint;

              return (
                <button
                  key={product.sku}
                  type="button"
                  onClick={() => addToBasket(product.sku)}
                  disabled={position.quantity === 0}
                  className="rounded-lg border border-line p-3 text-left transition-colors hover:border-accent-line disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{product.name}</span>
                    <span className="tabular text-sm text-ink">
                      {formatPeso(product.price)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 font-mono text-[11px]">
                    <span className={low ? "text-warn" : "text-ink-faint"}>
                      {position.quantity} {product.unit}
                      {position.quantity === 1 ? "" : "s"}
                      {low ? " · reorder" : ""}
                    </span>
                    <span className="text-ink-faint">
                      {/* With nothing on hand there is no average cost, and a
                          margin computed against zero reads as 100% — which is
                          worse than showing nothing. */}
                      {position.quantity > 0
                        ? `cost ${formatPeso(position.averageCost)} · ${margin.percent}%`
                        : "out of stock"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {alerts.length > 0 ? (
            <p className="mt-3 text-xs text-warn">
              {alerts.length} item{alerts.length === 1 ? "" : "s"} at or below reorder
              point: {alerts.map((alert) => alert.name).join(", ")}
            </p>
          ) : null}

          <p className="mt-3 font-mono text-xs text-ink-muted">
            stock at cost {formatPeso(stockValue)}
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Receipt
          </p>

          {receipt.lines.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              Tap an item to ring it up.
            </p>
          ) : (
            <pre className="mt-3 overflow-x-auto rounded border border-line bg-raised/40 p-3 font-mono text-[11px] leading-relaxed text-ink">
              {renderReceipt(receipt, "Aling Nena Store").join("\n")}
            </pre>
          )}

          <div className="mt-3 flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
                Cash
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={tendered / 100}
                onChange={(event) =>
                  setTendered(Math.round((Number(event.target.value) || 0) * 100))
                }
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <Button
              onClick={checkout}
              disabled={receipt.lines.length === 0 || !payment.sufficient}
            >
              {receipt.lines.length === 0
                ? "Checkout"
                : payment.sufficient
                  ? `Change ${formatPeso(payment.change)}`
                  : "Not enough"}
            </Button>
          </div>

          {message ? (
            <p
              role="status"
              className={`mt-3 text-sm ${message.kind === "ok" ? "text-good" : "text-bad"}`}
            >
              {message.text}
            </p>
          ) : null}

          {Object.values(basket).some((quantity) => quantity > 0) ? (
            <button
              type="button"
              onClick={() => setBasket({})}
              className="mt-2 text-xs text-ink-muted underline decoration-line underline-offset-4"
            >
              Clear basket
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Stock book
          </p>
          <select
            value={ledgerSku}
            onChange={(event) => setLedgerSku(event.target.value)}
            className="rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
          >
            {STORE_PRODUCTS.map((product) => (
              <option key={product.sku} value={product.sku}>
                {product.name}
              </option>
            ))}
          </select>
          <span
            className={`ml-auto font-mono text-xs ${balances ? "text-good" : "text-bad"}`}
          >
            {balances ? "reconciles ✓" : "does not reconcile"}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left font-mono text-xs">
            <thead className="text-ink-faint">
              <tr>
                <th className="pb-2 font-normal">Movement</th>
                <th className="pb-2 font-normal">Qty</th>
                <th className="pb-2 font-normal">Unit cost</th>
                <th className="pb-2 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-t border-line/60">
                  <td className="py-1.5">
                    {entry.kind}
                    {entry.note ? (
                      <span className="ml-2 text-ink-faint">{entry.note}</span>
                    ) : null}
                  </td>
                  <td className={entry.quantity > 0 ? "text-good" : "text-bad"}>
                    {entry.quantity > 0 ? "+" : ""}
                    {entry.quantity}
                  </td>
                  <td>{entry.unitCost ? formatPeso(entry.unitCost) : "—"}</td>
                  <td className="text-right text-ink">{entry.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          The quantity above is derived from these movements, not stored
          alongside them. That is what makes the difference between a count that
          is wrong and a count you can explain — and the reconciliation flag is
          the invariant being checked as you use it.
        </p>
      </div>
    </div>
  );
}
