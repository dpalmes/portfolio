import { describe, expect, it } from "vitest";
import {
  assignTables,
  formatMinute,
  occupiedTables,
  reserve,
  slotsFor,
  turnTimeFor,
  type Reservation,
  type ServiceRules,
  type Table,
} from "./reservations";
import { priceLine, type MenuItem } from "./menu";
import { pesos } from "../money";

const RULES: ServiceRules = {
  opensAtMinute: 11 * 60, // 11:00
  lastSeatingMinute: 21 * 60, // 21:00
  slotIntervalMinutes: 30,
  turnTimes: [
    { minPartySize: 1, minutes: 90 },
    { minPartySize: 5, minutes: 120 },
    { minPartySize: 9, minutes: 150 },
  ],
  maxPartySize: 12,
};

const TABLES: Table[] = [
  { id: "t1", seats: 2, combinesWith: ["t2"] },
  { id: "t2", seats: 2, combinesWith: ["t1", "t3"] },
  { id: "t3", seats: 4, combinesWith: ["t2"] },
  { id: "t4", seats: 6, combinesWith: [] },
];

let counter = 0;
const nextId = () => `rs-${++counter}`;

function reservation(
  startMinute: number,
  partySize: number,
  tableIds: string[],
): Reservation {
  return { id: nextId(), startMinute, partySize, tableIds, guestName: "Guest" };
}

describe("turn times", () => {
  it("grows with party size", () => {
    expect(turnTimeFor(2, RULES)).toBe(90);
    expect(turnTimeFor(6, RULES)).toBe(120);
    expect(turnTimeFor(10, RULES)).toBe(150);
  });

  it("takes the longest matching threshold", () => {
    // A party of nine matches all three rules; the longest must win.
    expect(turnTimeFor(9, RULES)).toBe(150);
  });
});

describe("occupancy", () => {
  it("marks a table busy for the whole turn, not just the start time", () => {
    const existing = [reservation(18 * 60, 2, ["t1"])]; // 6pm, 90 minutes

    // 7pm is inside that sitting even though no reservation starts then.
    expect(occupiedTables(19 * 60, 19 * 60 + 90, existing, RULES).has("t1")).toBe(true);
  });

  it("frees the table once the turn has finished", () => {
    const existing = [reservation(18 * 60, 2, ["t1"])]; // ends 7:30pm

    expect(occupiedTables(19 * 60 + 30, 21 * 60, existing, RULES).has("t1")).toBe(false);
  });

  it("treats back-to-back sittings as compatible", () => {
    const existing = [reservation(18 * 60, 2, ["t1"])];
    // Starting exactly when the previous party's turn ends is fine — the same
    // half-open reasoning as a hotel checkout.
    expect(occupiedTables(19 * 60 + 30, 21 * 60, existing, RULES).has("t1")).toBe(false);
  });
});

describe("table assignment", () => {
  it("uses the smallest table that fits", () => {
    // Seating two at the six-top would burn the only table for a large party.
    expect(assignTables(2, 18 * 60, [], TABLES, RULES)).toEqual(["t1"]);
    expect(assignTables(4, 18 * 60, [], TABLES, RULES)).toEqual(["t3"]);
  });

  it("moves up a size when the smaller tables are taken", () => {
    const existing = [
      reservation(18 * 60, 2, ["t1"]),
      reservation(18 * 60, 2, ["t2"]),
    ];
    expect(assignTables(2, 18 * 60, existing, TABLES, RULES)).toEqual(["t3"]);
  });

  it("combines tables when no single one is big enough", () => {
    // Nothing seats eight alone; t2 and t3 push together to make six... which
    // is still not enough, so this must fail rather than seat them badly.
    expect(assignTables(8, 18 * 60, [], TABLES, RULES)).toBeNull();
  });

  it("combines for a party that fits the combination", () => {
    const noSix: Table[] = TABLES.filter((table) => table.id !== "t4");
    // t2 (2) + t3 (4) = 6.
    expect(assignTables(6, 18 * 60, [], noSix, RULES)).toEqual(["t2", "t3"]);
  });

  it("will not combine tables that do not adjoin", () => {
    const apart: Table[] = [
      { id: "a", seats: 2, combinesWith: [] },
      { id: "b", seats: 2, combinesWith: [] },
    ];
    expect(assignTables(4, 18 * 60, [], apart, RULES)).toBeNull();
  });

  it("returns null when everything is occupied", () => {
    const existing = TABLES.map((table) => reservation(18 * 60, 2, [table.id]));
    expect(assignTables(2, 18 * 60, existing, TABLES, RULES)).toBeNull();
  });
});

describe("slots", () => {
  it("covers the service at the configured interval", () => {
    const slots = slotsFor(2, [], TABLES, RULES);
    expect(slots[0].startMinute).toBe(11 * 60);
    expect(slots.at(-1)!.startMinute).toBe(21 * 60);
    expect(slots).toHaveLength(21); // 11:00 to 21:00 every 30 minutes
  });

  it("marks a slot unavailable rather than hiding it", () => {
    const existing = TABLES.map((table) => reservation(19 * 60, 2, [table.id]));
    const slots = slotsFor(2, existing, TABLES, RULES);

    const seven = slots.find((slot) => slot.startMinute === 19 * 60)!;
    // Hiding it would make the restaurant look closed rather than busy.
    expect(seven.available).toBe(false);
    expect(seven.reason).toBe("Fully booked");
  });

  it("blocks the slots a long turn spills into", () => {
    const existing = TABLES.map((table) => reservation(19 * 60, 2, [table.id]));
    const slots = slotsFor(2, existing, TABLES, RULES);

    // The 7pm sitting runs to 8:30, so 7:30 and 8:00 are gone too.
    expect(slots.find((s) => s.startMinute === 19 * 60 + 30)!.available).toBe(false);
    expect(slots.find((s) => s.startMinute === 20 * 60)!.available).toBe(false);
    expect(slots.find((s) => s.startMinute === 20 * 60 + 30)!.available).toBe(true);
  });

  it("refuses a party over the maximum, on every slot", () => {
    const slots = slotsFor(20, [], TABLES, RULES);
    expect(slots.every((slot) => !slot.available)).toBe(true);
    expect(slots[0].reason).toContain("by arrangement");
  });

  it("reports which tables a slot would use", () => {
    const slots = slotsFor(2, [], TABLES, RULES);
    expect(slots[0].tableIds).toEqual(["t1"]);
  });
});

describe("reserving", () => {
  it("takes a booking and assigns tables", () => {
    const result = reserve(
      { partySize: 4, startMinute: 19 * 60, guestName: "Ana" },
      [],
      TABLES,
      RULES,
      nextId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.reservation.tableIds).toEqual(["t3"]);
  });

  it("refuses a second booking for the same table and time", () => {
    let reservations: Reservation[] = [];
    const single: Table[] = [{ id: "only", seats: 2, combinesWith: [] }];

    for (let attempt = 0; attempt < 4; attempt++) {
      const result = reserve(
        { partySize: 2, startMinute: 19 * 60, guestName: `Guest ${attempt}` },
        reservations,
        single,
        RULES,
        nextId,
      );
      if (result.ok) reservations = [...reservations, result.reservation];
    }

    expect(reservations).toHaveLength(1);
  });

  it("refuses a time outside the service", () => {
    const result = reserve(
      { partySize: 2, startMinute: 9 * 60, guestName: "Ana" },
      [],
      TABLES,
      RULES,
      nextId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Seatings run");
  });

  it("refuses an empty party", () => {
    const result = reserve(
      { partySize: 0, startMinute: 19 * 60, guestName: "Ana" },
      [],
      TABLES,
      RULES,
      nextId,
    );
    expect(result.ok).toBe(false);
  });

  it("points a very large party at the phone rather than failing silently", () => {
    const result = reserve(
      { partySize: 30, startMinute: 19 * 60, guestName: "Ana" },
      [],
      TABLES,
      RULES,
      nextId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("please call");
  });
});

describe("time formatting", () => {
  it("reads as a clock", () => {
    expect(formatMinute(11 * 60)).toBe("11:00am");
    expect(formatMinute(12 * 60)).toBe("12:00pm");
    expect(formatMinute(13 * 60 + 30)).toBe("1:30pm");
    expect(formatMinute(0)).toBe("12:00am");
  });
});

describe("menu pricing", () => {
  const ITEMS: MenuItem[] = [
    {
      id: "latte",
      name: "Latte",
      description: "",
      category: "Coffee",
      basePrice: pesos(150),
      available: true,
      modifierGroups: [
        {
          id: "size",
          name: "Size",
          required: true,
          options: [
            { id: "regular", name: "Regular", priceDelta: 0 },
            { id: "large", name: "Large", priceDelta: pesos(40) },
          ],
        },
        {
          id: "milk",
          name: "Milk",
          required: false,
          options: [
            { id: "fresh", name: "Fresh", priceDelta: 0 },
            { id: "oat", name: "Oat", priceDelta: pesos(30) },
          ],
        },
      ],
    },
    {
      id: "cake",
      name: "Ube Cake",
      description: "",
      category: "Pastry",
      basePrice: pesos(180),
      available: false,
      modifierGroups: [],
    },
  ];

  it("prices a plain item", () => {
    const result = priceLine(
      { itemId: "latte", quantity: 1, selections: { size: "regular" } },
      ITEMS,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.line.lineTotal).toBe(pesos(150));
  });

  it("adds modifier deltas to the unit price", () => {
    const result = priceLine(
      { itemId: "latte", quantity: 1, selections: { size: "large", milk: "oat" } },
      ITEMS,
    );
    if (result.ok) {
      expect(result.line.unitPrice).toBe(pesos(220));
      expect(result.line.modifiers).toHaveLength(2);
    }
  });

  it("multiplies after modifiers, not before", () => {
    const result = priceLine(
      { itemId: "latte", quantity: 3, selections: { size: "large" } },
      ITEMS,
    );
    // Three large lattes is 3 × 190, not 3 × 150 plus one upgrade.
    if (result.ok) expect(result.line.lineTotal).toBe(pesos(570));
  });

  it("refuses an item with a required modifier unchosen", () => {
    const result = priceLine({ itemId: "latte", quantity: 1, selections: {} }, ITEMS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("missing-modifier");
    }
  });

  it("allows an optional modifier to be omitted", () => {
    const result = priceLine(
      { itemId: "latte", quantity: 1, selections: { size: "regular" } },
      ITEMS,
    );
    expect(result.ok).toBe(true);
  });

  it("refuses an unavailable item", () => {
    const result = priceLine({ itemId: "cake", quantity: 1, selections: {} }, ITEMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unavailable");
  });

  it("refuses an unknown item", () => {
    const result = priceLine({ itemId: "nope", quantity: 1, selections: {} }, ITEMS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unknown-item");
  });

  it("refuses a nonsensical quantity", () => {
    for (const quantity of [0, -1, 1.5]) {
      const result = priceLine(
        { itemId: "latte", quantity, selections: { size: "regular" } },
        ITEMS,
      );
      expect(result.ok).toBe(false);
    }
  });

  it("keeps every amount an integer", () => {
    const result = priceLine(
      { itemId: "latte", quantity: 7, selections: { size: "large", milk: "oat" } },
      ITEMS,
    );
    if (result.ok) {
      expect(Number.isInteger(result.line.unitPrice)).toBe(true);
      expect(Number.isInteger(result.line.lineTotal)).toBe(true);
    }
  });
});
