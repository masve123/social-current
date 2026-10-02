import type { Metadata } from "next";
import { OrderForm } from "@/components/order-form";

export const metadata: Metadata = {
  title: "Choose a Social Growth Package",
  description: "Choose an Instagram, TikTok, or YouTube growth package and create your Social Current order.",
  alternates: { canonical: "/order" },
  robots: { index: false, follow: true },
};

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ service?: string; quantity?: string }> }) {
  const query = await searchParams;
  const quantity = query.quantity ? Number(query.quantity) : undefined;
  return (
    <section className="page-hero page-hero--compact">
      <div className="shell">
        <span className="eyebrow">Build your package</span>
        <h1>Start your next <em>growth campaign.</em></h1>
        <p>Choose your package, confirm your public profile or post, then pay securely. No password or account needed.</p>
        <OrderForm initialService={query.service} initialQuantity={Number.isFinite(quantity) ? quantity : undefined} />
      </div>
    </section>
  );
}
