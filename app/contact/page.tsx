import type { Metadata } from "next";
import { MessageSquareText, ShieldCheck } from "lucide-react";
import { SupportForm } from "@/components/support-form";
import { pageSocialMetadata } from "@/lib/seo";

export const metadata: Metadata = { title: "Contact Support", description: "Contact Social Current for order support, service questions, and partnership enquiries.", alternates: { canonical: "/contact" }, ...pageSocialMetadata("Contact Support", "Contact Social Current for order support, service questions, and partnership enquiries.", "/contact") };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <section className="page-hero"><div className="shell contact-grid"><div><span className="eyebrow">Let’s talk</span><h1>We’re here when you <em>need a hand.</em></h1><p>For faster order help, include your order number and describe what happened. Your message is saved when you submit the form.</p><div className="contact-method"><MessageSquareText /><div><span>Order questions</span><strong>Include your order number when possible</strong></div></div><div className="contact-method"><ShieldCheck /><div><span>Message reference</span><strong>Save the reference shown after sending</strong></div></div></div><SupportForm initialOrder={order || ""} /></div></section>
  );
}
