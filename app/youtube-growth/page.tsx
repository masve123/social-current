import type { Metadata } from "next";
import { PlatformPage } from "@/components/platform-page";
import { getPlatform } from "@/lib/platforms";
import { site } from "@/lib/site";

const platform = getPlatform("youtube")!;
export const metadata: Metadata = { title: "YouTube Growth Services and Video View Packages", description: platform.description, keywords: ["YouTube growth services", "buy YouTube views", "YouTube video promotion"], alternates: { canonical: "/youtube-growth" }, openGraph: { title: platform.title, description: platform.description, url: `${site.url}/youtube-growth` } };
export default function YouTubeGrowthPage() { return <PlatformPage platform={platform} />; }
