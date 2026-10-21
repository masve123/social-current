import type { Metadata } from "next";
import Link from "next/link";
import { PaymentStatus } from "@/components/payment-status";

export const metadata: Metadata = { title: "Payment Cancelled", robots: { index: false, follow: false } };

export default async function OrderCancelledPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <section className="page-hero page-hero--center">
      <div className="shell narrow">
        <span className="eyebrow">Back from payment</span>
        <h1>Check your <em>order.</em></h1>
        <p>Returning here does not confirm whether payment was received. We’ll check your order before you try again.</p>
        {order ? <PaymentStatus order={order} recordReturn /> : <Link className="button button--coral" href="/order">Return to your checkout details</Link>}

      </div>
    </section>
  );
}
