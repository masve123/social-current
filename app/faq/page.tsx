import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { services } from "@/lib/services";

const generalFaq = [
  { question: "What is Social Current?", answer: "Social Current is a storefront for social media growth packages across Instagram, TikTok, and YouTube. We connect orders to a specialist fulfillment provider and keep the buying experience clear." },
  { question: "Do I need to share my password?", answer: "No. We only use the public profile or post URL needed for delivery. Never share your password or login codes with any growth service." },
  { question: "Are results guaranteed?", answer: "We guarantee the delivery described by the selected package, subject to its terms and refill coverage. We cannot guarantee reach, ranking, sales, or other outcomes controlled by a social platform." },
  { question: "Can I cancel an order?", answer: "Orders enter processing quickly. Contact support immediately with your order number. We can only cancel when fulfillment has not begun." },
  { question: "Why does my account need to be public?", answer: "The provider must be able to access the public profile or post to deliver the service. You can make it private again after the order is complete." },
  { question: "How do refills work?", answer: "If a covered order drops during its stated refill period, send support the order number. We will verify the count and submit an eligible refill." },
];

export const metadata: Metadata = { title: "Social Media Growth FAQ", description: "Answers about Social Current delivery, privacy, refills, order tracking, and social media growth packages.", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  const allFaq = [...generalFaq, ...services.flatMap((service) => service.faq)];
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: allFaq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
  return (
    <>
      <section className="page-hero page-hero--compact"><div className="shell narrow"><span className="eyebrow">Help center</span><h1>Questions, meet <em>answers.</em></h1><p>Plain-language guidance on ordering, delivery, account access, and support.</p></div></section>
      <section className="section shell faq-page"><FaqList items={allFaq} /></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </>
  );
}
