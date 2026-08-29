"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { HeroBackdrop } from "@/components/three/hero-backdrop";
import { Sprinkles, Macaron, Cherry } from "@/components/props/pastry-props";
import { ShoppingBag, ArrowRight, Sparkles, HeartHandshake, Flame } from "lucide-react";

/**
 * Hero: a light card floating on a live colour field.
 *
 * Composition follows the reference (card on a tinted ground, left-aligned
 * display type with an accented line, product imagery floating free on the
 * right, small proof badges along the bottom). Palette is the client's pastel
 * pink rather than the reference's lilac.
 *
 * The ground behind the card is the WebGL shader backdrop, so what the card
 * sits on is actually moving and pointer-reactive instead of a flat fill.
 */

const BADGES = [
  { icon: Sparkles, label: "Made to order" },
  { icon: HeartHandshake, label: "Small batch" },
  { icon: Flame, label: "Baked daily" },
];

/** Organic blob-cropped product shot that floats and parallaxes. */
function FloatImage({
  src,
  depth,
  className,
  round,
  priority = false,
}: {
  src?: string;
  depth: number;
  className: string;
  round: string;
  priority?: boolean;
}) {
  if (!src) return null;
  return (
    <div data-float data-depth={depth} className={`absolute aspect-square ${className}`}>
      <div
        className={`relative h-full w-full overflow-hidden ${round} shadow-[0_30px_60px_-24px_rgb(46_33_27_/_0.45)]`}
      >
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          priority={priority}
          sizes="(max-width: 1024px) 45vw, 320px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export function HeroCard({ images, className }: { images: string[]; className?: string }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Headline rises line by line. Split by line, not by letter: a
        // per-letter stagger on a serif this large reads as a gimmick.
        gsap.from("[data-line]", {
          yPercent: 115,
          duration: 1,
          ease: "power4.out",
          stagger: 0.09,
        });
        gsap.from("[data-hero-sub], [data-hero-cta], [data-hero-badges]", {
          y: 18,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.35,
        });

        gsap.from("[data-float]", {
          y: 40,
          opacity: 0,
          scale: 0.94,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.2,
        });
        gsap.to("[data-float]", {
          y: (_i, el: HTMLElement) => -110 * Number(el.dataset.depth ?? 0.4),
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 1 },
        });
      });

      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const floats = gsap.utils.toArray<HTMLElement>("[data-float]", root);
        const movers = floats.map((el) => ({
          depth: Number(el.dataset.depth ?? 0.4),
          x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3.out" }),
          r: gsap.quickTo(el, "rotate", { duration: 0.9, ease: "power3.out" }),
        }));
        const onMove = (e: PointerEvent) => {
          const dx = (e.clientX - window.innerWidth / 2) / window.innerWidth;
          movers.forEach(({ depth, x, r }) => {
            x(dx * depth * 70);
            r(dx * depth * 8);
          });
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      });

      return () => mm.revert();
    },
    { scope }
  );

  const pick = (i: number) => images[i % Math.max(images.length, 1)];

  return (
    <section ref={scope} className={className}>
      <div className="relative bg-blush px-3 py-3 sm:px-5 sm:py-5">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <HeroBackdrop className="absolute inset-0 opacity-90" />
        </div>

        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-porcelain shadow-[0_40px_120px_-40px_rgb(46_33_27_/_0.45)] sm:rounded-[40px]">
          <Sprinkles size={130} x="4%" y="74%" depth={0.4} className="hidden lg:block" />

          <div className="grid items-center gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:px-16 lg:py-24">
            <div>
              <h1 className="text-display text-ink">
                <span className="block overflow-hidden pb-[0.06em]">
                  <span data-line className="block">
                    The happiness
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.06em]">
                  <span data-line className="block">
                    inside every
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.06em]">
                  <span data-line className="block text-berry">
                    little crumb
                  </span>
                </span>
              </h1>

              <p data-hero-sub className="mt-7 max-w-md text-base leading-relaxed text-ink-soft">
                Handcrafted cakes and desserts, made fresh to order in Shillong.
              </p>

              <div data-hero-cta className="mt-9 flex flex-wrap items-center gap-6">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 rounded-full bg-berry px-7 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-all hover:gap-3 hover:bg-berry/90"
                >
                  <ShoppingBag size={17} /> Order now
                </Link>
                <Link
                  href="/custom-cake"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-all hover:gap-2.5 hover:text-berry"
                >
                  Custom cakes <ArrowRight size={15} />
                </Link>
              </div>

              <ul data-hero-badges className="mt-14 flex flex-wrap gap-8">
                {BADGES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/12 text-berry">
                      <Icon size={18} />
                    </span>
                    <span className="text-eyebrow text-ink-soft">{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative h-[320px] sm:h-[420px] lg:h-[560px]">
              <FloatImage
                src={pick(0)}
                depth={0.25}
                priority
                className="left-[6%] top-[2%] w-[46%]"
                round="rounded-[42%_58%_46%_54%/54%_44%_56%_46%]"
              />
              <FloatImage
                src={pick(1)}
                depth={0.7}
                className="right-[2%] top-[24%] w-[52%]"
                round="rounded-[56%_44%_58%_42%/46%_58%_42%_54%]"
              />
              <FloatImage
                src={pick(2)}
                depth={0.45}
                className="bottom-[2%] left-[10%] w-[44%]"
                round="rounded-[48%_52%_40%_60%/58%_42%_58%_42%]"
              />

              <Macaron size={62} x="72%" y="4%" depth={0.8} className="hidden sm:block" />
              <Cherry size={34} x="2%" y="46%" depth={0.55} className="hidden sm:block" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
