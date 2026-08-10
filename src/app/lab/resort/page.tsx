import type { Metadata } from "next";
import { ProductDemoPage } from "@/components/products/product-demo-page";
import { ResortBooking } from "@/components/products/resort-booking";

export const metadata: Metadata = {
  title: "Resort booking",
  description:
    "A resort booking demo: per-night availability across room types, seasonal and length-of-stay pricing, and refusals that name the night that blocked the stay.",
};

export default function ResortLabPage() {
  return (
    <ProductDemoPage
      slug="resort"
      notes={
        <>
          <p>
            Try booking the Beach Loft — there is only one, and it is already
            taken over the weekend. The refusal names the night rather than
            shrugging, which is the difference between a guest giving up and a
            guest shifting by a day.
          </p>
          <p>
            Then book a Garden Villa four times. The fourth is refused; the first
            three are not, because four units means four bookings.
          </p>
        </>
      }
    >
      <ResortBooking />
    </ProductDemoPage>
  );
}
