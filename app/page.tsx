import Link from "next/link";
import { ArrowRight, Check, Gauge, LockKeyhole, MessageCircleMore, Sparkles } from "lucide-react";
import { FaqList } from "@/components/faq-list";
import { GrowthFinder } from "@/components/growth-finder";
import { JsonLd } from "@/components/json-ld";
import { ServiceCard } from "@/components/service-card";
import { articles } from "@/lib/articles";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

const homeFaq = [
  { question: "How does Social Current work?", answer: "Choose a service and package, paste the public profile or post URL, and place your order. Our delivery partner begins processing it automatically, and you can follow progress with your order number." },
  { question: "Will you ever ask for my password?", answer: "Never. Social Current only needs a public profile or post link. Keep your passwords and login codes private." },
  { question: "When will my order begin?", answer: "Start times vary by service, but most Instagram and TikTok orders begin within 5–45 minutes. You will see the estimated start time before checkout." },
  { question: "Can growth services guarantee sales or reach?", answer: "No service can guarantee a platform outcome. Social Current helps with visible social proof while your content, audience fit, and publishing strategy drive long-term results." },
];

export default function Home() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
  };
  const serviceList = { "@context": "https://schema.org", "@type": "ItemList", name: "Social media growth services", itemListElement: services.map((service, index) => ({ "@type": "ListItem", position: index + 1, name: service.title, url: `${site.url}/services/${service.slug}` })) };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: homeFaq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };

  return (
    <>
      <section className="hero">
        <div className="hero__noise" />
        <div className="shell hero__grid">
          <div className="hero__copy">
            <div className="pill"><span /> Clear pricing. Human support. No passwords.</div>
            <h1>Make your social presence <em>hard to ignore.</em></h1>
            <p>Flexible growth packages for creators and brands who want stronger social proof without the confusing dashboards.</p>
            <div className="hero__actions">
              <Link className="button button--coral" href="#growth-finder">Find my package <ArrowRight /></Link>
              <Link className="text-link text-link--arrow" href="#how-it-works">See how it works <span>↓</span></Link>
            </div>
            <div className="hero__proof">
              <div className="proof-checks" aria-hidden="true"><span>✓</span><span>✓</span><span>✓</span></div>
              <div><strong>Simple from the start</strong><span>clear timing, private checkout, live tracking</span></div>
            </div>
          </div>
          <div className="hero-art" aria-label="Illustration of growing social media metrics">
            <div className="hero-art__orbit hero-art__orbit--one" />
            <div className="hero-art__orbit hero-art__orbit--two" />
            <div className="phone-card">
              <div className="phone-card__top"><span className="mini-avatar">M</span><span><strong>mira.creates</strong><small>Studio diary</small></span><span>•••</span></div>
              <div className="phone-card__photo"><span>MAKE<br />MORE<br /><em>NOISE</em></span></div>
              <div className="phone-card__meta"><span>♡ 24.8K</span><span>◯ 918</span><span>↗</span></div>
            </div>
            <div className="metric-chip metric-chip--followers"><span>New followers</span><strong>+2,540</strong><small>↗ 18.4% this week</small></div>
            <div className="metric-chip metric-chip--views"><Sparkles /><span><strong>1.2M</strong> views</span></div>
            <div className="scribble" aria-hidden="true">↗</div>
          </div>
        </div>
        <div className="platform-strip">
          <span>Growth for</span><strong>Instagram</strong><i>✦</i><strong>TikTok</strong><i>✦</i><strong>YouTube</strong><i>✦</i><strong>Creators</strong>
        </div>
      </section>

      <GrowthFinder />

      <section className="section shell" aria-labelledby="services-heading">
        <div className="section-heading">
          <div><span className="eyebrow">Choose your signal</span><h2 id="services-heading">The right kind of <em>momentum.</em></h2></div>
          <p>Pick the metric that supports your next post, launch, or profile goal. Every package shows its timing and coverage upfront.</p>
        </div>
        <div className="services-grid">
          {services.slice(0, 3).map((service, index) => <ServiceCard service={service} featured={index === 0} key={service.slug} />)}
        </div>
        <div className="center"><Link className="text-link text-link--arrow" href="/order">See all services <ArrowRight /></Link></div>
      </section>

      <section className="how" id="how-it-works">
        <div className="shell">
          <div className="section-heading section-heading--light">
            <div><span className="eyebrow">Three simple steps</span><h2>From quiet to <em>credible.</em></h2></div>
            <p>A simple checkout, a public link, and clear progress from start to finish.</p>
          </div>
          <div className="steps">
            <article><span className="step-index">01</span><div className="step-icon">◎</div><h3>Choose your boost</h3><p>Select a platform, metric, and package that fits the scale of your campaign.</p></article>
            <article><span className="step-index">02</span><div className="step-icon">↗</div><h3>Share the public link</h3><p>Paste your profile or post URL. Your password stays completely private.</p></article>
            <article><span className="step-index">03</span><div className="step-icon">✦</div><h3>Watch it move</h3><p>Delivery starts automatically, with an order number for simple progress checks.</p></article>
          </div>
        </div>
      </section>

      <section className="section shell benefit-grid">
        <div className="benefit-art">
          <div className="stamp">NO<br />PASSWORD<br />NEEDED</div>
          <div className="comment-card comment-card--one"><span>♥</span><p>Clear packages. Useful updates. A real path to support.</p><strong>The Social Current standard</strong></div>
          <div className="comment-card comment-card--two"><span>↗</span><p>Order complete</p><strong>5,000 views delivered</strong></div>
        </div>
        <div className="benefit-copy">
          <span className="eyebrow">Made for peace of mind</span>
          <h2>Growth without the <em>guesswork.</em></h2>
          <p>Every part of Social Current is designed to be easy to understand, from package size to delivery timing.</p>
          <div className="benefit-list">
            <div><span><Gauge /></span><div><h3>Clear delivery windows</h3><p>Know when an order should start before you buy.</p></div></div>
            <div><span><LockKeyhole /></span><div><h3>Private by default</h3><p>No passwords, no account access, and encrypted requests.</p></div></div>
            <div><span><MessageCircleMore /></span><div><h3>Real human support</h3><p>Get help from a person when an order needs attention.</p></div></div>
          </div>
          <Link className="button button--ink" href="/about">Why Social Current <ArrowRight /></Link>
        </div>
      </section>

      <section className="quote-band">
        <div className="shell quote-band__inner">
          <span className="quote-mark">↗</span>
          <blockquote>The numbers should be easy to buy, easy to follow, and easy to understand.</blockquote>
          <div><strong>Our service promise</strong><span>Clarity at every step</span></div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div><span className="eyebrow">The field notes</span><h2>Smarter growth starts <em>here.</em></h2></div>
          <Link className="text-link text-link--arrow" href="/blog">Read all notes <ArrowRight /></Link>
        </div>
        <div className="article-grid">
          {articles.slice(0, 3).map((article, index) => (
            <article className={`article-card article-card--${index + 1}`} key={article.slug}>
              <div className="article-card__art"><span>{index === 0 ? "↗" : index === 1 ? "◎" : "✦"}</span></div>
              <div className="article-card__body"><span>{article.category} · {article.readTime}</span><h3>{article.title}</h3><Link href={`/blog/${article.slug}`}>Read the note <ArrowRight /></Link></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section shell">
        <div><span className="eyebrow">Good questions</span><h2>A little more <em>clarity.</em></h2><p>Everything you should know before placing an order.</p><Link className="text-link text-link--arrow" href="/faq">Visit the help center <ArrowRight /></Link></div>
        <FaqList items={homeFaq} />
      </section>

      <section className="cta">
        <div className="shell cta__inner">
          <div><span className="eyebrow">Ready when you are</span><h2>Give your next post a better <em>starting line.</em></h2></div>
          <div><Link className="button button--cream" href="/order">Choose a package <ArrowRight /></Link><p><Check /> No subscription required</p></div>
        </div>
      </section>
      <JsonLd data={[website, serviceList, faqSchema]} />
    </>
  );
}
