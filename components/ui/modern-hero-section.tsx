"use client";

import React from "react";
import Image from "next/image";
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
    return (
      <section
        ref={ref}
        className={cn("relative w-full overflow-hidden py-20 font-sans sm:py-32", className)}
        {...props}
      >
        {/* Background image with blur + warm overlay */}
        {backgroundImage && (
          <>
            <Image
              src={backgroundImage}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              className="scale-105 object-cover opacity-30 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
          </>
        )}

        {/* Main Content */}
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="text-display text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-soft md:text-lg">
            {subtitle}
          </p>
        </div>

        {/* Image Collage */}
        <div className="relative z-0 mt-20 flex h-[400px] items-center justify-center sm:h-[500px] md:h-[600px]">
          <div className="relative h-full w-full max-w-6xl">
            {SLOTS.map((slot, i) => {
              const src = images[i];
              if (!src) return null;
              return (
                <div
                  key={slot.key}
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
          <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl font-bold tracking-tight text-berry">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-ink-soft">{stat.label}</p>
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
