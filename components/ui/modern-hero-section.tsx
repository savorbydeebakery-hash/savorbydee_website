"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { HeroGlass } from "@/components/three/hero-glass";
import { HeroBackdrop } from "@/components/three/hero-backdrop";
import { cn } from "@/lib/utils";

interface HeroCollageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle: string;
  stats: { value: string; label: string }[];
  images: string[];
  backgroundImage?: string;
}

/**
 * Collage layout, front to back. Extracted from seven near-identical JSX blocks
 * so Phase 5 can attach parallax by reading `depth` off a single array.
 *
 * `sizes` is per-slot and matches the rendered box — with the Supabase loader a
 * wrong value silently ships an oversized file.
 */
const SLOTS = [
  {
    key: "center",
    position: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20",
    width: "w-[200px] sm:w-[250px] md:w-[300px]",
    aspect: "aspect-[3/4]",
    radius: "rounded-2xl",
    shadow: "shadow-2xl",
    delay: "0s",
    sizes: "(max-width: 640px) 200px, (max-width: 768px) 250px, 300px",
    depth: 0.15,
  },
  {
    key: "top-left",
    position: "left-[10%] sm:left-[22%] top-[10%] sm:top-[15%] z-10",
    width: "w-32 sm:w-44 md:w-52",
    aspect: "aspect-square",
    radius: "rounded-xl",
    shadow: "shadow-lg",
    delay: "-1.2s",
    sizes: "(max-width: 640px) 128px, (max-width: 768px) 176px, 208px",
    depth: 0.55,
  },
  {
    key: "top-right",
    position: "right-[10%] sm:right-[24%] top-[5%] sm:top-[10%] z-10",
    width: "w-28 sm:w-40 md:w-48",
    aspect: "aspect-square",
    radius: "rounded-xl",
    shadow: "shadow-lg",
    delay: "-2.5s",
    sizes: "(max-width: 640px) 112px, (max-width: 768px) 160px, 192px",
    depth: 0.6,
  },
  {
    key: "bottom-right",
    position: "right-[8%] sm:right-[20%] bottom-[8%] sm:bottom-[12%] z-30",
    width: "w-36 sm:w-48 md:w-60",
    aspect: "aspect-[4/3]",
    radius: "rounded-xl",
    shadow: "shadow-lg",
    delay: "-3.5s",
    sizes: "(max-width: 640px) 144px, (max-width: 768px) 192px, 240px",
    depth: 0.4,
  },
  {
    key: "far-right",
    position: "right-[0%] sm:right-[5%] top-1/2 -translate-y-[60%] z-10",
    width: "w-32 sm:w-44 md:w-52",
    aspect: "aspect-square",
    radius: "rounded-xl",
    shadow: "shadow-lg",
    delay: "-4.8s",
    sizes: "(max-width: 640px) 128px, (max-width: 768px) 176px, 208px",
    depth: 0.85,
  },
  {
    key: "bottom-left",
    position: "left-[8%] sm:left-[18%] bottom-[5%] sm:bottom-[8%] z-30",
    width: "w-32 sm:w-44 md:w-56",
    aspect: "aspect-[4/3]",
    radius: "rounded-xl",
    shadow: "shadow-lg",
    delay: "-5.2s",
    sizes: "(max-width: 640px) 128px, (max-width: 768px) 176px, 224px",
    depth: 0.45,
  },
  {
    key: "far-left",
    position: "left-[0%] sm:left-[5%] top-[20%] sm:top-[25%] z-10",
    width: "w-28 sm:w-40 md:w-48",
    aspect: "aspect-square",
    radius: "rounded-xl",
    shadow: "shadow-lg",
    delay: "-6s",
    sizes: "(max-width: 640px) 112px, (max-width: 768px) 160px, 192px",
    depth: 0.8,
  },
] as const;

const HeroCollage = React.forwardRef<HTMLDivElement, HeroCollageProps>(
  ({ className, title, subtitle, stats, images, backgroundImage, ...props }, ref) => {
    const scope = useRef<HTMLElement>(null);

    useGSAP(
      () => {
        const root = scope.current;
        if (!root) return;

        const tiles = gsap.utils.toArray<HTMLElement>("[data-collage-tile]", root);
        const photo = root.querySelector<HTMLElement>("[data-hero-photo]");
        if (tiles.length === 0) return;

        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
          // Scroll parallax — deeper tiles travel further as the hero exits.
          gsap.to(tiles, {
            y: (_i, el: HTMLElement) => -180 * Number(el.dataset.depth ?? 0.4),
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 1,
            },
          });

          if (photo) {
            gsap.to(photo, {
              y: 80,
              ease: "none",
              scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 1 },
            });
          }
        });

        // Pointer parallax — fine pointers only. Touch devices report
        // coarse and would get nothing useful from mousemove anyway.
        mm.add(
          "(pointer: fine) and (prefers-reduced-motion: no-preference)",
          () => {
            // quickTo is materially cheaper than a fresh tween per event.
            const movers = tiles.map((el) => ({
              el,
              depth: Number(el.dataset.depth ?? 0.4),
              toX: gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" }),
              toY: gsap.quickTo(el, "yPercent", { duration: 0.7, ease: "power3.out" }),
            }));

            const onMove = (e: PointerEvent) => {
              const { innerWidth: w, innerHeight: h } = window;
              const dx = (e.clientX - w / 2) / w;
              const dy = (e.clientY - h / 2) / h;
              movers.forEach(({ depth, toX, toY }) => {
                toX(dx * depth * 60);
                toY(dy * depth * 12);
              });
            };

            window.addEventListener("pointermove", onMove, { passive: true });
            return () => window.removeEventListener("pointermove", onMove);
          }
        );

        return () => mm.revert();
      },
      { scope }
    );

    return (
      <section
        ref={(node) => {
          scope.current = node;
          if (typeof ref === "function") ref(node as never);
          else if (ref) (ref as React.RefObject<HTMLElement | null>).current = node;
        }}
        data-contrast-ground="cocoa"
        className={cn("relative w-full overflow-hidden py-20 font-sans sm:py-32", className)}
        {...props}
      >
        {/* ---- Background, back to front ----
            Was a single blurred photo at opacity-30 under a flat cream
            gradient, which is the "boring background" being replaced.
            Four layers now: cocoa gradient mesh, the photo, film grain, and a
            vignette. The mesh is what the hero's glass elements refract. */}

        {/* 1. Cocoa base + animated gradient mesh */}
        <div aria-hidden="true" className="absolute inset-0 bg-cocoa" />
        <div
          aria-hidden="true"
          className="hero-mesh absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(55% 65% at 18% 22%, color-mix(in oklab, var(--berry) 60%, transparent), transparent 62%)," +
              "radial-gradient(50% 60% at 82% 28%, rgb(247 216 204 / 0.32), transparent 62%)," +
              "radial-gradient(65% 70% at 60% 88%, rgb(154 134 196 / 0.28), transparent 66%)," +
              "radial-gradient(80% 60% at 50% 50%, rgb(74 56 48 / 0.5), transparent 75%)",
          }}
        />

        {/* 1b. Interactive shader field, layered over the CSS mesh. The mesh
               stays as the always-painted floor, so phones, reduced motion and
               the pre-chunk moment all still look right. */}
        <HeroBackdrop className="absolute inset-0" />

        {/* 2. Photo */}
        {backgroundImage && (
          <Image
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            data-hero-photo
            className="scale-110 object-cover opacity-25 mix-blend-luminosity"
          />
        )}

        {/* 3. Film grain — one cheap layer, and most of what separates a
               designed gradient from a default one. */}
        <div aria-hidden="true" className="hero-grain absolute inset-0" />

        {/* 4. Vignette, to pull the eye to the headline */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 35%, rgb(46 33 27 / 0.85) 100%)",
          }}
        />

        {/* Main Content */}
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="text-display text-shell drop-shadow-[0_2px_24px_rgba(46,33,27,0.5)]">
            {title}
          </h1>
          {/* #D8CCC0 on cocoa is 7.4:1 — --ink-soft would be unreadable here. */}
          <p className="mx-auto mt-6 max-w-2xl text-base text-[#D8CCC0] md:text-lg">
            {subtitle}
          </p>
        </div>

        {/* WebGL centrepiece. Sits behind the collage (z-0 vs the tiles' z-10+)
            so the photos read first and the glass is atmosphere, not the
            subject. Desktop + idle only; see HeroGlass for the gate. */}
        <HeroGlass className="pointer-events-none absolute left-1/2 top-[62%] z-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2" />

        {/* Image Collage */}
        <div className="relative z-0 mt-20 flex h-[400px] items-center justify-center sm:h-[500px] md:h-[600px]">
          <div className="relative h-full w-full max-w-6xl">
            {SLOTS.map((slot, i) => {
              const src = images[i];
              if (!src) return null;
              return (
                <div
                  key={slot.key}
                  data-collage-tile
                  data-depth={slot.depth}
                  className={cn(
                    "absolute animate-float-up overflow-hidden",
                    slot.position,
                    slot.width,
                    slot.aspect,
                    slot.radius,
                    slot.shadow
                  )}
                  style={{ animationDelay: slot.delay }}
                >
                  <Image
                    src={src}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes={slot.sizes}
                    // The centre image is the largest above-the-fold element
                    // and the likely LCP candidate — never lazy-load it.
                    priority={i === 0}
                    className="object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Section */}
        <div className="container relative z-10 mx-auto mt-16 px-4">
          {/* Glass over the gradient mesh — the placement rule's happy path. */}
          <div className="mx-auto flex max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass glass-liquid glass-sheen flex-1 rounded-[var(--r-lg)] px-6 py-5 text-center"
              >
                <p className="font-display text-4xl font-bold tracking-tight text-blush">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-[#D8CCC0]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
);

HeroCollage.displayName = "HeroCollage";

export { HeroCollage };
