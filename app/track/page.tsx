import type { Metadata } from "next";
import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "Track Your Order", description: "Check the current delivery status of a Social Current order.", robots: { index: false, follow: false } };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <section className="page-hero page-hero--center">
      <div className="shell narrow">
        <span className="eyebrow">Order tracking</span>
        <h1>See where your order <em>stands.</em></h1>
        <p>Enter the order number from your confirmation to get the latest payment and delivery status.</p>
        <TrackForm initialOrder={order} />
      </div>
    </section>
  );
}
