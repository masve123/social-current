import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund Policy", description: "Eligibility rules for Social Current cancellations, refunds, and refill requests.", alternates: { canonical: "/refund-policy" } };

export default function RefundPage() {
  return <LegalPage eyebrow="Support policy" title="Refund policy" intro="What happens when an order cannot start, is only partly delivered, or needs a refill."><h2>Before delivery begins</h2><p>Contact support immediately if you entered the wrong link or need to cancel. A full refund can be issued when the provider has not accepted or started the order.</p><h2>Failed and partial orders</h2><p>If the provider marks an order cancelled or cannot deliver the service, refund the undelivered portion to the original payment method. Processing times depend on the payment provider.</p><h2>Completed orders</h2><p>Completed digital services are generally non-refundable. A later change in platform reach, ranking, or audience behavior does not make a delivered order eligible for a refund.</p><h2>Refill coverage</h2><p>Packages marked with refill coverage can be reviewed during the stated period. The target must remain public, and no overlapping provider order should be active. A refill request is not a refund request.</p><h2>Requesting help</h2><p>Email hello@getsocialcurrent.com with your order number, the target URL, and a short description of the issue. We will review provider records before deciding eligibility.</p></LegalPage>;
}
