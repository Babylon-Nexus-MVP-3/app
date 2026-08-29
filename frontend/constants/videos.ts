/*
  The "How to use VouchPay" walkthrough videos.

  ─── TO PUBLISH A VIDEO ──────────────────────────────────────────────────────
  Paste its link into the `url` below. That is the only change needed — the Me
  tab reads this list directly, so a row switches from "Coming soon" to tappable
  the moment a URL is present. No other file needs touching.

  Any https link the phone can open works: YouTube, Vimeo, Loom, or a plain
  hosted .mp4. Leave `url` as "" for anything not filmed yet.
*/
import { Ionicons } from "@expo/vector-icons";

export type HowToVideo = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Empty until the video is ready — the row renders as "Coming soon". */
  url: string;
};

export const HOW_TO_VIDEOS: HowToVideo[] = [
  {
    id: "intro",
    title: "Why VouchPay exists",
    description: "What the app is for and the problem it was built to solve",
    icon: "sparkles-outline",
    url: "",
  },
  {
    id: "projects",
    title: "Projects, end to end",
    description: "Creating and joining projects, invoices, and tracking payment",
    icon: "briefcase-outline",
    url: "",
  },
  {
    id: "vouches",
    title: "Giving and receiving vouches",
    description: "Building your credibility and vouching for people you've worked with",
    icon: "shield-checkmark-outline",
    url: "",
  },
];
