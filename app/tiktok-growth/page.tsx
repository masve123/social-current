import type { Metadata } from "next";
import { PlatformPage } from "@/components/platform-page";
import { getPlatform } from "@/lib/platforms";
import { site } from "@/lib/site";

const platform = getPlatform("tiktok")!;
export const metadata: Metadata = { title: "TikTok Growth Services: Followers and Likes", description: platform.description, keywords: ["TikTok growth services", "buy TikTok followers", "buy TikTok likes"], alternates: { canonical: "/tiktok-growth" }, openGraph: { title: platform.title, description: platform.description, url: `${site.url}/tiktok-growth` } };
export default function TikTokGrowthPage() { return <PlatformPage platform={platform} />; }
