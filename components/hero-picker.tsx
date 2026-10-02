"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, Heart, Instagram, MessageCircle, Music2, UsersRound, Youtube } from "lucide-react";
import { useState } from "react";
import { getStandardCheckoutMinimumQuantity } from "@/lib/checkout-pricing";
import { calculatePrice, services } from "@/lib/services";

const platforms = [
  { name: "Instagram", icon: Instagram },
  { name: "TikTok", icon: Music2 },
  { name: "YouTube", icon: Youtube },
] as const;

const goals = [
  { metric: "followers", label: "Followers", hint: "Grow your audience", icon: UsersRound },
  { metric: "likes", label: "Likes", hint: "Boost a post", icon: Heart },
  { metric: "views", label: "Views", hint: "Get more eyes on it", icon: Eye },
  { metric: "comments", label: "Comments", hint: "Start a conversation", icon: MessageCircle },
] as const;

export function HeroPicker() {
  const [platform, setPlatform] = useState<(typeof platforms)[number]["name"]>("Instagram");

  return (
    <div className="hero-picker" id="growth-finder" aria-label="Find a social media growth package">
      <div className="hero-picker__heading"><span>Find your package</span><span>1. Choose a platform &nbsp; 2. Pick what to grow</span></div>
      <div className="hero-picker__platforms" role="group" aria-label="Choose a platform">
        {platforms.map(({ name, icon: Icon }) => (
          <button type="button" key={name} className={platform === name ? "active" : ""} onClick={() => setPlatform(name)} aria-pressed={platform === name}>
            <span className={`hero-picker__platform-icon hero-picker__platform-icon--${name.toLowerCase()}`}><Icon aria-hidden="true" /></span>
            <span>{name}</span>
          </button>
        ))}
      </div>
      <div className="hero-picker__goals" key={platform}>
        {goals.map(({ metric, label, hint, icon: Icon }) => {
          const serviceMetric = platform === "YouTube" && metric === "followers" ? "subscribers" : metric;
          const service = services.find((item) => item.platform === platform && item.metric === serviceMetric);
          if (!service) return null;
          const minimumQuantity = getStandardCheckoutMinimumQuantity(service);
          return (
            <Link className="hero-picker__goal" href={`/services/${service.slug}`} key={metric} aria-label={`Explore ${service.title}`}>
              <span className="hero-picker__goal-icon"><Icon aria-hidden="true" /></span>
              <strong>{platform === "YouTube" && metric === "followers" ? "Subscribers" : label}</strong>
              <small>{hint}</small>
              <span className="hero-picker__goal-bottom"><span>From ${calculatePrice(service, minimumQuantity).toFixed(2)}</span><ArrowUpRight aria-hidden="true" /></span>
            </Link>
          );
        })}
      </div>
      <div className="hero-picker__foot"><span>No password needed</span><span>Choose your amount on the next page</span><span>Track your order</span></div>
    </div>
  );
}
