import type { Metadata } from "next";
import { PlatformPage } from "@/components/platform-page";
import { getPlatform } from "@/lib/platforms";
import { site } from "@/lib/site";

const platform = getPlatform("instagram")!;
export const metadata: Metadata = { title: "Instagram Growth Services: Followers, Likes and Views", description: platform.description, keywords: ["Instagram growth services", "buy Instagram followers", "buy Instagram likes", "buy Instagram views"], alternates: { canonical: "/instagram-growth" }, openGraph: { title: platform.title, description: platform.description, url: `${site.url}/instagram-growth` } };
export default function InstagramGrowthPage() { return <PlatformPage platform={platform} />; }
