/**
 * Stock as a ledger, not a number.
 *
 * The tempting design is a `quantity` column you increment and decrement. It is
 * also the design that leaves a shop owner staring at a figure that says 14
 * when the shelf holds 11, with no way to find out where the other three went.
 *
 * Here the movements are the truth and the quantity is derived from them. That
 * costs a fold over the history and buys the only question that matters when
 * the count is wrong: which movement was it?
 */

import type { Centavos } from "../money";

export type MovementKind = "receipt" | "sale" | "adjustment" | "spoilage";

export interface Movement {
  id: string;
  sku: string;
  kind: MovementKind;
  /** Positive for stock in, negative for stock out. Signed once, here. */
  quantity: number;
  /** Cost per unit, for receipts. Ignored for outward movements. */
  unitCost: Centavos;
  at: number;
  note: string;
}

export interface StockPosition {
  sku: string;
  quantity: number;
  /** Weighted average cost of what is currently on hand. */
  averageCost: Centavos;
  /** Quantity times average cost. */
  stockValue: Centavos;
}

export interface Product {
  sku: string;
  name: string;
  unit: string;
  /** Selling price, VAT inclusive — which is how prices are shown here. */
  price: Centavos;
  reorderPoint: number;
  category: string;
}

/**
 * Folds the movements into a position.
 *
 * Weighted average rather than FIFO. A sari-sari store buys the same sachet
 * from whichever supplier is cheapest that week and tips them into the same
 * box; there is no first-in to identify. Averaging matches what physically
 * happens, and it means a sale does not have to be matched against a
 * particular delivery.
 */
export function positionOf(sku: string, movements: readonly Movement[]): StockPosition {
  let quantity = 0;
  let averageCost = 0;

  for (const movement of movements) {
    if (movement.sku !== sku) continue;

    if (movement.quantity > 0) {
      // Incoming stock re-averages. Note this uses the *existing* quantity, so
      // the order of these two lines is load-bearing.
      const incomingValue = movement.quantity * movement.unitCost;
      const heldValue = quantity * averageCost;
      const newQuantity = quantity + movement.quantity;
      averageCost = newQuantity === 0 ? 0 : Math.round((heldValue + incomingValue) / newQuantity);
      quantity = newQuantity;
    } else {
      // Outgoing stock leaves at the average; it does not change the average.
      quantity += movement.quantity;
      if (quantity <= 0) {
        // Nothing on hand means no meaningful average. Carrying a stale one
        // makes the next delivery average against stock that is not there.
        quantity = 0;
        averageCost = 0;
      }
    }
  }

  return { sku, quantity, averageCost, stockValue: quantity * averageCost };
}

/** Running balance after each movement, for an auditable view. */
export function ledgerFor(
  sku: string,
  movements: readonly Movement[],
): Array<Movement & { balance: number }> {
  let balance = 0;
  return movements
    .filter((movement) => movement.sku === sku)
    .map((movement) => {
      balance += movement.quantity;
      return { ...movement, balance };
    });
}

export type StockOutcome =
  | { ok: true; movement: Movement }
  | { ok: false; reason: string; available: number };

/**
 * Records a sale, refusing to sell what is not there.
 *
 * Allowing the quantity to go negative is the single most common inventory bug.
 * It looks harmless — the sale went through — and it silently destroys every
 * downstream number: the stock value, the margin, and the reorder report that
 * was supposed to prevent this.
 */
export function sell(
  sku: string,
  quantity: number,
  movements: readonly Movement[],
  idGenerator: () => string,
  now = Date.now(),
): StockOutcome {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: "Quantity must be a whole number of units.", available: 0 };
  }

  const position = positionOf(sku, movements);
  if (position.quantity < quantity) {
    return {
      ok: false,
      reason: `Only ${position.quantity} in stock.`,
      available: position.quantity,
    };
  }

  return {
    ok: true,
    movement: {
      id: idGenerator(),
      sku,
      kind: "sale",
      quantity: -quantity,
      unitCost: position.averageCost,
      at: now,
      note: "Sale",
    },
  };
}

export function receive(
  sku: string,
  quantity: number,
  unitCost: Centavos,
  idGenerator: () => string,
  now = Date.now(),
): StockOutcome {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: "Quantity must be a whole number of units.", available: 0 };
  }
  if (unitCost < 0) {
    return { ok: false, reason: "Cost cannot be negative.", available: 0 };
  }

  return {
    ok: true,
    movement: {
      id: idGenerator(),
      sku,
      kind: "receipt",
      quantity,
      unitCost,
      at: now,
      note: "Delivery",
    },
  };
}

/** Cost of goods sold, from the outward movements. */
export function costOfGoodsSold(movements: readonly Movement[]): Centavos {
  return movements
    .filter((movement) => movement.kind === "sale")
    .reduce((total, movement) => total + Math.abs(movement.quantity) * movement.unitCost, 0);
}

export interface ReorderAlert {
  sku: string;
  name: string;
  quantity: number;
  reorderPoint: number;
}

export function reorderAlerts(
  products: readonly Product[],
  movements: readonly Movement[],
): ReorderAlert[] {
  return products
    .map((product) => ({
      sku: product.sku,
      name: product.name,
      quantity: positionOf(product.sku, movements).quantity,
      reorderPoint: product.reorderPoint,
    }))
    .filter((alert) => alert.quantity <= alert.reorderPoint);
}

/**
 * The invariant that makes the ledger trustworthy: the derived quantity must
 * equal the sum of the movements. Exposed rather than kept in the tests so the
 * application can assert it too — a reconciliation that only runs in CI is a
 * reconciliation nobody runs.
 */
export function reconciles(sku: string, movements: readonly Movement[]): boolean {
  const summed = movements
    .filter((movement) => movement.sku === sku)
    .reduce((total, movement) => total + movement.quantity, 0);
  return positionOf(sku, movements).quantity === Math.max(0, summed);
}

/** Margin on a sale at the given price, using the average cost carried. */
export function marginOf(price: Centavos, averageCost: Centavos): {
  amount: Centavos;
  percent: number;
} {
  const amount = price - averageCost;
  return {
    amount,
    percent: price === 0 ? 0 : Math.round((amount / price) * 1000) / 10,
  };
}

/** Value of everything on hand. */
export function totalStockValue(
  products: readonly Product[],
  movements: readonly Movement[],
): Centavos {
  return products.reduce(
    (total, product) => total + positionOf(product.sku, movements).stockValue,
    0,
  );
}
