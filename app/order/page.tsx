import type { Metadata } from "next";
import { OrderForm } from "@/components/order-form";
import { findStoredOrder } from "@/lib/order-store";
import { canRestartCheckout } from "@/lib/checkout-recovery";
import { PaymentStatus } from "@/components/payment-status";
import { getService } from "@/lib/services";

export const metadata: Metadata = {
  title: "Choose a Social Growth Package",
  description: "Choose an Instagram, TikTok, or YouTube growth package and create your Social Current order.",
  alternates: { canonical: "/order" },
  robots: { index: false, follow: true },
};

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ service?: string; offer?: string; quantity?: string; currency?: string; resume?: string }> }) {
  const query = await searchParams;
  const previous = query.resume && /^SC-\d{6}-[A-F0-9]{16}$/.test(query.resume) ? await findStoredOrder(query.resume).catch(()=>undefined) : undefined;
  if (query.resume && (!previous || !canRestartCheckout(previous))) return <section className="page-hero page-hero--center"><div className="shell narrow"><h1>Check your <em>payment.</em></h1><p>Check this order before starting another payment.</p>{previous ? <PaymentStatus order={previous.public_id} /> : <p>We could not restore this order. Open order tracking or contact support with your order number.</p>}</div></section>;
  const quantity = previous?.quantity ?? (query.quantity ? Number(query.quantity) : undefined);
  const selectedSlug = previous?.service_slug ?? query.service;
  const selectedService = selectedSlug ? getService(selectedSlug) : undefined;
  return (
    <section className="page-hero page-hero--compact checkout-page">
      <div className="shell">
        <span className="eyebrow">{selectedService ? "Secure checkout" : "Build your package"}</span>
        <h1>{selectedService ? <>One step closer to <em>growing.</em></> : <>Find your next <em>growth package.</em></>}</h1>
        <p>{selectedService ? "Your selection is ready. Add the public profile or post, then choose how to pay. No password needed." : "Choose what you want to grow, add the public profile or post, and pay securely. No password needed."}</p>
        <OrderForm key={JSON.stringify([selectedSlug,previous?.offer_id ?? query.offer,quantity,query.currency,query.resume])} initialService={selectedSlug} initialOffer={previous?.offer_id ?? query.offer} initialCurrency={query.currency ?? (typeof previous?.payment_payload?.pay_currency === "string" ? previous.payment_payload.pay_currency : undefined)} initialLink={previous?.target_url} initialComments={previous?.comments?.join("\n")} resumeOrder={previous?.public_id} initialQuantity={Number.isFinite(quantity) ? quantity : undefined} emailUpdatesEnabled={Boolean(process.env.RESEND_API_KEY)} instagramLookupEnabled={Boolean(process.env.HIKER_API_KEY)} />
      </div>
    </section>
  );
}
