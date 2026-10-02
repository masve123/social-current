import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Editorial Policy and Commercial Disclosure",
  description: "How Social Current researches, writes, reviews, updates, and commercially discloses its social media growth guides.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <>
      <section className="page-hero page-hero--compact"><div className="shell narrow"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Editorial policy" }]} /><span className="eyebrow">How we publish</span><h1>Editorial policy</h1><p>How Social Current creates useful growth guidance while operating a commercial social media services storefront.</p><time>Last updated October 2, 2026</time></div></section>
      <article className="section shell legal-copy">
        <h2>Purpose</h2><p>Growth Notes helps creators and small teams plan clearer profiles, stronger content, and more measured campaigns. Articles are written to answer a defined reader question and provide steps that can be used without purchasing a Social Current service.</p>
        <h2>Research and review</h2><p>We distinguish observable practices from platform-controlled outcomes. Guidance is reviewed for clarity, internal consistency, and alignment with the public information available when it is updated. Articles display publication and revision dates.</p>
        <h2>Commercial disclosure</h2><p>Social Current sells the services linked from its guides. Those links are commercial, and the company may benefit when a reader places an order. We do not publish invented customer reviews, rankings, performance guarantees, or claims that a package can replace useful content and real audience relationships.</p>
        <h2>Corrections</h2><p>When guidance becomes inaccurate or unclear, we update the article and its modification date. Readers can report a possible error through the contact page.</p>
        <h2>Responsible use</h2><p>Customers remain responsible for reviewing the rules that apply to their accounts and content. Our guides encourage measured promotion, truthful public claims, secure account practices, and realistic expectations.</p>
      </article>
    </>
  );
}
