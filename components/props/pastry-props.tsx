"use client";

import type { CSSProperties } from "react";

/**
 * CSS-3D pastry props — the decorative objects scattered through the page.
 *
 * No WebGL. Depth comes from three cheap cues, and the reason they read as one
 * set rather than a pile of clip-art is that all three are consistent:
 *
 *   1. Layered geometry   — real translateZ separation between parts
 *   2. Baked shading      — every gradient's light source is at 30% 25%
 *   3. Contact shadow     — a blurred ellipse beneath, softer the higher it floats
 *
 * GLOBAL LIGHT: top-left, warm. Highlight rgb(255 252 248 / .9),
 * shadow rgb(46 33 27 / .25). Do not introduce a second light direction.
 *
 * Every prop is aria-hidden and pointer-events-none. Motion is applied by the
 * parent <PropField>, never here — these are pure geometry.
 */

interface PropProps {
  /** px */
  size?: number;
  /** CSS position, e.g. "12%" */
  x?: string;
  y?: string;
  /** 0..1 — parallax rate, read by PropField. */
  depth?: number;
  className?: string;
}

function base(x?: string, y?: string, size?: number): CSSProperties {
  return {
    left: x,
    top: y,
    width: size,
    height: size,
    transformStyle: "preserve-3d",
  };
}

const SHELL_LIGHT = "radial-gradient(circle at 30% 25%, #FBEEF0 0%, #F6C7CF 45%, #D99BA8 100%)";

/** Soft contact shadow. `lift` 0..1 — higher floats further, so softer/wider. */
function Shadow({ lift = 0.5 }: { lift?: number }) {
  return (
    <span
      className="absolute left-1/2 -z-10 -translate-x-1/2 rounded-[50%]"
      style={{
        bottom: `${-8 - lift * 10}%`,
        width: `${86 - lift * 22}%`,
        height: `${16 - lift * 5}%`,
        background: "rgb(46 33 27 / 0.25)",
        filter: `blur(${4 + lift * 6}px)`,
        opacity: 0.75 - lift * 0.3,
      }}
    />
  );
}

/**
 * Macaron — three stacked ellipses (shell / ganache / shell) separated on Z,
 * tilted back so you read the top shell and the filling edge at once.
 */
export function Macaron({ size = 88, x, y, depth = 0.5, className = "" }: PropProps) {
  return (
    <div
      data-prop
      data-depth={depth}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{ ...base(x, y, size), perspective: "420px" }}
    >
      <div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d", transform: "rotateX(58deg)" }}
      >
        {/* bottom shell */}
        <span
          className="absolute inset-0 rounded-[50%]"
          style={{ background: SHELL_LIGHT, transform: "translateZ(-13px)", filter: "brightness(0.82)" }}
        />
        {/* ganache */}
        <span
          className="absolute rounded-[50%]"
          style={{
            inset: "6%",
            background: "linear-gradient(180deg, #7A4A38 0%, #5A3326 100%)",
            transform: "translateZ(-4px)",
          }}
        />
        {/* top shell + specular */}
        <span
          className="absolute inset-0 rounded-[50%]"
          style={{ background: SHELL_LIGHT, transform: "translateZ(8px)" }}
        />
        <span
          className="absolute rounded-[50%]"
          style={{
            left: "22%",
            top: "14%",
            width: "34%",
            height: "26%",
            background: "rgb(255 252 248 / 0.9)",
            filter: "blur(5px)",
            transform: "translateZ(9px)",
          }}
        />
      </div>
      <Shadow lift={depth} />
    </div>
  );
}

/** Cherry — a sphere by radial-gradient, plus a curved stem. */
export function Cherry({ size = 46, x, y, depth = 0.5, className = "" }: PropProps) {
  return (
    <div
      data-prop
      data-depth={depth}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={base(x, y, size)}
    >
      <span
        className="absolute rounded-full"
        style={{
          inset: "18% 0 0 0",
          background: "radial-gradient(circle at 30% 25%, #E8879B 0%, #C2566B 42%, #8E2740 100%)",
        }}
      />
      {/* specular */}
      <span
        className="absolute rounded-full"
        style={{
          left: "24%",
          top: "30%",
          width: "22%",
          height: "18%",
          background: "rgb(255 252 248 / 0.9)",
          filter: "blur(2px)",
        }}
      />
      {/* stem */}
      <span
        className="absolute"
        style={{
          left: "48%",
          top: "-6%",
          width: "34%",
          height: "34%",
          borderTop: "2.5px solid #6F5A3C",
          borderRight: "2.5px solid #6F5A3C",
          borderRadius: "0 100% 0 0",
        }}
      />
      <Shadow lift={depth} />
    </div>
  );
}

/** Chocolate curl — an organic blob with a twist. Reads well on dark bands. */
export function ChocolateCurl({ size = 64, x, y, depth = 0.5, className = "" }: PropProps) {
  return (
    <div
      data-prop
      data-depth={depth}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={base(x, y, size)}
    >
      <span
        className="absolute inset-0"
        style={{
          borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
          background: "linear-gradient(140deg, #8A5A3C 0%, #5A3326 45%, #3A1F16 100%)",
          transform: "rotate3d(1, 1, 0, 22deg)",
        }}
      />
      <span
        className="absolute"
        style={{
          left: "26%",
          top: "18%",
          width: "28%",
          height: "20%",
          borderRadius: "50%",
          background: "rgb(255 252 248 / 0.45)",
          filter: "blur(4px)",
        }}
      />
      <Shadow lift={depth} />
    </div>
  );
}

/**
 * Sprinkle cluster — the cheapest prop, so it carries density.
 * Positions are hardcoded rather than random: a random layout changes between
 * server and client render and desynchronises hydration.
 */
const SPRINKLES = [
  { x: 4, y: 20, r: -24, c: "#C2566B" },
  { x: 26, y: 4, r: 38, c: "#E8AF7C" },
  { x: 48, y: 30, r: -8, c: "#8FBF9F" },
  { x: 68, y: 10, r: 62, c: "#C2566B" },
  { x: 14, y: 56, r: 12, c: "#E8AF7C" },
  { x: 42, y: 68, r: -46, c: "#9A86C4" },
  { x: 74, y: 52, r: 26, c: "#8FBF9F" },
  { x: 90, y: 30, r: -32, c: "#C2566B" },
] as const;

export function Sprinkles({
  size = 130,
  x,
  y,
  depth = 0.5,
  className = "",
  tone = "warm",
}: PropProps & { tone?: "warm" | "light" }) {
  return (
    <div
      data-prop
      data-depth={depth}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{ ...base(x, y, size), opacity: tone === "light" ? 0.85 : 0.7 }}
    >
      {SPRINKLES.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: "13%",
            height: "4.5%",
            background: tone === "light" ? "#F2E8DC" : s.c,
            transform: `rotate(${s.r}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/** Cake slice — layered wedges via clip-path, with a lighter front face. */
export function CakeSlice({ size = 96, x, y, depth = 0.5, className = "" }: PropProps) {
  const WEDGE = "polygon(50% 0%, 100% 100%, 0% 100%)";
  const layers = [
    { top: "0%", h: "34%", bg: "linear-gradient(180deg, #8A5A3C, #6B4230)" },
    { top: "30%", h: "34%", bg: "linear-gradient(180deg, #FBEEF0, #EBD9DC)" },
    { top: "60%", h: "40%", bg: "linear-gradient(180deg, #8A5A3C, #5A3326)" },
  ];
  return (
    <div
      data-prop
      data-depth={depth}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={base(x, y, size)}
    >
      <span className="absolute inset-0" style={{ clipPath: WEDGE, overflow: "hidden" }}>
        {layers.map((l, i) => (
          <span key={i} className="absolute left-0 w-full" style={{ top: l.top, height: l.h, background: l.bg }} />
        ))}
        {/* top-left light wash, matching the global light direction */}
        <span
          className="absolute inset-0"
          style={{ background: "linear-gradient(125deg, rgb(255 252 248 / 0.35), transparent 55%)" }}
        />
      </span>
      {/* cherry on top */}
      <span
        className="absolute rounded-full"
        style={{
          left: "42%",
          top: "-6%",
          width: "16%",
          height: "16%",
          background: "radial-gradient(circle at 30% 25%, #E8879B, #8E2740)",
        }}
      />
      <Shadow lift={depth} />
    </div>
  );
}
