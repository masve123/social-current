import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/articles";

export const alt = "Social Current growth guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  const title = article?.title || "Social Current Growth Notes";
  const category = article?.category || "Strategy";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 76, background: "#f4c751", color: "#171815", fontFamily: "serif", position: "relative" }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "2px solid #171815", padding: 48, background: "#f7f2e8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "sans-serif", fontSize: 24, fontWeight: 700 }}><span>social current</span><span>{category} · Growth notes</span></div>
        <div style={{ maxWidth: 900, fontSize: 70, lineHeight: .95, letterSpacing: -3 }}>{title}</div>
        <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 22 }}>Practical social growth, explained clearly. ↗</div>
      </div>
    </div>,
    size,
  );
}
