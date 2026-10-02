import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { site } from "@/lib/site";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Social Current — Social Media Growth, Made Clear", template: "%s | Social Current" },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: "Social Current Editorial", url: `${site.url}/about` }],
  creator: site.name,
  publisher: site.name,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  referrer: "origin-when-cross-origin",
  keywords: ["social media growth", "Instagram followers", "Instagram likes", "TikTok followers", "YouTube views"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: site.url,
    siteName: site.name,
    title: "Social Current — Social Media Growth, Made Clear",
    description: site.description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Social Current social media growth services" }],
  },
  twitter: { card: "summary_large_image", title: "Social Current", description: site.description, images: ["/opengraph-image"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  category: "marketing",
};

export const viewport: Viewport = { themeColor: "#f7f2e8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    email: site.email,
    logo: `${site.url}/icon.svg`,
  };

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
