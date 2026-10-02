import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { articles, getArticle } from "@/lib/articles";
import { getService } from "@/lib/services";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: article.author }],
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: { type: "article", publishedTime: article.published, modifiedTime: article.updated, authors: [article.author], section: article.category, tags: article.keywords, title: article.title, description: article.description, url: `${site.url}/blog/${article.slug}` },
    twitter: { card: "summary_large_image", title: article.title, description: article.description },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const relatedServices = article.relatedServices.map(getService).filter((service) => service !== undefined);
  const relatedArticles = articles.filter((item) => item.slug !== article.slug && (item.category === article.category || item.relatedServices.some((slug) => article.relatedServices.includes(slug)))).slice(0, 3);
  const wordCount = [article.intro, ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])])].join(" ").split(/\s+/).length;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated,
    wordCount,
    articleSection: article.category,
    keywords: article.keywords.join(", "),
    author: { "@type": "Organization", name: article.author, url: `${site.url}/about` },
    publisher: { "@type": "Organization", name: site.name, url: site.url, logo: { "@type": "ImageObject", url: `${site.url}/icon.svg` } },
    image: `${site.url}/opengraph-image`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/blog/${article.slug}` },
  };

  return (
    <>
      <article>
        <header className="article-hero"><div className="shell article-shell"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Growth notes", href: "/blog" }, { label: article.title }]} /><Link href="/blog" className="back-link"><ArrowLeft /> All growth notes</Link><span className="eyebrow">{article.category} · {article.readTime}</span><h1>{article.title}</h1><p>{article.description}</p><div className="article-byline"><strong>{article.author}</strong><span>Published <time dateTime={article.published}>{formatDate(article.published)}</time></span>{article.updated !== article.published && <span>Updated <time dateTime={article.updated}>{formatDate(article.updated)}</time></span>}</div></div></header>
        <div className="section shell article-shell article-layout">
          <aside className="article-toc" aria-label="On this page"><strong>On this page</strong>{article.sections.map((section) => <a href={`#${toId(section.heading)}`} key={section.heading}>{section.heading}</a>)}</aside>
          <div className="article-prose">
            <p className="article-intro">{article.intro}</p>
            {article.sections.map((section) => <section id={toId(section.heading)} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}><Check />{bullet}</li>)}</ul>}</section>)}
            {relatedServices.length > 0 && <section className="related-services"><span className="eyebrow">Related services</span><h2>Support the plan with measured growth</h2>{relatedServices.map((service) => <Link href={`/services/${service.slug}`} key={service.slug}><span>{service.shortTitle}</span><strong>From ${service.basePrice.toFixed(2)}</strong><ArrowRight /></Link>)}</section>}
            <div className="article-cta"><h2>Put the plan in motion.</h2><p>Choose a measured package to support your next post or profile campaign.</p><Link className="button button--coral" href="/services">Explore services <ArrowRight /></Link></div>
          </div>
        </div>
      </article>
      {relatedArticles.length > 0 && <section className="section section--tinted"><div className="shell"><div className="section-heading"><div><span className="eyebrow">Keep reading</span><h2>Related growth <em>notes.</em></h2></div></div><div className="resource-list">{relatedArticles.map((item) => <Link href={`/blog/${item.slug}`} key={item.slug}><span>{item.category} · {item.readTime}</span><strong>{item.title}</strong><ArrowRight /></Link>)}</div></div></section>}
      <JsonLd data={schema} />
    </>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date));
}

function toId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
