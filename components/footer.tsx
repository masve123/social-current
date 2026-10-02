import Link from "next/link";
import { Instagram, Music2, Youtube } from "lucide-react";
import { Logo } from "@/components/logo";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer__grid">
        <div className="footer__lead">
          <Logo inverted />
          <p>Thoughtful social growth, delivered clearly.</p>
          <div className="social-icons" aria-label="Social platforms">
            <Instagram aria-hidden="true" />
            <Music2 aria-hidden="true" />
            <Youtube aria-hidden="true" />
          </div>
        </div>
        <div>
          <h2>Services</h2>
          <Link href="/services">All services</Link>
          <Link href="/instagram-growth">Instagram growth</Link>
          <Link href="/tiktok-growth">TikTok growth</Link>
          <Link href="/youtube-growth">YouTube growth</Link>
          {services.slice(0, 2).map((service) => <Link href={`/services/${service.slug}`} key={service.slug}>{service.shortTitle}</Link>)}
        </div>
        <div>
          <h2>Company</h2>
          <Link href="/about">About us</Link>
          <Link href="/blog">Growth notes</Link>
          <Link href="/editorial-policy">Editorial policy</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>
          <h2>Support</h2>
          <Link href="/track">Track order</Link>
          <Link href="/refund-policy">Refund policy</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="shell footer__bottom">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Independent service. Not affiliated with Instagram, TikTok, or YouTube.</span>
      </div>
    </footer>
  );
}
