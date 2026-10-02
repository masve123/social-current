import { ImageResponse } from "next/og";

export const alt = "Social Current — social media growth, made clear";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f2e8", color: "#171815", fontFamily: "serif", position: "relative" }}>
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: 999, background: "#ff614d", right: 85, top: 130 }} />
      <div style={{ position: "absolute", width: 250, height: 250, border: "2px solid #171815", borderRadius: 999, right: 140, top: 80 }} />
      <div style={{ display: "flex", flexDirection: "column", width: 1000, position: "relative" }}>
        <div style={{ fontSize: 36, fontFamily: "sans-serif", marginBottom: 72 }}>social current ↗</div>
        <div style={{ fontSize: 96, lineHeight: 0.95, maxWidth: 760 }}>Make your social presence hard to ignore.</div>
      </div>
    </div>,
    size,
  );
}
