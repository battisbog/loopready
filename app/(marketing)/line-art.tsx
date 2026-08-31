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

/* ------------------------------------------------------------------
   Round-type figures (the "FIG 0.x" columns in rounds-showcase.tsx).

   Larger and more load-bearing than the decorative shapes above -- these
   are the only visual each column gets -- but they follow the same rules:
   abstract geometry, single 1px currentColor stroke, no fill, no hue. Each
   evokes its round rather than illustrating it literally; a laptop icon for
   "Coding" would be clipart, and this page has a real product mockup
   directly below for anyone who wants literal.
   ------------------------------------------------------------------ */

/**
 * Coding: three isometric slabs stacked into a tower.
 *
 * Each slab is a rhombus top face plus a short skirt on its two front edges,
 * which is what reads the flat diamond as a solid with thickness. Stacked,
 * they suggest blocks of code composing into something.
 */
export function IsoBlocks({ className }: { className?: string }) {
  // One slab per entry: y is the top vertex, and every other point is
  // derived from it, so the three stay identical in shape and spacing.
  const slabs = [8, 42, 76];
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        {slabs.map((y) => (
          <g key={y}>
            {/* top face */}
            <path d={`M60 ${y} 108 ${y + 24} 60 ${y + 48} 12 ${y + 24}z`} />
            {/* front-left and front-right skirt, plus the near vertical edge */}
            <path
              d={`M12 ${y + 24}v8l48 24 48-24v-8M60 ${y + 48}v8`}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * System design: a node graph -- a hub wired to five satellites, with a
 * partial ring around the outside. Diamonds rather than circles for the
 * nodes, so it stays in the same isometric family as the other two figures.
 */
export function NodeWeb({ className }: { className?: string }) {
  const hub = { x: 60, y: 60 };
  const satellites = [
    { x: 60, y: 12 },
    { x: 14, y: 42 },
    { x: 106, y: 42 },
    { x: 32, y: 102 },
    { x: 88, y: 102 },
  ];
  /** Small diamond, drawn around a point. */
  const node = (x: number, y: number, r: number) =>
    `M${x} ${y - r} ${x + r} ${y} ${x} ${y + r} ${x - r} ${y}z`;

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        {/* spokes first, so the node marks sit on top of the line ends */}
        {satellites.map((s) => (
          <path key={`${s.x}-${s.y}`} d={`M${hub.x} ${hub.y}L${s.x} ${s.y}`} />
        ))}
        {/* two perimeter hops -- enough to read as a network rather than a
            star, without closing into a solid ring */}
        <path d="M14 42 32 102M106 42 88 102" />
        {satellites.map((s) => (
          <path key={`n-${s.x}-${s.y}`} d={node(s.x, s.y, 7)} />
        ))}
        <path d={node(hub.x, hub.y, 11)} />
      </g>
    </svg>
  );
}

/**
 * Behavioral: two offset planes with a circulation between them -- two
 * people, two turns, and the back-and-forth that connects them. The arcs run
 * in opposite directions on purpose; a single arc would read as one-way.
 */
export function ExchangeArcs({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        {/* the two planes */}
        <path d="M44 22 80 40 44 58 8 40z" />
        <path d="M76 62 112 80 76 98 40 80z" />
        {/* the exchange: one arc out, one back */}
        <path d="M26 50Q22 80 48 88" />
        <path d="M94 70Q98 40 72 32" />
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
