import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, HeartHandshake, SlidersHorizontal } from "lucide-react";
import { pageSocialMetadata } from "@/lib/seo";

export const metadata: Metadata = { title: "About Social Current", description: "Why Social Current built a clearer, more thoughtful social media growth storefront.", alternates: { canonical: "/about" }, ...pageSocialMetadata("About Social Current", "Why Social Current built a clearer, more thoughtful social media growth storefront.", "/about") };

export default function AboutPage() {
  return (
    <>
      <section className="page-hero"><div className="shell split-hero"><div><span className="eyebrow">Our point of view</span><h1>Growth tools should feel <em>less murky.</em></h1></div><p>Social Current brings clear packages, honest expectations, and calm support to an industry that often makes simple things hard to understand.</p></div></section>
      <section className="section shell values-grid">
        <article><Eye /><span>01</span><h2>Clarity first</h2><p>Delivery ranges, package limits, and coverage belong on the page before checkout.</p></article>
        <article><SlidersHorizontal /><span>02</span><h2>Useful control</h2><p>Choose the amount and service that fit the campaign instead of being pushed into a subscription.</p></article>
        <article><HeartHandshake /><span>03</span><h2>Human help</h2><p>When automation reaches its limit, a real support conversation should take over.</p></article>
      </section>
      <section className="section section--tinted"><div className="shell seo-content"><div><span className="eyebrow">Our approach</span><h2>Visible momentum, with <em>context.</em></h2></div><div className="prose"><p>Social proof can help a visitor pause, pay attention, and give a profile a closer look. It cannot replace a useful product, compelling content, or real audience relationships.</p><p>That is why our guidance treats growth packages as a supporting tool. We encourage measured orders, consistent publishing, and realistic expectations about what any external service can achieve.</p><Link className="button button--ink" href="/order">Explore packages <ArrowRight /></Link></div></div></section>
    </>
  );
}
