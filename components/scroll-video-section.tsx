"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * One pinned section whose video is scrubbed by scroll position.
 *
 * Deliberately self-contained: each section owns its own clip, so there are no
 * seams to match between clips. That removes the entire class of continuity
 * problems that the chained-flight approach has (shared frames, drift, motion
 * reversal at the join) and lets each clip load only when its own section is
 * approaching.
 *
 * Scrubbing sets video.currentTime from scroll progress rather than playing the
 * video, so the user's scroll IS the transport. Autoplay policies never come
 * into it because the video is never actually played.
 *
 * Degrades in three steps:
 *   no JS / reduced motion  -> poster still, no pin
 *   narrow viewport         -> poster still, no pin, no video download
 *   no clip supplied yet    -> poster still with a slow Ken Burns drift
 */

export function ScrollVideoSection({
  src,
  poster,
  eyebrow,
  title,
  body,
  align = "left",
  /** How much scroll the pin holds for. 200% = two viewport heights. */
  hold = "200%",
}: {
  src?: string;
  poster: string;
  eyebrow?: string;
  title: string;
  body: string;
  align?: "left" | "right" | "center";
  hold?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const copy = el.querySelector("[data-copy]");

        const st = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: `+=${hold}`,
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            const v = video.current;
            // readyState >= 1 means metadata (and therefore duration) exists.
            if (!v || v.readyState < 1 || !Number.isFinite(v.duration)) return;
            const t = self.progress * v.duration;
            // Guard against re-seeking to the same frame on every tick.
            if (Math.abs(v.currentTime - t) > 1 / 60) v.currentTime = t;
          },
        });

        if (copy) {
          gsap.fromTo(
            copy,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              ease: "power3.out",
              duration: 0.8,
              scrollTrigger: { trigger: el, start: "top 70%", once: true },
            }
          );
        }

        return () => st.kill();
      });

      return () => mm.revert();
    },
    { scope: section, dependencies: [hold] }
  );

  const position =
    align === "right"
      ? "items-end text-right"
      : align === "center"
        ? "items-center text-center"
        : "items-start text-left";

  return (
    <section
      ref={section}
      data-contrast-ground="cocoa"
      className="relative h-[100dvh] overflow-hidden bg-cocoa"
    >
      {/* Poster is always painted: it is the LCP-safe first frame, the
          reduced-motion state, and the mobile state. */}
      <Image
        src={poster}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className={`object-cover transition-opacity duration-700 ${
          ready ? "opacity-0" : "opacity-100"
        } ${src ? "" : "kenburns"}`}
      />

      {src && (
        <video
          ref={video}
          src={src}
          poster={poster}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onLoadedMetadata={() => setReady(true)}
          className={`absolute inset-0 hidden h-full w-full object-cover transition-opacity duration-700 md:block ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Scrim so copy stays readable over any frame of the clip. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-cocoa via-cocoa/55 to-cocoa/25"
      />

      <div className="relative flex h-full items-center px-6 sm:px-10">
        <div className={`mx-auto flex w-full max-w-5xl flex-col ${position}`}>
          <div data-copy className="max-w-xl">
            {eyebrow && <p className="text-eyebrow mb-3 text-blush">{eyebrow}</p>}
            <h2 className="text-h2 text-shell drop-shadow-[0_2px_24px_rgba(46,33,27,0.7)]">
              {title}
            </h2>
            <p className="mt-4 text-[#D8CCC0]">{body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
