import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment Cancelled", robots: { index: false, follow: false } };

export default async function OrderCancelledPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <section className="page-hero page-hero--center">
      <div className="shell narrow">
        <span className="eyebrow">Checkout cancelled</span>
        <h1>No payment was <em>completed.</em></h1>
        <p>Your order has not been sent for delivery. You can return to checkout whenever you are ready.</p>
        <div className="hero__actions">
          <Link className="button button--coral" href="/order">Return to checkout</Link>
          {order && <Link className="button button--cream" href={`/track?order=${encodeURIComponent(order)}`}>View order</Link>}
        </div>
      </div>
    </section>
  );
}
