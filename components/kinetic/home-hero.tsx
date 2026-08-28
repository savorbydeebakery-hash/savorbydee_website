"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KineticText } from "@/components/kinetic/kinetic-text";
import { Cake, ShoppingBag } from "lucide-react";

/**
 * Hero with a cinematic cafe-exterior photo as the backdrop (no fade overlay —
 * image shows clean). A subtle scrim sits only behind the text block so the
 * headline stays readable over the photo. Falls back to a pastel gradient when
 * no photo is provided. SSR-safe (no useReducedMotion branching).
 */
export function HomeHero({ photo }: { photo?: string }) {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      {/* Cinematic backdrop (no fade — clean image) */}
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="Savor by Dee bakery"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Floating decorative accents (SSR-safe, reduced-motion handled in CSS) */}
          <div className="pointer-events-none absolute left-[8%] top-[18%] hidden h-16 w-16 rounded-3xl bg-pink/20 blur-sm md:block animate-float-a" />
          <div className="pointer-events-none absolute right-[10%] top-[30%] hidden h-12 w-12 rounded-full bg-lavender/25 blur-sm md:block animate-float-b" />
          <div className="pointer-events-none absolute bottom-[14%] left-[55%] hidden h-10 w-10 rounded-2xl bg-mint/25 blur-sm lg:block animate-float-c" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-soft via-white to-lavender-soft" />
      )}

      {/* Text block — translucent glass behind only (keeps image clean elsewhere) */}
      <div className="relative mx-auto max-w-4xl rounded-3xl bg-white/35 p-6 backdrop-blur-md sm:p-10 text-center">
        <div>
          <Badge color="pink" className="mb-4">Handcrafted in Shillong</Badge>
        </div>

        <h1 className="font-round8 text-5xl sm:text-8xl text-ink mb-4">
          <KineticText text="Cakes & Desserts" className="block" tag="span" />
          <span className="inline-block overflow-hidden align-bottom">
            <KineticText text="Made Fresh to Order" className="text-pink" tag="span" />
          </span>
        </h1>

        <p className="mx-auto max-w-xl text-lg text-ink-soft mb-8">
          From celebration cakes to everyday treats — every bake is crafted
          with quality ingredients and a whole lot of heart.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/menu">
            <Button size="lg" variant="primary">
              <ShoppingBag size={18} /> Browse Menu
            </Button>
          </Link>
          <Link href="/custom-cake">
            <Button size="lg" variant="outline">
              <Cake size={18} /> Custom Cake Inquiry
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}