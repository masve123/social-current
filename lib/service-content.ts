export type ServiceContent = {
  heading: string;
  intro: string[];
  sections: { heading: string; text: string }[];
};

export const serviceContent: Record<string, ServiceContent> = {
  "instagram-followers": {
    heading: "Build an Instagram profile that earns a closer look",
    intro: [
      "Instagram followers are one of the first public signals a visitor sees when deciding whether to explore an account. A measured follower package can support that first impression while your bio, pinned posts, and recent content explain why someone should stay.",
      "Social Current uses gradual delivery and never asks for account access. Choose a quantity that fits the current profile, keep the account public during delivery, and continue publishing normally while the order runs.",
    ],
    sections: [
      { heading: "Choose a proportionate package", text: "Start with the current audience and the amount of content already published. Smaller steps tend to fit newer profiles, while established accounts can support larger campaign volumes." },
      { heading: "Prepare for profile visits", text: "Update the bio, link, highlights, and pinned posts before delivery begins. The follower count can earn attention, while the profile itself needs to convert that attention into genuine interest." },
      { heading: "Track the wider result", text: "Record profile visits, organic follows, website clicks, and engagement on new posts. These signals show whether stronger visible social proof is helping the broader growth plan." },
    ],
  },
  "instagram-likes": {
    heading: "Add visible momentum to an Instagram post or Reel",
    intro: [
      "Instagram likes provide an immediate public response signal around a piece of content. They are most useful when the post already has a clear idea, a strong opening, and a reason for the right audience to engage further.",
      "Choose one public post or Reel for each order. Delivery begins within the stated window, and no password or account access is needed.",
    ],
    sections: [
      { heading: "Select content with a clear purpose", text: "Use a post that introduces an offer, demonstrates expertise, supports a launch, or represents the account well. Promotion cannot repair a confusing post, so clarity comes first." },
      { heading: "Keep engagement signals balanced", text: "Consider the relationship between views, likes, comments, saves, and account size. A measured package usually creates a more coherent impression than maximizing one isolated number." },
      { heading: "Continue the conversation", text: "Reply to relevant comments and use questions as input for future content. Public activity around the post gives the like count context and helps new visitors understand the creator behind it." },
    ],
  },
  "instagram-views": {
    heading: "Give Instagram Reels and videos a stronger starting signal",
    intro: [
      "Instagram views can make early activity around a Reel or video more visible. They support awareness, while watch behavior, shares, profile visits, and follows reveal whether the content reached the right people.",
      "Paste a public Reel or video URL, select a package, and keep the post available while delivery completes. View orders do not require a login or password.",
    ],
    sections: [
      { heading: "Prepare the first frame", text: "Make the outcome, problem, or interesting detail visible immediately. New viewers need to understand why the Reel deserves attention before the opening moment passes." },
      { heading: "Use views with supporting signals", text: "Likes, comments, shares, and profile actions help explain what the view count means. Review the combination instead of treating plays as a complete measure of quality." },
      { heading: "Compare like with like", text: "Evaluate Reels of similar length, format, and topic together. This makes it easier to identify hooks and subjects that repeatedly produce useful attention." },
    ],
  },
  "instagram-comments": {
    heading: "Create a more active conversation around Instagram content",
    intro: ["Instagram comments add a visible discussion signal beneath a public post or Reel. They work best when the content already asks a clear question, presents a useful opinion, or gives viewers something specific to react to.", "Comment formats vary by fulfillment provider, so the final service mapping should accurately describe whether delivery uses custom text, randomized text, or emoji responses."],
    sections: [
      { heading: "Choose a conversation-ready post", text: "Use content with a clear subject and enough context for a natural response. Posts built around opinions, questions, launches, and transformations usually provide a stronger foundation." },
      { heading: "Review the wording before launch", text: "Custom comments should sound relevant to the post and should never make false customer claims. Keep wording varied, specific, and consistent with the audience’s language." },
      { heading: "Support genuine replies", text: "Continue answering real audience questions and moderating the discussion. Visible activity is more credible when the creator remains present in the conversation." },
    ],
  },
  "tiktok-followers": {
    heading: "Strengthen the first impression of your TikTok profile",
    intro: [
      "A TikTok follower package can support profile credibility when new viewers arrive from a video, collaboration, search result, or campaign. The account should already show a clear topic and several public videos worth exploring.",
      "Social Current sends orders through a configured fulfillment provider using only the public profile URL. Gradual delivery and order tracking keep the process understandable from start to finish.",
    ],
    sections: [
      { heading: "Make the profile worth following", text: "Use a recognizable profile image, a direct bio, and a pinned selection that shows what the account does best. New attention needs a clear reason to turn into lasting interest." },
      { heading: "Coordinate delivery with publishing", text: "Keep posting during the campaign so the account remains active. A short sequence of related videos gives new visitors more opportunities to understand and remember the creator." },
      { heading: "Look beyond the follower total", text: "Measure profile views, organic follows, comments, and returning viewers on later posts. These indicators show whether the stronger profile signal is contributing to a healthier account." },
    ],
  },
  "tiktok-likes": {
    heading: "Support a TikTok video with visible engagement",
    intro: [
      "TikTok likes are a quick public signal that viewers responded positively to a video. A package can add visible activity around a promising post while the hook, watch experience, and conversation create the deeper result.",
      "Each order applies to one public TikTok URL. Choose the amount, paste the video link, and follow delivery without sharing account credentials.",
    ],
    sections: [
      { heading: "Choose the right video", text: "Promote a video with a clear opening and a topic that represents what the account will publish next. A strong destination matters when viewers continue to the profile." },
      { heading: "Use the first hour well", text: "Stay available to answer useful comments, identify questions, and share the post with relevant existing audiences. Promotion is strongest when it supports active distribution." },
      { heading: "Review the full response", text: "Compare likes with watch time, shares, comments, profile views, and follows. Each signal answers a different question about the video and the audience it reached." },
    ],
  },
  "tiktok-views": {
    heading: "Give a TikTok video more visible starting momentum",
    intro: ["TikTok views show that playback began and can help a post look active when new visitors discover it. Watch time, completion, shares, and profile visits provide the context needed to judge whether that attention was useful.", "Use the full public video URL and keep the post available until delivery finishes. Views are delivered independently from likes, comments, and followers."],
    sections: [
      { heading: "Start with a strong first frame", text: "Show the topic, result, or tension immediately. A larger view count cannot compensate for an opening that leaves the audience unsure why they should continue." },
      { heading: "Match volume to the account", text: "Choose a package that makes sense beside current profile size and recent video performance. Measured changes are easier to coordinate with real publishing and distribution." },
      { heading: "Measure what viewers do next", text: "Compare average watch time, completion, shares, profile visits, and follows alongside views. These actions help explain whether the video reached an interested audience." },
    ],
  },
  "tiktok-comments": {
    heading: "Build visible discussion around a public TikTok",
    intro: ["TikTok comments can make a post feel more active and give later viewers additional context. They should support a real content plan and should never be used to invent endorsements or misrepresent customer experiences.", "Available comment styles depend on the connected provider. Confirm that the selected service matches the checkout experience before enabling live fulfillment."],
    sections: [
      { heading: "Use content that invites response", text: "Questions, comparisons, opinions, and useful demonstrations create natural openings for discussion. The post should give every comment a clear subject." },
      { heading: "Keep comments relevant", text: "Custom text should relate directly to the video and avoid repetitive language. Review comments for accuracy, tone, and disclosure before placing a live order." },
      { heading: "Stay involved in the thread", text: "Respond to genuine questions and use recurring themes as ideas for new videos. Creator participation turns visible activity into a more useful audience experience." },
    ],
  },
  "youtube-subscribers": {
    heading: "Strengthen the visible audience around a YouTube channel",
    intro: ["YouTube subscribers are a public signal of channel scale, but lasting growth depends on videos that give viewers a clear reason to return. Prepare the channel homepage, trailer, playlists, and recent uploads before starting a campaign.", "Subscriber packages use the public channel URL and gradual fulfillment. They do not provide channel access or guarantee monetization, reach, or recommendation placement."],
    sections: [
      { heading: "Prepare the channel journey", text: "Organize videos into clear topics and playlists so a new visitor can quickly find the next useful video. A focused channel promise makes the subscribe decision easier." },
      { heading: "Choose a measured amount", text: "Base package size on the current audience, upload history, and campaign activity. Use gradual steps while the public content library continues to grow." },
      { heading: "Track returning attention", text: "Review returning viewers, organic subscribers, watch time, and traffic between videos. These signals show whether the channel is building an audience beyond the visible total." },
    ],
  },
  "youtube-likes": {
    heading: "Add a visible positive signal to a YouTube video",
    intro: ["YouTube likes provide a simple public indication that viewers responded positively. They are most useful on a prepared video with a clear title, thumbnail, opening, and audience purpose.", "Each order applies to one public video. Delivery timing varies by quantity, and no access to the channel or Google account is required."],
    sections: [
      { heading: "Choose a representative video", text: "Support a video that reflects what the channel does well and leads naturally to another useful watch. New visitors should find a coherent channel after the first click." },
      { heading: "Keep public metrics in context", text: "Likes should make sense alongside views, comments, and channel size. Avoid treating a single counter as the complete measure of viewer response." },
      { heading: "Review deeper behavior", text: "Watch retention, comments, subscribers, and next-video clicks reveal more about audience quality. Use those outcomes to improve the next upload." },
    ],
  },
  "youtube-comments": {
    heading: "Support visible discussion beneath a YouTube video",
    intro: ["YouTube comments can make a public video feel more active and surface themes for later viewers. Useful comments need to fit the actual subject of the video and must not make invented customer or product claims.", "Provider capabilities vary between randomized and custom comments. The live service description and checkout fields should match the chosen panel service exactly."],
    sections: [
      { heading: "Choose content with a clear subject", text: "Tutorials, reviews, opinions, launches, and detailed stories give comments something specific to address. The video should stand on its own before any promotion begins." },
      { heading: "Use accurate, relevant language", text: "Review custom text for context, variety, and truthfulness. Avoid claims about products, results, or personal experiences that did not happen." },
      { heading: "Moderate the conversation", text: "Answer real questions, remove harmful content, and use viewer feedback to improve descriptions, follow-up videos, and future topics." },
    ],
  },
  "youtube-views": {
    heading: "Build visible traction around a prepared YouTube video",
    intro: [
      "YouTube views can support the visible momentum of a new or existing public video. The best campaigns begin with a title, thumbnail, and opening that make one useful promise to a specific viewer.",
      "Delivery is paced over the stated window and does not require channel access. Keep the video public and avoid overlapping view orders while the campaign is active.",
    ],
    sections: [
      { heading: "Align the title and thumbnail", text: "Both elements should communicate the same reason to watch. A clear expectation attracts more suitable viewers and gives the opening a fair chance to retain them." },
      { heading: "Protect the viewing experience", text: "Confirm the value of the click early, use chapters when helpful, and add captions. Visible views can attract attention, while the content determines whether that attention continues." },
      { heading: "Measure meaningful outcomes", text: "Review watch time, retention moments, comments, subscribers, and traffic to other videos. These signals provide the context needed to plan the next launch." },
    ],
  },
};
