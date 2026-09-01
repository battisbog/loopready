import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "LoopReady: Voice and video mock interviews for your FAANG loop",
    template: "%s · LoopReady",
  },
  description:
    "Practice a full FAANG interview loop out loud — behavioral, coding, and system design. An AI interviewer that probes vague answers, calibrated to your target company and level, plus an honest debrief telling you where you'd get dinged.",
  keywords: [
    "mock interview",
    "behavioral interview practice",
    "FAANG interview prep",
    "Amazon Leadership Principles",
    "system design interview",
  ],
  /**
   * og:title used to be word-for-word the same headline already baked into
   * opengraph-image.tsx's PNG ("Pass your loop, not just your mock"). A
   * platform that renders the image with the title as a caption underneath
   * it -- which is the normal card layout -- showed that sentence twice: once
   * as pixels, once as text. The fix is that og:title now says something the
   * image itself doesn't, so a caption is a caption, not an echo.
   *
   * 58 characters. Confirmed against current guidance rather than assumed:
   * X/Twitter's documented max is 70 (their own "optimal single line" figure
   * is 55, so this may wrap to two lines on X specifically, but will not
   * truncate). Facebook/LinkedIn truncate in the 88-95 character range, so
   * this clears their hard limit with room to spare, though mobile OG
   * surfaces that only show ~40-50 characters may still wrap it.
   */
  openGraph: {
    title: "LoopReady: an AI interviewer that probes like a real human",
    description:
      "Calibrated to your target company and level, with feedback that tells you where you'd get dinged.",
    type: "website",
    siteName: "LoopReady",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoopReady: an AI interviewer that probes like a real human",
    description:
      "Calibrated to your target company and level, with feedback that tells you where you'd get dinged.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-base text-primary">
        {children}
        {/* Renders nothing visible; tracks page views for every route from
            this one place rather than needing to be added per-page. */}
        <Analytics />
      </body>
    </html>
  );
}
