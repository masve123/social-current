import type { Service } from "@/lib/services";

export type Platform = {
  slug: "instagram" | "tiktok" | "youtube";
  name: Service["platform"];
  title: string;
  description: string;
  intro: string;
  color: string;
  principles: { title: string; text: string }[];
};

export const platforms: Platform[] = [
  { slug: "instagram", name: "Instagram", title: "Instagram Growth Services", description: "Compare Instagram follower, like, and Reel view packages with clear pricing, delivery estimates, and no password required.", intro: "Build a more complete first impression across your profile and individual posts. Choose the signal that matches your campaign, then combine it with consistent content and genuine audience interaction.", color: "coral", principles: [{ title: "Prepare the profile", text: "Use a clear bio, recent content, and relevant pinned posts before sending new attention to the account." }, { title: "Choose one campaign goal", text: "Followers support profile perception, while likes and views support activity around individual posts." }, { title: "Keep signals balanced", text: "Use package sizes that make sense beside the account’s content, audience, and normal activity." }] },
  { slug: "tiktok", name: "TikTok", title: "TikTok Growth Services", description: "Explore TikTok follower and like packages for public profiles and videos, with measured delivery and order tracking.", intro: "Support a promising profile or video with visible momentum. TikTok packages work best when the opening is strong, the account is active, and new visitors have more useful content to explore.", color: "mint", principles: [{ title: "Strengthen the opening", text: "Make the value of a video clear in its first frame so new viewers know why they should stay." }, { title: "Stay active after publishing", text: "Answer relevant comments and turn useful audience questions into follow-up content." }, { title: "Review profile actions", text: "Track whether a post produces profile visits and follows alongside its public engagement." }] },
  { slug: "youtube", name: "YouTube", title: "YouTube Growth Services", description: "Choose measured YouTube view packages for public videos, with transparent delivery timing and high-retention options.", intro: "Give a prepared video stronger visible traction while your title, thumbnail, opening, and distribution plan do the deeper work of attracting and retaining the right viewers.", color: "red", principles: [{ title: "Align title and thumbnail", text: "Both should communicate one clear viewer promise and set the right expectation for the video." }, { title: "Deliver value quickly", text: "Confirm the reason for the click early and remove introductions that delay the main content." }, { title: "Measure beyond views", text: "Watch retention, comments, subscribers, and next-video behavior to understand viewer quality." }] },
];

export const getPlatform = (slug: string) => platforms.find((platform) => platform.slug === slug);
