import type { Metadata } from "next";
import { AdminOrders } from "@/components/admin-orders";

export const metadata: Metadata = { title: "Order Operations", robots: { index: false, follow: false } };

export default function AdminOrdersPage() {
  return (
    <section className="page-hero page-hero--compact">
      <div className="shell">
        <span className="eyebrow">Private operations</span>
        <h1>Review orders and <em>messages.</em></h1>
        <p>Paid orders needing attention and customer support requests appear here.</p>
        <AdminOrders />
      </div>
    </section>
  );
}
