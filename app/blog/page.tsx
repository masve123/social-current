import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { articles } from "@/lib/articles";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social Media Growth Guides for Instagram, TikTok and YouTube",
  description: "Practical, original guides about Instagram growth, TikTok engagement, YouTube launches, social proof, and campaign planning.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": `${site.url}/feed.xml` } },
  openGraph: { type: "website", title: "Social Current Growth Notes", description: "Practical social media growth guides for creators and brands.", url: `${site.url}/blog` },
};

export default function BlogPage() {
  const [featured, ...rest] = articles;
  const schema = [
    { "@context": "https://schema.org", "@type": "Blog", name: "Social Current Growth Notes", description: "Practical social media growth guides for creators and brands.", url: `${site.url}/blog`, publisher: { "@type": "Organization", name: site.name } },
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: articles.map((article, index) => ({ "@type": "ListItem", position: index + 1, name: article.title, url: `${site.url}/blog/${article.slug}` })) },
  ];
  return (
    <>
      <section className="page-hero page-hero--compact"><div className="shell"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Growth notes" }]} /><span className="eyebrow">The field notes</span><h1>Useful ideas for more thoughtful <em>growth.</em></h1><p>Practical guides for creators and small teams building visible, credible social accounts.</p></div></section>
      <section className="section shell"><Link className="featured-article" href={`/blog/${featured.slug}`}><div className="featured-article__art"><span>↗</span></div><div><span className="eyebrow">Featured · {featured.category}</span><h2>{featured.title}</h2><p>{featured.description}</p><strong>Read {featured.readTime} <ArrowRight /></strong></div></Link></section>
      <section className="section section--tinted"><div className="shell"><div className="section-heading"><div><span className="eyebrow">Browse the library</span><h2>Strategies you can <em>use.</em></h2></div><a className="text-link text-link--arrow" href="/feed.xml">RSS feed <ArrowRight /></a></div><div className="article-grid article-grid--listing">{rest.map((article, index) => <article className={`article-card article-card--${(index % 3) + 1}`} key={article.slug}><div className="article-card__art"><span>{index % 3 === 0 ? "↗" : index % 3 === 1 ? "◎" : "✦"}</span></div><div className="article-card__body"><span>{article.category} · {article.readTime}</span><h2>{article.title}</h2><p>{article.description}</p><Link href={`/blog/${article.slug}`}>Read the guide <ArrowRight /></Link></div></article>)}</div></div></section>
      <JsonLd data={schema} />
    </>
  );
}
