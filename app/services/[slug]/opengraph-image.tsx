import { ImageResponse } from "next/og";
import { getService } from "@/lib/services";

export const alt = "Social Current social media growth service";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const service = getService((await params).slug);
  const title = service?.title || "Social Media Growth Services";
  const detail = service ? `From $${service.basePrice.toFixed(2)} · ${service.delivery}` : "Clear packages and delivery";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: 76, background: "#ff826f", color: "#171815", fontFamily: "serif" }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 38, border: "2px solid #171815", padding: 52, background: "#fffdf8", boxShadow: "18px 20px 0 #171815" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "sans-serif", fontSize: 24, fontWeight: 700 }}><span>social current</span><span>No password required</span></div>
        <div style={{ maxWidth: 940, fontSize: 92, lineHeight: .9, letterSpacing: -4 }}>{title}</div>
        <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 26, fontWeight: 700 }}>{detail}</div>
      </div>
    </div>,
    size,
  );
}
