"use client";

import Link from "next/link";
import { ArrowRight, Eye, Heart, MessageCircle, Music2, Play, Users, Instagram, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import { services } from "@/lib/services";

const needs = [
  { key: "followers", label: "Followers", hint: "Strengthen your audience count", icon: Users },
  { key: "likes", label: "Likes", hint: "Add visible positive engagement", icon: Heart },
  { key: "comments", label: "Comments", hint: "Create a stronger discussion signal", icon: MessageCircle },
  { key: "views", label: "Views", hint: "Build visible content momentum", icon: Eye },
] as const;

const platforms = [
  { key: "Instagram", label: "Instagram", icon: Instagram },
  { key: "TikTok", label: "TikTok", icon: Music2 },
  { key: "YouTube", label: "YouTube", icon: Youtube },
] as const;

export function GrowthFinder() {
  const [need, setNeed] = useState<(typeof needs)[number]["key"]>("followers");
  const [platform, setPlatform] = useState<(typeof platforms)[number]["key"]>("Instagram");

  const selected = useMemo(() => {
    const metric = platform === "YouTube" && need === "followers" ? "subscribers" : need;
    return services.find((service) => service.platform === platform && service.metric === metric);
  }, [need, platform]);

  return (
    <section className="finder-section" id="growth-finder" aria-labelledby="finder-heading">
      <div className="shell finder">
        <div className="finder__intro">
          <span className="eyebrow">Package finder</span>
          <h2 id="finder-heading">What do you want to <em>grow?</em></h2>
          <p>Answer two quick questions and we’ll point you to the right package.</p>
          <div className="finder__step"><span>01</span><strong>Choose what you need</strong></div>
          <div className="finder__choices finder__choices--needs">
            {needs.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" className={need === item.key ? "active" : ""} aria-pressed={need === item.key} onClick={() => setNeed(item.key)}><Icon /><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>; })}
          </div>
          <div className="finder__step"><span>02</span><strong>Choose a platform</strong></div>
          <div className="finder__choices finder__choices--platforms">
            {platforms.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" className={platform === item.key ? "active" : ""} aria-pressed={platform === item.key} onClick={() => setPlatform(item.key)}><Icon /><strong>{item.label}</strong></button>; })}
          </div>
        </div>
        <div className="finder__result" aria-live="polite">
          <span className="finder__result-label">Your match</span>
          <div className="finder__result-icon"><Play fill="currentColor" /></div>
          {selected ? <><span className="eyebrow">{selected.platform} · {selected.metric}</span><h3>{selected.title}</h3><p>{selected.description}</p><dl><div><dt>Packages from</dt><dd>${selected.basePrice.toFixed(2)}</dd></div><div><dt>Delivery</dt><dd>{selected.delivery}</dd></div><div><dt>Coverage</dt><dd>{selected.retention}</dd></div></dl><Link className="button button--coral button--wide" href={`/services/${selected.slug}`}>See packages <ArrowRight /></Link></> : <p>No matching service is currently available.</p>}
        </div>
      </div>
    </section>
  );
}
