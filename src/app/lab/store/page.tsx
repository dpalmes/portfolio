import type { Metadata } from "next";
import { ProductDemoPage } from "@/components/products/product-demo-page";
import { StoreTill } from "@/components/products/store-till";

export const metadata: Metadata = {
  title: "Sari-sari store",
  description:
    "An inventory and till demo: stock derived from movements, weighted-average costing, and receipts that extract VAT from tax-inclusive prices.",
};

export default function StoreLabPage() {
  return (
    <ProductDemoPage
      slug="store"
      notes={
        <>
          <p>
            Rice arrived twice at different prices, so its average cost is
            neither of them. Ring some up and watch the stock book below: the
            quantity is derived from those movements, not stored next to them.
          </p>
          <p>
            Try to buy more eggs than there are. The sale is refused rather than
            letting the count go negative — which would quietly corrupt the stock
            value, the margin and the reorder list all at once.
          </p>
        </>
      }
    >
      <StoreTill />
    </ProductDemoPage>
  );
}
