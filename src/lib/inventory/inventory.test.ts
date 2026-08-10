import { describe, expect, it } from "vitest";
import {
  costOfGoodsSold,
  ledgerFor,
  marginOf,
  positionOf,
  receive,
  reconciles,
  reorderAlerts,
  sell,
  totalStockValue,
  type Movement,
  type Product,
} from "./ledger";
import { buildReceipt, renderReceipt, settle, vatFromGross } from "./billing";
import { pesos } from "../money";

let counter = 0;
const nextId = () => `mv-${++counter}`;

function movement(
  sku: string,
  quantity: number,
  unitCost = 0,
  kind: Movement["kind"] = quantity > 0 ? "receipt" : "sale",
): Movement {
  return { id: nextId(), sku, kind, quantity, unitCost, at: 0, note: "" };
}

const PRODUCTS: Product[] = [
  {
    sku: "RICE-1KG",
    name: "Rice 1kg",
    unit: "pack",
    price: pesos(62),
    reorderPoint: 5,
    category: "Grocery",
  },
  {
    sku: "SARDINES",
    name: "Sardines",
    unit: "can",
    price: pesos(28),
    reorderPoint: 12,
    category: "Canned",
  },
];

describe("weighted average cost", () => {
  it("is the cost of a single delivery", () => {
    const position = positionOf("RICE-1KG", [movement("RICE-1KG", 10, pesos(50))]);
    expect(position.quantity).toBe(10);
    expect(position.averageCost).toBe(pesos(50));
  });

  it("re-averages when stock arrives at a different price", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("RICE-1KG", 10, pesos(60)),
    ];
    // Twenty packs, ₱1,100 of value — ₱55 each.
    expect(positionOf("RICE-1KG", movements).averageCost).toBe(pesos(55));
  });

  it("weights by quantity, not by delivery count", () => {
    const movements = [
      movement("RICE-1KG", 90, pesos(50)),
      movement("RICE-1KG", 10, pesos(100)),
    ];
    // A naive mean of the two prices would say ₱75. The right answer is ₱55.
    expect(positionOf("RICE-1KG", movements).averageCost).toBe(pesos(55));
  });

  it("is unchanged by a sale", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("RICE-1KG", -4),
    ];
    const position = positionOf("RICE-1KG", movements);
    expect(position.quantity).toBe(6);
    expect(position.averageCost).toBe(pesos(50));
  });

  it("resets once the stock runs out", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("RICE-1KG", -10),
    ];
    const position = positionOf("RICE-1KG", movements);
    expect(position.quantity).toBe(0);
    // Carrying the old average would make the next delivery average against
    // stock that is not there.
    expect(position.averageCost).toBe(0);

    const restocked = positionOf("RICE-1KG", [
      ...movements,
      movement("RICE-1KG", 5, pesos(70)),
    ]);
    expect(restocked.averageCost).toBe(pesos(70));
  });

  it("keeps stock value equal to quantity times average", () => {
    const movements = [
      movement("RICE-1KG", 7, pesos(53)),
      movement("RICE-1KG", 3, pesos(61)),
      movement("RICE-1KG", -2),
    ];
    const position = positionOf("RICE-1KG", movements);
    expect(position.stockValue).toBe(position.quantity * position.averageCost);
  });

  it("keeps positions of different products apart", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("SARDINES", 20, pesos(20)),
    ];
    expect(positionOf("RICE-1KG", movements).quantity).toBe(10);
    expect(positionOf("SARDINES", movements).quantity).toBe(20);
  });
});

describe("selling", () => {
  it("records a sale at the average cost of the day", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("RICE-1KG", 10, pesos(60)),
    ];

    const result = sell("RICE-1KG", 5, movements, nextId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.movement.quantity).toBe(-5);
      // Cost is captured at the moment of sale, so a later delivery cannot
      // rewrite the margin on a sale that already happened.
      expect(result.movement.unitCost).toBe(pesos(55));
    }
  });

  it("refuses to sell more than is on the shelf", () => {
    const movements = [movement("RICE-1KG", 3, pesos(50))];

    const result = sell("RICE-1KG", 5, movements, nextId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.available).toBe(3);
      expect(result.reason).toContain("Only 3");
    }
  });

  it("refuses to sell from an empty shelf", () => {
    const result = sell("RICE-1KG", 1, [], nextId);
    expect(result.ok).toBe(false);
  });

  it("refuses a fractional or negative quantity", () => {
    const movements = [movement("RICE-1KG", 10, pesos(50))];
    for (const quantity of [0, -3, 2.5]) {
      expect(sell("RICE-1KG", quantity, movements, nextId).ok).toBe(false);
    }
  });

  it("cannot be driven negative by repeated sales", () => {
    let movements: Movement[] = [movement("RICE-1KG", 5, pesos(50))];

    for (let attempt = 0; attempt < 10; attempt++) {
      const result = sell("RICE-1KG", 1, movements, nextId);
      if (result.ok) movements = [...movements, result.movement];
    }

    // Negative stock is the bug that silently destroys every downstream number.
    expect(positionOf("RICE-1KG", movements).quantity).toBe(0);
  });
});

describe("receiving", () => {
  it("records a delivery", () => {
    const result = receive("RICE-1KG", 20, pesos(48), nextId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.movement.quantity).toBe(20);
      expect(result.movement.kind).toBe("receipt");
    }
  });

  it("refuses a negative cost", () => {
    expect(receive("RICE-1KG", 5, -100, nextId).ok).toBe(false);
  });
});

describe("the ledger", () => {
  it("shows a running balance", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("RICE-1KG", -3),
      movement("RICE-1KG", 5, pesos(55)),
      movement("RICE-1KG", -2),
    ];

    expect(ledgerFor("RICE-1KG", movements).map((entry) => entry.balance)).toEqual([
      10, 7, 12, 10,
    ]);
  });

  it("excludes other products", () => {
    const movements = [movement("RICE-1KG", 10, pesos(50)), movement("SARDINES", 4, pesos(20))];
    expect(ledgerFor("RICE-1KG", movements)).toHaveLength(1);
  });

  it("reconciles: the position equals the sum of its movements", () => {
    // The invariant that makes the ledger worth keeping. If this fails, the
    // shelf and the screen disagree and nobody can say why.
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("RICE-1KG", -3),
      movement("RICE-1KG", 8, pesos(52)),
      movement("RICE-1KG", -6),
      movement("RICE-1KG", -1, 0, "spoilage"),
    ];

    expect(reconciles("RICE-1KG", movements)).toBe(true);
    expect(positionOf("RICE-1KG", movements).quantity).toBe(8);
  });

  it("reconciles across a long random history", () => {
    let movements: Movement[] = [];
    let expected = 0;
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

    for (let step = 0; step < 300; step++) {
      if (random() < 0.5) {
        const quantity = 1 + Math.floor(random() * 20);
        movements = [...movements, movement("RICE-1KG", quantity, pesos(40 + step % 20))];
        expected += quantity;
      } else {
        const quantity = 1 + Math.floor(random() * 10);
        const result = sell("RICE-1KG", quantity, movements, nextId);
        if (result.ok) {
          movements = [...movements, result.movement];
          expected -= quantity;
        }
      }
      expect(positionOf("RICE-1KG", movements).quantity).toBe(expected);
    }

    expect(reconciles("RICE-1KG", movements)).toBe(true);
  });

  it("totals cost of goods sold from the sales", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      { ...movement("RICE-1KG", -4), unitCost: pesos(50), kind: "sale" as const },
    ];
    expect(costOfGoodsSold(movements)).toBe(pesos(200));
  });

  it("values everything on hand", () => {
    const movements = [
      movement("RICE-1KG", 10, pesos(50)),
      movement("SARDINES", 20, pesos(20)),
    ];
    expect(totalStockValue(PRODUCTS, movements)).toBe(pesos(900));
  });
});

describe("reorder alerts", () => {
  it("flags stock at or below its reorder point", () => {
    const movements = [
      movement("RICE-1KG", 4, pesos(50)),
      movement("SARDINES", 40, pesos(20)),
    ];

    const alerts = reorderAlerts(PRODUCTS, movements);
    expect(alerts.map((alert) => alert.sku)).toEqual(["RICE-1KG"]);
  });

  it("flags a product that has run out", () => {
    expect(reorderAlerts(PRODUCTS, []).map((alert) => alert.sku)).toEqual([
      "RICE-1KG",
      "SARDINES",
    ]);
  });

  it("fires exactly at the reorder point, not one below it", () => {
    const movements = [movement("RICE-1KG", 5, pesos(50)), movement("SARDINES", 99, pesos(20))];
    expect(reorderAlerts(PRODUCTS, movements)).toHaveLength(1);
  });
});

describe("margin", () => {
  it("is price less average cost", () => {
    const margin = marginOf(pesos(62), pesos(50));
    expect(margin.amount).toBe(pesos(12));
    expect(margin.percent).toBeCloseTo(19.4, 1);
  });

  it("goes negative when stock cost more than it sells for", () => {
    expect(marginOf(pesos(50), pesos(60)).amount).toBe(pesos(-10));
  });
});

describe("VAT-inclusive billing", () => {
  it("extracts the tax already inside a gross price", () => {
    // ₱112 gross at 12% is ₱100 net and ₱12 VAT — NOT ₱112 plus ₱13.44.
    expect(vatFromGross(pesos(112), 12)).toBe(pesos(12));
  });

  it("keeps net plus VAT exactly equal to the total", () => {
    // The property a till has to satisfy. Rounding each part separately is how
    // a receipt ends up a centavo out.
    for (let gross = 1; gross <= 3000; gross += 7) {
      const vat = vatFromGross(gross, 12);
      const net = gross - vat;
      expect(net + vat).toBe(gross);
    }
  });

  it("builds a receipt whose parts add up", () => {
    const receipt = buildReceipt(
      [
        { sku: "RICE-1KG", name: "Rice 1kg", quantity: 2, unitPrice: pesos(62) },
        { sku: "SARDINES", name: "Sardines", quantity: 3, unitPrice: pesos(28) },
      ],
      { vatPercent: 12 },
    );

    expect(receipt.total).toBe(pesos(208));
    expect(receipt.net + receipt.vat).toBe(receipt.total);
    expect(receipt.lines[0].lineTotal).toBe(pesos(124));
  });

  it("takes VAT from the discounted total, not the full one", () => {
    const receipt = buildReceipt(
      [{ sku: "RICE-1KG", name: "Rice", quantity: 10, unitPrice: pesos(62) }],
      { vatPercent: 12, discount: pesos(20) },
    );

    expect(receipt.total).toBe(pesos(600));
    expect(receipt.net + receipt.vat).toBe(receipt.total);
  });

  it("will not discount below zero", () => {
    const receipt = buildReceipt(
      [{ sku: "RICE-1KG", name: "Rice", quantity: 1, unitPrice: pesos(62) }],
      { vatPercent: 12, discount: pesos(500) },
    );
    expect(receipt.total).toBe(0);
    expect(receipt.discount).toBe(pesos(62));
  });

  it("handles an empty basket", () => {
    const receipt = buildReceipt([], { vatPercent: 12 });
    expect(receipt.total).toBe(0);
    expect(receipt.vat).toBe(0);
  });

  it("computes change and refuses short payment", () => {
    const receipt = buildReceipt(
      [{ sku: "RICE-1KG", name: "Rice", quantity: 1, unitPrice: pesos(62) }],
      { vatPercent: 12 },
    );

    const paid = settle(receipt, pesos(100));
    expect(paid.sufficient).toBe(true);
    expect(paid.change).toBe(pesos(38));

    const short = settle(receipt, pesos(50));
    expect(short.sufficient).toBe(false);
    expect(short.change).toBe(0);
  });

  it("renders a receipt with the VAT broken out", () => {
    const receipt = buildReceipt(
      [{ sku: "RICE-1KG", name: "Rice 1kg", quantity: 2, unitPrice: pesos(62) }],
      { vatPercent: 12 },
    );

    const text = renderReceipt(receipt, "Aling Nena Store").join("\n");
    expect(text).toContain("ALING NENA STORE");
    expect(text).toContain("TOTAL");
    expect(text).toContain("VAT (12%) incl.");
  });
});
