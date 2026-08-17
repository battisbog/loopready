import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://loopready-five.vercel.app"),
  title: {
    default: "LoopReady: Voice mock interviews for your FAANG loop",
    template: "%s · LoopReady",
  },
  description:
    "Practice a real behavioral interview out loud. An AI interviewer that probes vague answers, calibrated to your target company and level, plus an honest debrief telling you where you'd get dinged.",
  keywords: [
    "mock interview",
    "behavioral interview practice",
    "FAANG interview prep",
    "Amazon Leadership Principles",
    "system design interview",
  ],
  openGraph: {
    title: "LoopReady: Fail your mock, not your loop",
    description:
      "Voice mock interviews calibrated to your target company and level, with feedback that tells you where you'd get dinged.",
    type: "website",
    siteName: "LoopReady",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoopReady: Fail your mock, not your loop",
    description:
      "Voice mock interviews calibrated to your target company and level.",
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
      </body>
    </html>
  );
}
