import type { Metadata } from "next";
import Link from "next/link";
import { PaymentStatus } from "@/components/payment-status";

export const metadata: Metadata = {
  title: "Payment Confirmation",
  description: "Confirm your Social Current payment and order status.",
  robots: { index: false, follow: false },
};

export default async function OrderCompletePage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <section className="page-hero page-hero--center">
      <div className="shell narrow">
        <span className="eyebrow">Payment received</span>
        <h1>We’re confirming your <em>order.</em></h1>
        {order ? <PaymentStatus order={order} /> : (
          <div className="payment-result"><p>Your order number is missing.</p><Link className="button button--ink" href="/track">Open order tracking</Link></div>
        )}
      </div>
    </section>
  );
}
