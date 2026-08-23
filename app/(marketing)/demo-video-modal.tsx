"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * "Watch it in action" trigger + lightbox.
 *
 * The <video> tag only exists in the DOM once `open` is true, so the browser
 * never requests demo.mp4 on page load -- clicking the trigger is what lazy-
 * loads it. `preload="none"` on top of that means even the poster-adjacent
 * metadata fetch waits for the click, not just the mount.
 */
export default function DemoVideoModal({ ctaHref }: { ctaHref: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setOpen(true)}
      >
        Watch it in action
      </Button>
      {open && <Lightbox onClose={() => setOpen(false)} ctaHref={ctaHref} />}
    </>
  );
}

function Lightbox({
  onClose,
  ctaHref,
}: {
  onClose: () => void;
  ctaHref: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LoopReady demo video"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-secondary transition-colors hover:bg-elevated hover:text-primary sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-surface shadow-2xl shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video bg-base">
          <video
            ref={videoRef}
            src="/demo.mp4"
            poster="/demo-poster.png"
            controls={playing}
            preload="none"
            playsInline
            className="h-full w-full"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {!playing && (
            <button
              type="button"
              onClick={() => videoRef.current?.play()}
              aria-label="Play video"
              className="group absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[var(--shadow-accent)] transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-secondary">
            Ready to try it?
          </p>
          <Button href={ctaHref} size="md">
            Start free
          </Button>
        </div>
      </div>
    </div>
  );
}
