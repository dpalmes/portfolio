/**
 * The menu, and what an order comes to.
 *
 * Modifiers are where menu pricing stops being a lookup: an oat-milk latte in a
 * large size is one item with two price adjustments, and the adjustments have
 * to survive being added up alongside a quantity.
 */

import { sum, type Centavos } from "../money";

export interface ModifierOption {
  id: string;
  name: string;
  /** Added to the base price. May be zero, or negative for a discount. */
  priceDelta: Centavos;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  options: readonly ModifierOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: Centavos;
  modifierGroups: readonly ModifierGroup[];
  available: boolean;
}

export interface OrderLine {
  itemId: string;
  quantity: number;
  /** Chosen option id per modifier group. */
  selections: Record<string, string>;
}

export interface PricedLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: Centavos;
  modifiers: Array<{ name: string; priceDelta: Centavos }>;
  lineTotal: Centavos;
}

export function findItem(items: readonly MenuItem[], id: string): MenuItem | undefined {
  return items.find((item) => item.id === id);
}

export type PricingError =
  | { kind: "unknown-item"; itemId: string }
  | { kind: "unavailable"; itemId: string }
  | { kind: "missing-modifier"; itemId: string; groupName: string }
  | { kind: "invalid-quantity"; itemId: string };

export type LinePricing =
  | { ok: true; line: PricedLine }
  | { ok: false; error: PricingError };

export function priceLine(line: OrderLine, items: readonly MenuItem[]): LinePricing {
  const item = findItem(items, line.itemId);
  if (!item) return { ok: false, error: { kind: "unknown-item", itemId: line.itemId } };
  if (!item.available) {
    return { ok: false, error: { kind: "unavailable", itemId: line.itemId } };
  }
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    return { ok: false, error: { kind: "invalid-quantity", itemId: line.itemId } };
  }

  const modifiers: Array<{ name: string; priceDelta: Centavos }> = [];

  for (const group of item.modifierGroups) {
    const chosenId = line.selections[group.id];
    if (!chosenId) {
      // A required group with nothing chosen is an incomplete order, not a
      // zero-cost one. Defaulting silently is how a customer is charged for a
      // size they never picked.
      if (group.required) {
        return {
          ok: false,
          error: { kind: "missing-modifier", itemId: item.id, groupName: group.name },
        };
      }
      continue;
    }

    const option = group.options.find((candidate) => candidate.id === chosenId);
    if (!option) {
      return {
        ok: false,
        error: { kind: "missing-modifier", itemId: item.id, groupName: group.name },
      };
    }
    modifiers.push({ name: option.name, priceDelta: option.priceDelta });
  }

  const unitPrice = item.basePrice + sum(modifiers.map((modifier) => modifier.priceDelta));

  return {
    ok: true,
    line: {
      itemId: item.id,
      name: item.name,
      quantity: line.quantity,
      unitPrice,
      modifiers,
      // Multiply after the modifiers are folded in, not before: two large
      // lattes cost twice the large price, not the base price twice plus one
      // size upgrade.
      lineTotal: unitPrice * line.quantity,
    },
  };
}

export function categories(items: readonly MenuItem[]): string[] {
  return [...new Set(items.map((item) => item.category))];
}
