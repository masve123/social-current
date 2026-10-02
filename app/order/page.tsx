import type { Metadata } from "next";
import { OrderForm } from "@/components/order-form";
import { getService } from "@/lib/services";

export const metadata: Metadata = {
  title: "Choose a Social Growth Package",
  description: "Choose an Instagram, TikTok, or YouTube growth package and create your Social Current order.",
  alternates: { canonical: "/order" },
  robots: { index: false, follow: true },
};

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ service?: string; offer?: string; quantity?: string }> }) {
  const query = await searchParams;
  const quantity = query.quantity ? Number(query.quantity) : undefined;
  const selectedService = query.service ? getService(query.service) : undefined;
  return (
    <section className="page-hero page-hero--compact checkout-page">
      <div className="shell">
        <span className="eyebrow">{selectedService ? "Secure checkout" : "Build your package"}</span>
        <h1>{selectedService ? <>One step closer to <em>growing.</em></> : <>Find your next <em>growth package.</em></>}</h1>
        <p>{selectedService ? "Your selection is ready. Add the public profile or post, then choose how to pay. No password needed." : "Choose what you want to grow, add the public profile or post, and pay securely. No password needed."}</p>
        <OrderForm initialService={query.service} initialOffer={query.offer} initialQuantity={Number.isFinite(quantity) ? quantity : undefined} instagramLookupEnabled={Boolean(process.env.HIKER_API_KEY)} />
      </div>
    </section>
  );
}
