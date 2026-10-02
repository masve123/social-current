import type { Metadata } from "next";
import { Mail, MessageSquareText } from "lucide-react";
import { site } from "@/lib/site";
import { pageSocialMetadata } from "@/lib/seo";

export const metadata: Metadata = { title: "Contact Support", description: "Contact Social Current for order support, service questions, and partnership enquiries.", alternates: { canonical: "/contact" }, ...pageSocialMetadata("Contact Support", "Contact Social Current for order support, service questions, and partnership enquiries.", "/contact") };

export default function ContactPage() {
  return (
    <section className="page-hero"><div className="shell contact-grid"><div><span className="eyebrow">Let’s talk</span><h1>We’re here when you <em>need a hand.</em></h1><p>For faster order help, include the order number and the public link used at checkout.</p><div className="contact-method"><Mail /><div><span>Email support</span><a href={`mailto:${site.email}`}>{site.email}</a></div></div><div className="contact-method"><MessageSquareText /><div><span>Typical response time</span><strong>Within one business day</strong></div></div></div><form className="contact-form" action={`mailto:${site.email}`} method="post" encType="text/plain"><label><span>Name</span><input name="name" required /></label><label><span>Email</span><input name="email" type="email" required /></label><label><span>Order number <small>(optional)</small></span><input name="order" /></label><label><span>How can we help?</span><textarea name="message" rows={6} required /></label><button className="button button--coral" type="submit">Send message</button></form></div></section>
  );
}
