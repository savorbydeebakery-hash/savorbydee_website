"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

export interface Review {
  id: string;
  author_name: string;
  body: string;
  item_name?: string | null;
  /** Null when the customer's own stars are not known, e.g. a quote copied
   *  from a platform screenshot that cut them off. No star row is drawn then,
   *  rather than five stars nobody gave. */
  rating: number | null;
}

/**
 * Reviews, moved through only by the visitor: swipe, or the arrows and dots.
 *
 * One fixed size for every review, set in the stylesheet so it is the same from
 * the first paint, and nothing moves on its own. It used to advance every 5s
 * and take the height of the review on show, so the box grew and shrank and
 * pushed the whole page up and down while someone was reading it (client,
 * 2026-11-04: "the site moves by itself").
 *
 * A long review scrolls inside its own card rather than making the card bigger.
 * data-lenis-prevent is only on the ones that scroll, so wheeling over a short
 * review still scrolls the page.
 */
export function ReviewsCarousel({
  reviews,
  title = "What Customers Say",
  /** Headline rating shown beside the title, e.g. 4.6. */
  rating,
  /** Where the headline rating comes from, e.g. "Google (37) · Swiggy (847)". */
  ratingSource,
}: {
  reviews: Review[];
  title?: string;
  rating?: number;
  ratingSource?: string;
}) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  // Which reviews are too long for the card, so they can say so. The line that
  // says it always has its space, so showing it can't move anything.
  const bodies = useRef<(HTMLDivElement | null)[]>([]);
  const [long, setLong] = useState<boolean[]>([]);

  const count = reviews.length;

  // The track's own scroll, never scrollIntoView, which would move the page too.
  const go = useCallback(
    (next: number) => {
      const el = track.current;
      if (!el || count === 0) return;
      const target = ((next % count) + count) % count;
      const wrapped = Math.abs(target - index) > 1;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: target * el.clientWidth, behavior: wrapped || reduced ? "auto" : "smooth" });
    },
    [count, index]
  );

  // Follows swipes as well as the buttons: the scroll position is the one truth.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const next = bodies.current.slice(0, count).map((b) => (b ? b.scrollHeight > b.clientHeight + 1 : false));
      setLong((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    measure();
    // Rewrapping on rotate or resize changes which ones fit.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);

  if (count === 0) return null;

  // mt-4 on a phone, not mt-8: this sits directly under the hero and the
  // client asked for the two to be closer. Desktop keeps its full rhythm.
  return (
    <section className="mx-auto mt-4 w-full max-w-[var(--bk-page-width)] px-4 md:mt-14 md:px-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 md:mb-5">
        <h2 className="bk-section-title text-bk-fg">{title}</h2>
        {rating != null && (
          <span className="inline-flex items-baseline gap-1 text-sm font-medium text-bk-fg md:text-base">
            {rating.toFixed(1)}
            <Star
              size={14}
              fill="currentColor"
              className="translate-y-px text-bk-pink"
              aria-hidden="true"
            />
            <span className="sr-only">out of 5</span>
          </span>
        )}
        {ratingSource && (
          <span className="text-xs text-bk-muted md:text-sm">{ratingSource}</span>
        )}
      </div>

      <div
        ref={track}
        role="group"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
        // The one size for every review. overflow-x with snap is the browser's
        // own swipe, and needs nothing from the page's code to work. relative
        // keeps the slides' sr-only text in here: it is positioned, so without
        // this it escapes the track and makes the whole page wider than a phone.
        className="relative flex h-[340px] snap-x snap-mandatory overflow-x-auto rounded-[var(--bk-r-block)] border border-bk-border bg-bk-bg-3 [scrollbar-width:none] md:h-[300px] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r, i) => (
          <figure
            key={r.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className="flex h-full w-full shrink-0 snap-center snap-always flex-col px-6 py-5 text-center md:px-16 md:py-6"
          >
            {r.rating != null && (
              <div
                className="mb-2 flex shrink-0 items-center justify-center gap-1 text-bk-pink"
                aria-hidden="true"
              >
                {Array.from({ length: 5 }, (_, s) => (
                  <Star
                    key={s}
                    size={16}
                    fill={s < (r.rating ?? 0) ? "currentColor" : "none"}
                    className={s < (r.rating ?? 0) ? "" : "opacity-30"}
                  />
                ))}
              </div>
            )}

            {/* Takes whatever the card has left. Short reviews sit in the middle
                of it; long ones scroll inside it. overscroll-auto! undoes Lenis's
                contain on data-lenis-prevent, which would stop the page and the
                sideways swipe for anyone whose finger starts on a long review. */}
            <div
              ref={(node) => {
                bodies.current[i] = node;
              }}
              {...(long[i] ? { "data-lenis-prevent": "", tabIndex: 0 } : {})}
              className="min-h-0 flex-1 overflow-y-auto overscroll-auto! focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg"
            >
              <div className="flex min-h-full items-center justify-center">
                <blockquote className="mx-auto max-w-2xl text-base leading-relaxed text-bk-fg md:text-lg">
                  {r.body}
                </blockquote>
              </div>
            </div>

            <figcaption className="mt-2 shrink-0 text-sm">
              <span className="font-semibold text-bk-fg">{r.author_name}</span>
              {r.rating != null && (
                <span className="sr-only">, rated {r.rating} out of 5</span>
              )}
              {r.item_name && (
                <span className="block truncate text-bk-muted">{r.item_name}</span>
              )}
              <span className="block h-4 text-xs leading-4 text-bk-muted" aria-hidden="true">
                {long[i] ? "Scroll to read more" : ""}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <CarouselButton label="Previous review" onClick={() => go(index - 1)}>
            <ChevronLeft size={18} />
          </CarouselButton>

          <ul className="flex flex-wrap items-center justify-center gap-2 px-2">
            {reviews.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show review ${i + 1} of ${count}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`relative h-2 w-2 rounded-full transition-colors after:absolute after:-inset-1 ${
                    i === index ? "bg-bk-fg" : "bg-bk-border hover:bg-bk-muted"
                  }`}
                />
              </li>
            ))}
          </ul>

          <CarouselButton label="Next review" onClick={() => go(index + 1)}>
            <ChevronRight size={18} />
          </CarouselButton>
        </div>
      )}
    </section>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bk-border text-bk-fg transition-colors hover:bg-bk-bg-3"
    >
      {children}
    </button>
  );
}
