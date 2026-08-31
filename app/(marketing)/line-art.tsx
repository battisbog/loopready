/**
 * Abstract isometric line-art, used as SECONDARY decoration only.
 *
 * Thin outline geometry in a single neutral stroke -- the palette is
 * black/white/gray, so these carry visual interest through form rather than
 * colour. They sit in space that would otherwise be empty (section
 * transitions, either side of the logo strip) and are deliberately quiet:
 * low opacity, `currentColor` stroke inherited from a muted parent, and no
 * fill. They must never compete with the hero's product mockup, which is
 * still the page's primary visual.
 *
 * Every shape is `aria-hidden` and `pointer-events-none`: decoration with no
 * meaning to convey and nothing to click.
 */

/** Isometric cube drawn as three rhombus faces sharing a centre vertex. */
export function IsoCube({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 138"
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        {/* outer hexagon silhouette */}
        <path d="M60 4 116 36v66L60 134 4 102V36z" />
        {/* the three interior edges meeting at the centre -- what reads the
            flat hexagon as a cube */}
        <path d="M60 69 116 36M60 69 4 36M60 69v65" />
      </g>
    </svg>
  );
}

/** Nested diamonds, concentric. Quieter than the cube; good for edges. */
export function DiamondStack({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        <path d="M60 2 118 60 60 118 2 60z" />
        <path d="M60 26 94 60 60 94 26 60z" />
        <path d="M60 48 72 60 60 72 48 60z" />
      </g>
    </svg>
  );
}

/** A grid of dots that fades out -- texture rather than a shape. */
export function DotGrid({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
    >
      <defs>
        <pattern
          id="lineart-dots"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
        {/* Fades the texture out toward the edges so it has no hard boundary
            to give itself away as a rectangle sitting on the page. */}
        <radialGradient id="lineart-dots-fade">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="lineart-dots-mask">
          <rect width="160" height="160" fill="url(#lineart-dots-fade)" />
        </mask>
      </defs>
      <rect
        width="160"
        height="160"
        fill="url(#lineart-dots)"
        mask="url(#lineart-dots-mask)"
      />
    </svg>
  );
}
