import type { Metadata } from "next";
import { ProductDemoPage } from "@/components/products/product-demo-page";
import { CrmConsole } from "@/components/products/crm-console";

export const metadata: Metadata = {
  title: "CRM",
  description:
    "One CRM across a resort, a coffee shop and a store: identity resolution with scored merge candidates, RFM segmentation, and consent that must be proved before anyone can be contacted.",
};

export default function CrmLabPage() {
  return (
    <ProductDemoPage
      slug="crm"
      notes={
        <>
          <p>
            Ana appears three times: she booked a villa by phone, ordered coffee
            with the same number written differently, and bought groceries under
            a fuller name with an email. Until those are merged her lifetime
            value is split across three records and none of them looks like a
            customer worth keeping. Merge them and watch her become the most
            valuable person on the list.
          </p>
          <p>
            Then look at the two Maria Santoses. They score high enough to
            review and never high enough to merge automatically, because a name
            is not evidence of identity. Roberto and Elena Bautista share a
            handset — same phone, different people — and that pair is flagged
            for exactly the same reason.
          </p>
        </>
      }
    >
      <CrmConsole />
    </ProductDemoPage>
  );
}
