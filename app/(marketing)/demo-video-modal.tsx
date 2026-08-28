"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";

/**
 * "Watch demo" trigger + lightbox.
 *
 * The <video> tag only exists in the DOM once `open` is true, so the browser
 * never requests demo.mp4 on page load -- clicking the trigger is what lazy-
 * loads it. `preload="none"` on top of that means even the poster-adjacent
 * metadata fetch waits for the click, not just the mount.
 */
export default function DemoVideoModal({
  ctaHref,
  ctaLabel = "Start for free",
}: {
  ctaHref: string;
  /** Matches whatever the page's own primary CTA says (e.g. "Go to
   *  dashboard" for a signed-in visitor), so the modal never promises a
   *  different next step than the button that opened it. */
  ctaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setOpen(true)}
      >
        Watch demo
        {/* Inline rather than from an icon package: this codebase has no icon
            set (the close X and the play triangle below are inline too), and
            one arrow is not worth a dependency. Button's BASE already applies
            `inline-flex items-center gap-2`, so the icon centres against the
            label without any alignment classes here. aria-hidden because the
            label already carries the meaning. */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
      {open && (
        <Lightbox
          onClose={() => setOpen(false)}
          ctaHref={ctaHref}
          ctaLabel={ctaLabel}
        />
      )}
    </>
  );
}

function Lightbox({
  onClose,
  ctaHref,
  ctaLabel,
}: {
  onClose: () => void;
  ctaHref: string;
  ctaLabel: string;
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

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LoopReady demo video"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
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

        {/* One action only: whatever "Start for free" / "Go to dashboard" means
            on this page for this visitor. Generous padding on every side and
            real vertical rhythm between the label and the button, rather than
            the video, text, and button all sharing one tight row against the
            card edge. */}
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:px-8">
          <p className="text-sm text-secondary">Ready to try it?</p>
          <Button href={ctaHref} size="lg" className="w-full sm:w-auto">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  /**
   * Rendered via a portal straight onto <body>, escaping the hero's `.rise`
   * animation wrapper.
   *
   * `.rise` ends its animation on `transform: translateY(0)` with
   * `animation-fill-mode: both`, so that transform value persists after the
   * animation finishes -- and per the CSS spec, ANY non-`none` transform on
   * an ancestor (even a no-op translateY(0)) creates a new containing block
   * for `position: fixed` descendants. Without the portal, this modal's
   * `fixed inset-0` was sizing itself to that small hero column instead of
   * the viewport: a small floating box with the real page bleeding through
   * around it, and the page's own hero buttons sitting a few pixels outside
   * it looking like they belonged to the modal. The portal makes the modal a
   * sibling of that entire subtree, so `fixed` means the viewport again.
   */
  return createPortal(modal, document.body);
}
