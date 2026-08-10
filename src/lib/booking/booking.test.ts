import { describe, expect, it } from "vitest";
import {
  addDays,
  dayOfWeek,
  isIsoDate,
  isValidStay,
  isWeekend,
  nights,
  nightsOf,
  overlaps,
} from "./dates";
import {
  availabilityCalendar,
  book,
  checkAvailability,
  occupancyByNight,
  type Booking,
  type RoomType,
} from "./availability";
import { discountPercentFor, inSeason, quote, rateFor, type RatePlan } from "./pricing";
import { pesos } from "../money";

const VILLA: RoomType = {
  id: "villa",
  name: "Garden Villa",
  units: 3,
  maxOccupancy: 4,
  description: "",
};

const SUITE: RoomType = {
  id: "suite",
  name: "Ocean Suite",
  units: 1,
  maxOccupancy: 2,
  description: "",
};

let counter = 0;
const nextId = () => `bk-${++counter}`;

function booking(roomTypeId: string, checkIn: string, checkOut: string): Booking {
  return {
    id: nextId(),
    roomTypeId,
    stay: { checkIn, checkOut },
    guestName: "Guest",
    guests: 2,
  };
}

describe("stay dates", () => {
  it("counts nights, not days", () => {
    // Arriving Monday and leaving Wednesday is two nights, not three days.
    expect(nights({ checkIn: "2026-03-02", checkOut: "2026-03-04" })).toBe(2);
    expect(nightsOf({ checkIn: "2026-03-02", checkOut: "2026-03-04" })).toEqual([
      "2026-03-02",
      "2026-03-03",
    ]);
  });

  it("excludes the checkout date from the nights occupied", () => {
    expect(nightsOf({ checkIn: "2026-03-02", checkOut: "2026-03-03" })).toEqual([
      "2026-03-02",
    ]);
  });

  it("treats a same-day stay as no stay at all", () => {
    expect(nights({ checkIn: "2026-03-02", checkOut: "2026-03-02" })).toBe(0);
    expect(isValidStay({ checkIn: "2026-03-02", checkOut: "2026-03-02" })).toBe(false);
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(nights({ checkIn: "2026-12-30", checkOut: "2027-01-02" })).toBe(3);
  });

  it("handles a leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-00-10")).toBe(false);
    expect(isIsoDate("not-a-date")).toBe(false);
  });

  it("knows which nights are weekend nights", () => {
    // Friday and Saturday nights are the expensive ones; Sunday night is not.
    expect(dayOfWeek("2026-03-06")).toBe(5);
    expect(isWeekend("2026-03-06")).toBe(true); // Friday
    expect(isWeekend("2026-03-07")).toBe(true); // Saturday
    expect(isWeekend("2026-03-08")).toBe(false); // Sunday
  });
});

describe("overlap", () => {
  it("is true when two stays share a night", () => {
    expect(
      overlaps(
        { checkIn: "2026-03-02", checkOut: "2026-03-05" },
        { checkIn: "2026-03-04", checkOut: "2026-03-07" },
      ),
    ).toBe(true);
  });

  it("is FALSE when one checks out on the day the other checks in", () => {
    // The single most valuable case in the file. Treating the range as closed
    // refuses a booking the hotel can honour — on every changeover day, on
    // every room, silently.
    expect(
      overlaps(
        { checkIn: "2026-03-02", checkOut: "2026-03-05" },
        { checkIn: "2026-03-05", checkOut: "2026-03-08" },
      ),
    ).toBe(false);
  });

  it("is true when one stay contains the other", () => {
    expect(
      overlaps(
        { checkIn: "2026-03-01", checkOut: "2026-03-10" },
        { checkIn: "2026-03-04", checkOut: "2026-03-06" },
      ),
    ).toBe(true);
  });

  it("is symmetric", () => {
    const a = { checkIn: "2026-03-02", checkOut: "2026-03-05" };
    const b = { checkIn: "2026-03-04", checkOut: "2026-03-07" };
    expect(overlaps(a, b)).toBe(overlaps(b, a));
  });
});

describe("availability", () => {
  it("counts free units rather than treating any overlap as a refusal", () => {
    const bookings = [booking("villa", "2026-03-02", "2026-03-05")];

    const result = checkAvailability(VILLA, { checkIn: "2026-03-02", checkOut: "2026-03-05" }, bookings);

    // One of three villas is taken. A naive overlap check would refuse this.
    expect(result.available).toBe(true);
    expect(result.unitsLeft).toBe(2);
  });

  it("refuses only when every unit is taken", () => {
    const bookings = [
      booking("villa", "2026-03-02", "2026-03-05"),
      booking("villa", "2026-03-02", "2026-03-05"),
      booking("villa", "2026-03-02", "2026-03-05"),
    ];

    const result = checkAvailability(VILLA, { checkIn: "2026-03-03", checkOut: "2026-03-04" }, bookings);
    expect(result.available).toBe(false);
    expect(result.unitsLeft).toBe(0);
  });

  it("constrains on the busiest night, and says which one", () => {
    const bookings = [
      booking("villa", "2026-03-01", "2026-03-10"),
      booking("villa", "2026-03-01", "2026-03-10"),
      // Only the 4th is fully booked.
      booking("villa", "2026-03-04", "2026-03-05"),
    ];

    const result = checkAvailability(VILLA, { checkIn: "2026-03-02", checkOut: "2026-03-07" }, bookings);

    expect(result.available).toBe(false);
    expect(result.constrainedOn).toBe("2026-03-04");
  });

  it("frees the unit on the checkout date", () => {
    const bookings = [booking("suite", "2026-03-02", "2026-03-05")];

    // The suite is a single unit, and the departing guest leaves on the 5th.
    expect(
      checkAvailability(SUITE, { checkIn: "2026-03-05", checkOut: "2026-03-08" }, bookings)
        .available,
    ).toBe(true);
  });

  it("ignores bookings of other room types", () => {
    const bookings = [
      booking("suite", "2026-03-02", "2026-03-05"),
      booking("suite", "2026-03-02", "2026-03-05"),
    ];

    expect(
      checkAvailability(VILLA, { checkIn: "2026-03-02", checkOut: "2026-03-05" }, bookings)
        .unitsLeft,
    ).toBe(3);
  });

  it("counts occupancy per night across partially overlapping stays", () => {
    const bookings = [
      booking("villa", "2026-03-01", "2026-03-04"),
      booking("villa", "2026-03-03", "2026-03-06"),
    ];

    const occupancy = occupancyByNight(
      "villa",
      { checkIn: "2026-03-01", checkOut: "2026-03-06" },
      bookings,
    );

    expect(occupancy.get("2026-03-01")).toBe(1);
    expect(occupancy.get("2026-03-03")).toBe(2); // both stays cover this night
    expect(occupancy.get("2026-03-04")).toBe(1); // the first has checked out
    expect(occupancy.get("2026-03-05")).toBe(1);
  });

  it("produces a per-night calendar", () => {
    const calendar = availabilityCalendar(
      VILLA,
      { checkIn: "2026-03-01", checkOut: "2026-03-04" },
      [booking("villa", "2026-03-02", "2026-03-03")],
    );

    expect(calendar).toEqual([
      { date: "2026-03-01", unitsLeft: 3 },
      { date: "2026-03-02", unitsLeft: 2 },
      { date: "2026-03-03", unitsLeft: 3 },
    ]);
  });
});

describe("booking", () => {
  it("accepts a stay when units remain", () => {
    const result = book(
      VILLA,
      { checkIn: "2026-03-02", checkOut: "2026-03-05" },
      { name: "Ana", guests: 2 },
      [],
      nextId,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.booking.guestName).toBe("Ana");
      expect(nights(result.booking.stay)).toBe(3);
    }
  });

  it("refuses a stay of zero nights", () => {
    const result = book(
      VILLA,
      { checkIn: "2026-03-02", checkOut: "2026-03-02" },
      { name: "Ana", guests: 2 },
      [],
      nextId,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal.reason).toBe("invalid-dates");
  });

  it("refuses more guests than the room sleeps", () => {
    const result = book(
      SUITE,
      { checkIn: "2026-03-02", checkOut: "2026-03-04" },
      { name: "Ana", guests: 5 },
      [],
      nextId,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.reason).toBe("over-occupancy");
      expect(result.refusal.message).toContain("sleeps 2");
    }
  });

  it("names the night that blocked the stay", () => {
    const bookings = [booking("suite", "2026-03-04", "2026-03-05")];

    const result = book(
      SUITE,
      { checkIn: "2026-03-02", checkOut: "2026-03-07" },
      { name: "Ana", guests: 2 },
      bookings,
      nextId,
    );

    expect(result.ok).toBe(false);
    if (!result.ok && result.refusal.reason === "no-availability") {
      // A guest told "not available" gives up. A guest told which night is full
      // shifts by a day and books anyway.
      expect(result.refusal.constrainedOn).toBe("2026-03-04");
      expect(result.refusal.message).toContain("2026-03-04");
    }
  });

  it("cannot be talked into overbooking by repeated attempts", () => {
    let bookings: Booking[] = [];

    for (let attempt = 0; attempt < 6; attempt++) {
      const result = book(
        SUITE,
        { checkIn: "2026-03-02", checkOut: "2026-03-04" },
        { name: `Guest ${attempt}`, guests: 2 },
        bookings,
        nextId,
      );
      if (result.ok) bookings = [...bookings, result.booking];
    }

    // One unit means one booking, however many times somebody presses the button.
    expect(bookings).toHaveLength(1);
  });
});

describe("pricing", () => {
  const PLAN: RatePlan = {
    baseRate: pesos(4_000),
    weekendMultiplier: 1.25,
    seasons: [
      { id: "peak", name: "Peak", from: "12-15", to: "01-05", multiplier: 1.6 },
      { id: "high", name: "High", from: "03-01", to: "05-31", multiplier: 1.2 },
    ],
    lengthOfStayDiscounts: [
      { minNights: 3, percent: 5 },
      { minNights: 7, percent: 12 },
    ],
    taxPercent: 12,
  };

  it("charges the base rate on an ordinary weekday", () => {
    // Monday, outside every season.
    const night = rateFor("2026-02-02", PLAN);
    expect(night.amount).toBe(pesos(4_000));
    expect(night.season).toBeNull();
    expect(night.weekend).toBe(false);
  });

  it("applies a weekend uplift", () => {
    const night = rateFor("2026-02-06", PLAN); // Friday
    expect(night.weekend).toBe(true);
    expect(night.amount).toBe(pesos(5_000));
  });

  it("applies a seasonal multiplier", () => {
    const night = rateFor("2026-03-02", PLAN); // Monday in high season
    expect(night.season).toBe("High");
    expect(night.amount).toBe(pesos(4_800));
  });

  it("compounds season and weekend rather than taking the larger", () => {
    const night = rateFor("2026-03-06", PLAN); // Friday in high season
    // Taking only the larger multiplier would charge 4,800 and undercharge the
    // busiest nights of the year.
    expect(night.amount).toBe(pesos(6_000));
  });

  it("handles a season that wraps the year end", () => {
    expect(inSeason("2026-12-20", PLAN.seasons[0])).toBe(true);
    expect(inSeason("2026-01-02", PLAN.seasons[0])).toBe(true);
    expect(inSeason("2026-06-10", PLAN.seasons[0])).toBe(false);
  });

  it("picks the highest length-of-stay tier met", () => {
    expect(discountPercentFor(2, PLAN)).toBe(0);
    expect(discountPercentFor(3, PLAN)).toBe(5);
    expect(discountPercentFor(6, PLAN)).toBe(5);
    expect(discountPercentFor(7, PLAN)).toBe(12);
    expect(discountPercentFor(30, PLAN)).toBe(12);
  });

  it("itemises every night", () => {
    const result = quote({ checkIn: "2026-02-02", checkOut: "2026-02-05" }, PLAN);
    expect(result.nights).toHaveLength(3);
    expect(result.nights.map((night) => night.date)).toEqual([
      "2026-02-02",
      "2026-02-03",
      "2026-02-04",
    ]);
  });

  it("taxes the discounted amount, not the full one", () => {
    const result = quote({ checkIn: "2026-02-02", checkOut: "2026-02-05" }, PLAN);

    expect(result.subtotal).toBe(pesos(12_000));
    expect(result.discountPercent).toBe(5);
    expect(result.discount).toBe(pesos(600));
    expect(result.taxable).toBe(pesos(11_400));
    // Taxing the pre-discount subtotal would charge tax on money nobody paid.
    expect(result.tax).toBe(pesos(1_368));
    expect(result.total).toBe(pesos(12_768));
  });

  it("keeps the total exactly equal to its parts", () => {
    // Floating-point money drifts; integers do not. This is the invariant that
    // makes an invoice add up.
    for (const checkOut of ["2026-02-04", "2026-02-09", "2026-03-15", "2026-12-28"]) {
      const result = quote({ checkIn: "2026-02-02", checkOut }, PLAN);
      const nightTotal = result.nights.reduce((total, night) => total + night.amount, 0);

      expect(nightTotal).toBe(result.subtotal);
      expect(result.taxable).toBe(result.subtotal - result.discount);
      expect(result.total).toBe(result.taxable + result.tax);
      expect(Number.isInteger(result.total)).toBe(true);
    }
  });

  it("quotes nothing for a stay of no nights", () => {
    const result = quote({ checkIn: "2026-02-02", checkOut: "2026-02-02" }, PLAN);
    expect(result.nights).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
