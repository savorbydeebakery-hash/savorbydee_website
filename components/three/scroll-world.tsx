"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { Reveal } from "@/components/kinetic/reveal";
import { PropField } from "@/components/props/prop-field";
import { Macaron, Cherry, CakeSlice } from "@/components/props/pastry-props";

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
 * Below 768px or under reduced motion the canvas never mounts. The fallback is
 * a designed section in its own right, not a text dump: gradient mesh, grain,
 * oversized outlined numerals, CSS-3D pastry props and scroll reveals. Phones
 * only ever see that branch, so it has to stand on its own.
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

  // matchMedia is external state, so it is read with useSyncExternalStore
  // rather than an effect + setState.
  //
  // The previous version scheduled a setTimeout in an effect and cleared it on
  // cleanup. Under Strict Mode (on in `next dev`, off in production) React
  // mounts, cleans up, then mounts again, and that race left `immersive` false
  // forever in dev while production worked, which is the worst kind of bug to
  // chase. This also picks up viewport resizes, which the effect version never
  // did: dragging a window past 768px now enables the flight.
  const subscribe = useCallback((onChange: () => void) => {
    const width = window.matchMedia("(min-width: 768px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    width.addEventListener("change", onChange);
    motion.addEventListener("change", onChange);
    return () => {
      width.removeEventListener("change", onChange);
      motion.removeEventListener("change", onChange);
    };
  }, []);

  const immersive = useSyncExternalStore(
    subscribe,
    () =>
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false // server: always the fallback, so SSR markup is stable
  );

  useGSAP(
    () => {
      const el = section.current;
      if (!el || !immersive) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
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
      data-immersive={String(immersive)}
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
        <PropField className="py-20">
          {/* Same gradient mesh + grain as the hero, so the band is lit rather
              than a flat brown slab. */}
          <div
            aria-hidden="true"
            className="hero-mesh pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(55% 45% at 15% 15%, color-mix(in oklab, var(--berry) 50%, transparent), transparent 60%)," +
                "radial-gradient(45% 40% at 85% 45%, rgb(232 175 124 / 0.22), transparent 62%)," +
                "radial-gradient(60% 50% at 45% 95%, rgb(246 199 207 / 0.16), transparent 66%)",
            }}
          />
          <div aria-hidden="true" className="hero-grain absolute inset-0" />

          <Macaron size={72} x="82%" y="6%" depth={0.6} className="hidden sm:block" />
          <Cherry size={40} x="8%" y="44%" depth={0.4} className="hidden sm:block" />
          <CakeSlice size={72} x="86%" y="78%" depth={0.75} className="hidden sm:block" />

          <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
            {BEATS.map((beat, i) => (
              <Reveal key={beat.title} delay={i * 0.08}>
                <div
                  className={`grid grid-cols-[auto_1fr] items-start gap-x-5 gap-y-2 py-10 sm:gap-x-8 ${
                    i > 0 ? "border-t border-shell/12" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="font-display text-[2.75rem] font-semibold leading-none text-transparent sm:text-[4.5rem]"
                    style={{ WebkitTextStroke: "1.5px var(--blush)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-h2 text-shell">{beat.title}</h2>
                    <p className="mt-3 max-w-prose text-[#D8CCC0]">{beat.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </PropField>
      )}
    </section>
  );
}
