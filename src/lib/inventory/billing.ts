/**
 * Receipts.
 *
 * Prices here are VAT *inclusive*, which is how they are displayed on a shelf
 * in the Philippines. That inverts the usual arithmetic: instead of adding tax
 * to a net price, the receipt has to extract the tax already inside a gross one.
 *
 * Getting that backwards is a common and expensive mistake. Adding 12% to a
 * gross price overstates VAT by roughly 1.4% of the sale, every sale, and the
 * error only surfaces when it is reconciled against a filing.
 */

import { formatPeso, sum, type Centavos } from "../money";

export interface ReceiptLine {
  sku: string;
  name: string;
  quantity: number;
  /** VAT-inclusive unit price. */
  unitPrice: Centavos;
  lineTotal: Centavos;
}

export interface Receipt {
  lines: ReceiptLine[];
  /** VAT-inclusive total — the number the customer actually pays. */
  total: Centavos;
  /** The portion of `total` that is VAT. */
  vat: Centavos;
  /** `total` minus `vat`. */
  net: Centavos;
  discount: Centavos;
  vatPercent: number;
}

/**
 * Pulls the VAT out of a gross amount.
 *
 * gross = net × (1 + rate), so vat = gross − gross ÷ (1 + rate). Rounding once,
 * at the end, keeps the identity `net + vat === gross` exactly true — which is
 * the property a receipt has to satisfy or the till does not balance.
 */
export function vatFromGross(gross: Centavos, vatPercent: number): Centavos {
  const net = Math.round(gross / (1 + vatPercent / 100));
  return gross - net;
}

export function buildReceipt(
  lines: readonly Omit<ReceiptLine, "lineTotal">[],
  options: { vatPercent: number; discount?: Centavos } = { vatPercent: 12 },
): Receipt {
  const priced: ReceiptLine[] = lines.map((line) => ({
    ...line,
    lineTotal: line.unitPrice * line.quantity,
  }));

  const gross = sum(priced.map((line) => line.lineTotal));
  const discount = Math.min(options.discount ?? 0, gross);
  const total = gross - discount;

  // VAT comes out of the discounted total. A discount reduces the sale, and the
  // tax follows the sale.
  const vat = vatFromGross(total, options.vatPercent);

  return {
    lines: priced,
    total,
    vat,
    net: total - vat,
    discount,
    vatPercent: options.vatPercent,
  };
}

export interface Payment {
  tendered: Centavos;
  change: Centavos;
  sufficient: boolean;
}

export function settle(receipt: Receipt, tendered: Centavos): Payment {
  return {
    tendered,
    change: Math.max(0, tendered - receipt.total),
    sufficient: tendered >= receipt.total,
  };
}

/** A plain-text receipt, the way a thermal printer would render it. */
export function renderReceipt(receipt: Receipt, shopName: string): string[] {
  const width = 34;
  const line = (left: string, right: string) =>
    `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;

  const out: string[] = [
    shopName.toUpperCase().padStart(Math.floor((width + shopName.length) / 2)),
    "-".repeat(width),
  ];

  for (const item of receipt.lines) {
    out.push(item.name);
    out.push(
      line(`  ${item.quantity} x ${formatPeso(item.unitPrice)}`, formatPeso(item.lineTotal)),
    );
  }

  out.push("-".repeat(width));
  if (receipt.discount > 0) {
    out.push(line("Discount", `-${formatPeso(receipt.discount)}`));
  }
  out.push(line("TOTAL", formatPeso(receipt.total)));
  out.push(line(`  VAT (${receipt.vatPercent}%) incl.`, formatPeso(receipt.vat)));
  out.push(line("  Net of VAT", formatPeso(receipt.net)));

  return out;
}
