"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

const Scene = dynamic(() => import("./scroll-world-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Pinned scroll sequence: the section sticks to the viewport and scrolling
 * flies a camera through a 3D bakery world while three captions hand off.
 *
 * Pin mechanics follow the canonical pattern: `start: "top top"` so the pin
 * begins exactly when the section reaches the viewport top (a "top center"
 * start is the usual bug, where the animation is already half over before the
 * section is stuck), `end` expressed as scroll distance, and `scrub` so
 * position is driven by the scrollbar rather than time.
 *
 * Progress is written to a ref, never state: state would re-render on every
 * scroll frame.
 *
 * Below 1024px or under reduced motion the canvas never mounts and the
 * captions render as a normal stacked section, so the content is identical.
 */

const BEATS = [
  {
    title: "Nothing is baked until you order it",
    body: "Every cake, cheesecake and tray of brownies goes into the oven after the order comes in. That is why we ask for notice.",
  },
  {
    title: "Made by hand, in small batches",
    body: "Tea cakes, cheesecakes, cupcakes, brownies, high tea nibbles, desserts and frosted sponge cakes.",
  },
  {
    title: "Ready when you are",
    body: "Choose a pickup slot or have it delivered across Shillong. We box it the way it should arrive.",
  },
];

export function ScrollWorld() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [immersive, setImmersive] = useState(false);

  useEffect(() => {
    // Deferred out of the synchronous effect body: setting state inline there
    // triggers a cascading render, and it also lets the pinned canvas wait
    // until after first paint rather than competing with it.
    const id = window.setTimeout(() => {
      const big = window.matchMedia("(min-width: 1024px)").matches;
      const motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setImmersive(big && motion);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useGSAP(
    () => {
      const el = section.current;
      if (!el || !immersive) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const captions = gsap.utils.toArray<HTMLElement>("[data-beat]", el);

        const st = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
        });

        // Captions hand off across the flight. Each owns a third of the range.
        captions.forEach((cap, i) => {
          const slot = 1 / captions.length;
          gsap.fromTo(
            cap,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: () => `top top+=${i * slot * 100}%`,
                end: () => `top top+=${(i + 0.35) * slot * 100}%`,
                scrub: true,
              },
            }
          );
          if (i < captions.length - 1) {
            gsap.to(cap, {
              opacity: 0,
              y: -28,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: () => `top top+=${(i + 0.75) * slot * 100}%`,
                end: () => `top top+=${(i + 1) * slot * 100}%`,
                scrub: true,
              },
            });
          }
        });

        return () => st.kill();
      });

      return () => mm.revert();
    },
    { scope: section, dependencies: [immersive] }
  );

  return (
    <section
      ref={section}
      data-contrast-ground="cocoa"
      className="relative overflow-hidden bg-cocoa"
    >
      {immersive ? (
        <div className="relative h-[100dvh] w-full">
          <div className="absolute inset-0">
            <Scene progress={progress} />
          </div>

          {/* Captions stack in the same cell so they cross-fade in place. */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
            <div className="relative w-full max-w-xl text-center">
              {BEATS.map((beat, i) => (
                <div
                  key={beat.title}
                  data-beat
                  className={
                    i === 0
                      ? "relative"
                      : "absolute inset-0 flex flex-col items-center justify-center"
                  }
                >
                  <h2 className="text-h2 text-shell drop-shadow-[0_2px_24px_rgba(46,33,27,0.7)]">
                    {beat.title}
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-[#D8CCC0]">{beat.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Same content, no canvas, no pin.
        <div className="mx-auto max-w-2xl space-y-12 px-4 py-20 sm:px-6">
          {BEATS.map((beat) => (
            <div key={beat.title}>
              <h2 className="text-h2 text-shell">{beat.title}</h2>
              <p className="mt-3 text-[#D8CCC0]">{beat.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
