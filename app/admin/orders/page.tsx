import type { Metadata } from "next";
import { AdminOrders } from "@/components/admin-orders";

export const metadata: Metadata = { title: "Order Operations", robots: { index: false, follow: false } };

export default function AdminOrdersPage() {
  return (
    <section className="page-hero page-hero--compact">
      <div className="shell">
        <span className="eyebrow">Private operations</span>
        <h1>Review the fulfillment <em>queue.</em></h1>
        <p>Paid orders appear here when supplier funds are low or manual review is required.</p>
        <AdminOrders />
      </div>
    </section>
  );
}
