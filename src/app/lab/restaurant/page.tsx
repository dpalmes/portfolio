import type { Metadata } from "next";
import { ProductDemoPage } from "@/components/products/product-demo-page";
import { RestaurantBooking } from "@/components/products/restaurant-booking";

export const metadata: Metadata = {
  title: "Coffee shop",
  description:
    "A reservation and menu demo: turn times that block the slots a booking spills into, table combining, and menu modifiers that actually change the price.",
};

export default function RestaurantLabPage() {
  return (
    <ProductDemoPage
      slug="restaurant"
      notes={
        <>
          <p>
            Book a table at 7pm, then look at 7:30 and 8:00 — both are gone. A
            party of four occupies its table for ninety minutes, not for the
            instant it was booked.
          </p>
          <p>
            Switch the party size to eight and watch most of the service close.
            Nothing here seats eight alone, so it depends on two adjoining tables
            being free at once.
          </p>
        </>
      }
    >
      <RestaurantBooking />
    </ProductDemoPage>
  );
}
