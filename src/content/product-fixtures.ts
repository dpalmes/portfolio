/**
 * Seed data for the three product demos.
 *
 * Small on purpose. A resort with three room types and a handful of bookings
 * runs out of rooms while you are looking at it, which is the point — a demo
 * with a hundred units never shows you the refusal.
 */

import type { Booking, RoomType } from "@/lib/booking/availability";
import type { RatePlan } from "@/lib/booking/pricing";
import type { MenuItem } from "@/lib/dining/menu";
import type { ServiceRules, Table } from "@/lib/dining/reservations";
import type { Movement, Product } from "@/lib/inventory/ledger";
import { pesos } from "@/lib/money";

// ---------------------------------------------------------------- resort

export const ROOM_TYPES: RoomType[] = [
  {
    id: "garden",
    name: "Garden Villa",
    units: 4,
    maxOccupancy: 4,
    description: "Private garden, outdoor shower, two bedrooms.",
  },
  {
    id: "ocean",
    name: "Ocean Suite",
    units: 2,
    maxOccupancy: 2,
    description: "Sea-facing balcony, king bed.",
  },
  {
    id: "loft",
    name: "Beach Loft",
    units: 1,
    maxOccupancy: 6,
    description: "The whole upper floor. Sleeps six.",
  },
];

export const RATE_PLAN: RatePlan = {
  baseRate: pesos(6_500),
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

/**
 * Existing bookings, positioned so the loft — the single unit — is already
 * taken over a weekend. Without something already sold, an availability engine
 * has nothing to demonstrate.
 */
export function seedBookings(baseDate: string): Booking[] {
  const day = (offset: number) => {
    const date = new Date(`${baseDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  return [
    {
      id: "seed-1",
      roomTypeId: "loft",
      stay: { checkIn: day(3), checkOut: day(6) },
      guestName: "Reyes family",
      guests: 5,
    },
    {
      id: "seed-2",
      roomTypeId: "ocean",
      stay: { checkIn: day(2), checkOut: day(5) },
      guestName: "M. Santos",
      guests: 2,
    },
    {
      id: "seed-3",
      roomTypeId: "ocean",
      stay: { checkIn: day(4), checkOut: day(7) },
      guestName: "J. Cruz",
      guests: 2,
    },
    {
      id: "seed-4",
      roomTypeId: "garden",
      stay: { checkIn: day(1), checkOut: day(4) },
      guestName: "L. Bautista",
      guests: 3,
    },
  ];
}

// ------------------------------------------------------------ restaurant

export const TABLES: Table[] = [
  { id: "t1", seats: 2, combinesWith: ["t2"] },
  { id: "t2", seats: 2, combinesWith: ["t1", "t3"] },
  { id: "t3", seats: 4, combinesWith: ["t2"] },
  { id: "t4", seats: 4, combinesWith: ["t5"] },
  { id: "t5", seats: 6, combinesWith: ["t4"] },
];

export const SERVICE_RULES: ServiceRules = {
  opensAtMinute: 11 * 60,
  lastSeatingMinute: 21 * 60,
  slotIntervalMinutes: 30,
  turnTimes: [
    { minPartySize: 1, minutes: 90 },
    { minPartySize: 5, minutes: 120 },
    { minPartySize: 9, minutes: 150 },
  ],
  maxPartySize: 10,
};

export const MENU: MenuItem[] = [
  {
    id: "kapeng-barako",
    name: "Kapeng Barako",
    description: "Batangas liberica, brewed strong.",
    category: "Coffee",
    basePrice: pesos(120),
    available: true,
    modifierGroups: [
      {
        id: "size",
        name: "Size",
        required: true,
        options: [
          { id: "regular", name: "Regular", priceDelta: 0 },
          { id: "large", name: "Large", priceDelta: pesos(35) },
        ],
      },
      {
        id: "milk",
        name: "Milk",
        required: false,
        options: [
          { id: "none", name: "Black", priceDelta: 0 },
          { id: "fresh", name: "Fresh milk", priceDelta: pesos(20) },
          { id: "oat", name: "Oat milk", priceDelta: pesos(40) },
        ],
      },
    ],
  },
  {
    id: "latte",
    name: "Latte",
    description: "Double shot, steamed milk.",
    category: "Coffee",
    basePrice: pesos(155),
    available: true,
    modifierGroups: [
      {
        id: "size",
        name: "Size",
        required: true,
        options: [
          { id: "regular", name: "Regular", priceDelta: 0 },
          { id: "large", name: "Large", priceDelta: pesos(35) },
        ],
      },
      {
        id: "milk",
        name: "Milk",
        required: false,
        options: [
          { id: "fresh", name: "Fresh milk", priceDelta: 0 },
          { id: "oat", name: "Oat milk", priceDelta: pesos(40) },
        ],
      },
    ],
  },
  {
    id: "silog",
    name: "Tapsilog",
    description: "Cured beef, garlic rice, fried egg.",
    category: "All day",
    basePrice: pesos(220),
    available: true,
    modifierGroups: [
      {
        id: "egg",
        name: "Egg",
        required: true,
        options: [
          { id: "sunny", name: "Sunny side up", priceDelta: 0 },
          { id: "scrambled", name: "Scrambled", priceDelta: 0 },
          { id: "extra", name: "Two eggs", priceDelta: pesos(30) },
        ],
      },
    ],
  },
  {
    id: "ube-cake",
    name: "Ube Cake",
    description: "Purple yam, macapuno.",
    category: "Pastry",
    basePrice: pesos(185),
    available: true,
    modifierGroups: [],
  },
  {
    id: "pandesal",
    name: "Pandesal Basket",
    description: "Six pieces, salted butter.",
    category: "Pastry",
    basePrice: pesos(95),
    available: false,
    modifierGroups: [],
  },
];

// --------------------------------------------------------------- store

export const STORE_PRODUCTS: Product[] = [
  { sku: "RICE-1KG", name: "Rice 1kg", unit: "pack", price: pesos(62), reorderPoint: 6, category: "Grocery" },
  { sku: "SARDINES", name: "Sardines 155g", unit: "can", price: pesos(28), reorderPoint: 12, category: "Canned" },
  { sku: "COFFEE-3IN1", name: "3-in-1 Coffee", unit: "sachet", price: pesos(12), reorderPoint: 24, category: "Beverage" },
  { sku: "SOAP", name: "Bath Soap", unit: "bar", price: pesos(45), reorderPoint: 8, category: "Household" },
  { sku: "NOODLES", name: "Instant Noodles", unit: "pack", price: pesos(18), reorderPoint: 20, category: "Grocery" },
  { sku: "EGGS-6", name: "Eggs, tray of 6", unit: "tray", price: pesos(95), reorderPoint: 4, category: "Fresh" },
];

/**
 * Opening stock. Two deliveries of rice at different costs, so the weighted
 * average is visibly not either price — the whole point of carrying one.
 */
export const SEED_MOVEMENTS: Movement[] = [
  { id: "sm-1", sku: "RICE-1KG", kind: "receipt", quantity: 20, unitCost: pesos(48), at: 1, note: "Opening" },
  { id: "sm-2", sku: "RICE-1KG", kind: "receipt", quantity: 10, unitCost: pesos(54), at: 2, note: "Restock" },
  { id: "sm-3", sku: "SARDINES", kind: "receipt", quantity: 36, unitCost: pesos(21), at: 3, note: "Opening" },
  { id: "sm-4", sku: "COFFEE-3IN1", kind: "receipt", quantity: 60, unitCost: pesos(8), at: 4, note: "Opening" },
  { id: "sm-5", sku: "SOAP", kind: "receipt", quantity: 9, unitCost: pesos(33), at: 5, note: "Opening" },
  { id: "sm-6", sku: "NOODLES", kind: "receipt", quantity: 48, unitCost: pesos(13), at: 6, note: "Opening" },
  { id: "sm-7", sku: "EGGS-6", kind: "receipt", quantity: 5, unitCost: pesos(72), at: 7, note: "Opening" },
  { id: "sm-8", sku: "EGGS-6", kind: "spoilage", quantity: -1, unitCost: 0, at: 8, note: "Broken in transit" },
];

export const VAT_PERCENT = 12;
