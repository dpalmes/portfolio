/**
 * Case studies for the three product builds.
 *
 * Each describes an engine that exists in `src/lib` with tests beside it, and a
 * demo you can drive. The claims are checkable — where a case study says a rule
 * is enforced, there is a test named for it.
 */

import type { Project } from "./projects";
import { stats } from "./stats";

export const productProjects: Project[] = [
  {
    slug: "resort",
    kind: "product",
    title: "Resort booking",
    tagline: "Availability that counts units, not overlaps",
    domain: "Product · Booking · Pricing",
    stack: ["TypeScript", "React", "Vitest"],
    demoHref: "/lab/resort",
    testCount: stats.bookingTests,
    summary:
      "The booking half of a resort site: per-night availability across room types, seasonal and length-of-stay pricing, and refusals that name the night that blocked the stay rather than shrugging.",
    highlights: [
      "Availability is a per-night unit count, so one booking does not close a room type with four units",
      "Half-open stays — a guest checking out on the 5th frees the room for one checking in on the 5th",
      "Season and weekend multipliers compound; tax applies after the discount, not before",
      "Every amount is an integer number of centavos, so the total always equals the sum of its parts",
    ],
    sources: [
      "src/lib/booking/availability.ts",
      "src/lib/booking/pricing.ts",
      "src/lib/booking/booking.test.ts",
    ],
    sections: [
      {
        heading: "The overlap question is the wrong question",
        body: [
          "The obvious implementation asks whether the requested stay overlaps an existing booking, and refuses if it does. It is wrong twice. A property with four identical villas has one of them taken and the whole room type disappears from the search. And when a seven-night request fails, nobody — not the guest, not the person on the phone — can say which night was the problem.",
          "The right question is per night: on the busiest night of the requested range, how many units are already occupied? If that count is below the inventory on every night, the stay can be sold. It costs a fold over the nights and it buys both a correct answer and an explainable one.",
        ],
      },
      {
        heading: "The changeover day",
        body: [
          "A stay is half-open. The guest occupies the check-in date and every night after it, but not the check-out date — they are gone by mid-morning and the room is sold again that afternoon.",
          "Model the range as closed and the system refuses a booking the hotel can absolutely honour, on every changeover day, on every room, silently. It is not a dramatic bug: nothing errors, no log line appears, the room simply looks full and the revenue never arrives. There is a test named for exactly that case, and it is the most valuable one in the file.",
        ],
        note: "The same reasoning turns up in the restaurant engine, where a table is free the moment the previous party's turn ends. Half-open intervals are the correct default for anything that occupies time.",
      },
      {
        heading: "Money is not a decimal",
        body: [
          "Every amount is an integer number of centavos. Currency in a floating-point number is a bug waiting for a big enough invoice — seven nights, a seasonal multiplier, a percentage discount and 12% tax is more than enough arithmetic to leave a total a centavo away from the sum of its lines.",
          "Rounding happens in exactly one place, and the tests assert the identity that matters: subtotal minus discount equals taxable, taxable plus tax equals total, across a range of stays. An invoice that does not add up is the sort of thing a guest photographs.",
        ],
      },
      {
        heading: "What a refusal should say",
        body: [
          "A refusal returns the constraining night, and the interface says it. \"Not available\" is a dead end; \"the 14th is the only night we are full\" lets a guest shift by a day and book anyway.",
          "That is a product decision more than a technical one, but it is only available because the availability check was built to know the answer. An engine that returns a boolean cannot be asked a follow-up question later without being rewritten.",
        ],
      },
    ],
  },

  {
    slug: "restaurant",
    kind: "product",
    title: "Coffee shop",
    tagline: "Reservations that know a table is busy for ninety minutes",
    domain: "Product · Reservations · Menu",
    stack: ["TypeScript", "React", "Vitest"],
    demoHref: "/lab/restaurant",
    testCount: stats.diningTests,
    summary:
      "Table reservations with turn times and table combining, plus a menu whose modifiers actually affect the price. Slots are offered only when a real table can seat the party for as long as it will be sitting there.",
    highlights: [
      "Turn time scales with party size, so a booking blocks the slots it spills into",
      "Smallest table that fits, and combining only when nothing single will do",
      "Unavailable slots are shown with a reason rather than hidden, so a busy service does not look like a closed one",
      "Menu modifiers fold into the unit price before quantity, so two large lattes cost twice the large price",
    ],
    sources: [
      "src/lib/dining/reservations.ts",
      "src/lib/dining/menu.ts",
      "src/lib/dining/dining.test.ts",
    ],
    sections: [
      {
        heading: "A booking is longer than the time it names",
        body: [
          "A reservation form that offers every half hour the shop is open, and blocks only the exact time somebody booked, will double-seat the same table before lunch. A party of four sits for ninety minutes; a party of nine sits for two and a half hours. The booking occupies a range, and every slot overlapping that range has to close with it.",
          "Once turn times vary by party size, the available slots depend on who is asking. The same 7pm can be free for two and impossible for eight — not because of a rule, but because of what will physically fit.",
        ],
      },
      {
        heading: "Seating two people at the table for eight",
        body: [
          "Any free table with enough seats is a legal answer, and the largest one is the worst. It burns the only table that could have taken the next big booking, and it does so invisibly: the reservation succeeds, the guests are seated, and the party of eight that rings an hour later is turned away for no reason anybody can see.",
          "The allocator takes the smallest single table that fits, and only tries combining when nothing single will do — then takes the smallest workable combination for the same reason. Tables can only combine with the ones they physically adjoin, which is a property of the room rather than the software, so it lives in the data.",
        ],
        note: "The demo shows which table each slot would use. Book a four-top and watch the six-top stay free for the party that needs it.",
      },
      {
        heading: "Show the closed doors",
        body: [
          "Unavailable slots are returned with a reason rather than filtered out. A list that silently skips 7pm looks like a restaurant that does not open until 7:30; a struck-through 7pm marked \"fully booked\" tells a diner the place is worth queueing for.",
          "It is a one-line difference in the return type and it changes what the interface is able to say.",
        ],
      },
      {
        heading: "Modifiers are pricing, not decoration",
        body: [
          "An oat-milk latte in a large size is one item with two price adjustments, and the adjustments have to survive being multiplied by a quantity. Folding them into the unit price before multiplying is the only order that gives the right answer — three large lattes is three times the large price, not three times the base price plus a single upgrade.",
          "A required modifier group with nothing chosen is an incomplete order rather than a zero-cost one. Defaulting silently is how a customer is charged for a size they never picked.",
        ],
      },
    ],
  },

  {
    slug: "store",
    kind: "product",
    title: "Sari-sari store",
    tagline: "Stock as a ledger, so a wrong count can be explained",
    domain: "Product · Inventory · Billing",
    stack: ["TypeScript", "React", "Vitest"],
    demoHref: "/lab/store",
    testCount: stats.inventoryTests,
    summary:
      "Inventory, costing and billing for a neighbourhood shop. Quantities are derived from stock movements rather than stored, costs are weighted-average, and receipts extract VAT from prices that already include it.",
    highlights: [
      "Movements are the record; the quantity is a fold over them, so every count can be traced",
      "Weighted-average costing, re-averaged on each delivery and captured at the moment of sale",
      "Stock cannot go negative — the bug that silently destroys stock value, margin and the reorder report",
      "VAT extracted from tax-inclusive prices, with net plus VAT exactly equal to the total",
    ],
    sources: [
      "src/lib/inventory/ledger.ts",
      "src/lib/inventory/billing.ts",
      "src/lib/inventory/inventory.test.ts",
    ],
    sections: [
      {
        heading: "A quantity column cannot answer the question",
        body: [
          "The tempting design is a number you increment on delivery and decrement on sale. It is also the design that leaves a shop owner looking at a figure that says 14 when the shelf holds 11, with nothing to check it against.",
          "Storing the movements and deriving the quantity costs a fold and buys the only question worth asking when the count is wrong: which movement was it? The demo shows the running balance beside the movements that produced it, and asserts live that the two agree.",
        ],
        note: "The reconciliation flag in the demo is the invariant being checked as you use it, not a label. It is exported from the engine deliberately — a reconciliation that only runs in CI is a reconciliation nobody runs.",
      },
      {
        heading: "Weighted average, and why not FIFO",
        body: [
          "A sari-sari store buys the same sachets from whichever supplier was cheapest that week and tips them into the same box. There is no first-in to identify, so FIFO would be a fiction maintained in software about a physical situation that does not support it.",
          "Weighted average matches what actually happens, and it means a sale does not have to be matched against a particular delivery. Two deliveries of rice at ₱48 and ₱54 produce an average that is neither — weighted by quantity, not by delivery, which is a distinction that quietly matters when one delivery is nine times the size of the other.",
          "The cost is captured onto the sale movement at the moment it happens, so a later delivery cannot rewrite the margin on a sale that already went through.",
        ],
      },
      {
        heading: "Negative stock is the expensive bug",
        body: [
          "Letting a quantity go below zero looks harmless — the sale went through, the customer left happy. It silently corrupts everything downstream: the stock valuation, the margin, and the reorder report that existed to prevent exactly this.",
          "Every sale goes through a function that refuses to take stock that is not there, and returns how much there actually is. There is a test that hammers it ten times against five units and asserts the balance lands on zero rather than minus five.",
        ],
      },
      {
        heading: "VAT the other way round",
        body: [
          "Prices on a shelf in the Philippines include VAT. That inverts the usual arithmetic: instead of adding tax to a net price, the receipt has to extract the tax already inside a gross one.",
          "Adding 12% to a tax-inclusive price overstates the VAT by about 1.4% of every sale, and the error surfaces only when somebody reconciles against a filing. The engine divides rather than multiplies, rounds once, and the tests assert that net plus VAT equals the total exactly — across hundreds of amounts, because that is the property a till has to satisfy or the drawer does not balance.",
        ],
      },
    ],
  },
  {
    slug: "crm",
    kind: "product",
    title: "CRM",
    tagline: "Knowing that three records are one person",
    domain: "Product · Identity · Consent",
    stack: ["TypeScript", "React", "Vitest"],
    demoHref: "/lab/crm",
    testCount: stats.crmTests,
    summary:
      "One CRM across the resort, the coffee shop and the store. Scored identity resolution rather than a customer table, segments derived from transactions rather than tags, and consent that has to be proved before anybody can be contacted.",
    highlights: [
      "Matching returns a score and a reason, and only a shared phone or email can clear the automatic threshold",
      "Two people who share a name are flagged for review and never merged automatically",
      "Segments are recomputed from transactions, so nobody's opinion of a customer can go stale",
      "Consent defaults to no and is stored as events, so a withdrawal can be evidenced rather than asserted",
    ],
    sources: [
      "src/lib/crm/identity.ts",
      "src/lib/crm/segments.ts",
      "src/lib/crm/consent.ts",
      "src/lib/crm/crm.test.ts",
    ],
    sections: [
      {
        heading: "The customer table is not the hard part",
        body: [
          "Storing customers is a table with a name and a phone number in it. The hard part is knowing that the Ana Cruz who booked a villa on 0917 123 4567 is the same person as the ana dela cruz who ordered coffee on +63 917 123 4567 and the Ana Dela Cruz who bought groceries with an email address.",
          "Until those three records are one, her lifetime value is split three ways and none of the three looks like a customer worth keeping. She gets the same campaign three times, and the resort has no idea she is also a regular at the coffee shop.",
        ],
      },
      {
        heading: "Wrong in both directions",
        body: [
          "Duplicates are the obvious failure, and the one everybody tries to fix. The less obvious failure is worse: over-merging welds two real people into one record, and one of them starts seeing the other's history. That is a data-protection incident, not a tidy-up.",
          "So matching returns a score and a plain-language reason rather than a boolean, and the threshold for merging automatically can only be reached by evidence that identifies a person — a phone number or an email address. A similar name is a hint. There are a great many people called Maria Santos, and two of them in the demo score high enough to review and never high enough to merge.",
        ],
        note: "A shared phone with a very different name is also held back for review. It is usually a household handset or a shop's landline, and merging Roberto and Elena Bautista because they answer the same phone would be exactly the mistake the threshold exists to prevent.",
      },
      {
        heading: "Normalising the things that identify people",
        body: [
          "The same Philippine mobile number is written 0917 123 4567, +63 917 123 4567, 63917-123-4567 and 9171234567 by four different people on four different forms. Comparing the strings finds nothing; reducing them all to one form finds everybody. Anything that does not fit a recognised shape returns nothing rather than a guess, because a guess merges strangers who happen to share digits.",
          "Email normalisation stops at lowercasing and trimming. Stripping Gmail's dots and plus-tags is correct for Gmail and wrong for providers that treat them as distinct, and a rule that is wrong for one provider merges two people who have never met.",
        ],
      },
      {
        heading: "Segments nobody has to maintain",
        body: [
          "Recency, frequency and monetary value, computed from the transactions that already exist. Nobody tags a customer as loyal, so nobody's opinion of them can drift out of date — the segment is a function of what they actually did, recalculated every time it is asked for.",
          "The ordering encodes a judgement: recency dominates. Somebody who spent a fortune and has not been seen for a year is a lapsed customer with a good history, not a champion. Getting that the wrong way round is how a message thanking somebody for their loyalty lands on a person who left months ago.",
        ],
      },
      {
        heading: "Consent has to be proved, not assumed",
        body: [
          "A CRM that can segment a customer but cannot say whether it may email them is a liability. Consent is stored as events with timestamps and a source, so a withdrawal is a fact that can be produced — where a boolean somebody flipped is only an assertion.",
          "The check starts from no. A customer with no record on file cannot be marketed to by accident, channels are independent so unsubscribing from SMS leaves email alone, and transactional messages are exempt because a booking confirmation is not marketing. The filter is a function rather than a rule in the interface, because a consent rule enforced only in the UI is one that will be bypassed by the first export to a spreadsheet.",
        ],
      },
    ],
  },
];
