"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export interface Review {
  id: string;
  author_name: string;
  body: string;
  item_name?: string | null;
  rating: number;
}

const INTERVAL_MS = 5000;

/**
 * Review carousel. One review per slide, advancing every 5s and looping.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide) applies here: this moves on its own, starts
 * automatically and runs longer than 5s, so it needs a real pause control.
 * Pause-on-hover alone does not satisfy it — it does nothing for keyboard or
 * touch users — so there is an explicit toggle. Hover and keyboard focus also
 * pause, but as a convenience on top of the control, not instead of it.
 *
 * Rotation additionally stops when:
 *   - the visitor prefers reduced motion (it never starts)
 *   - the tab is hidden, so a backgrounded page is not burning timers
 *
 * The timer is keyed on `index`, so any manual navigation restarts the full
 * 5s dwell rather than advancing early on a timer that was already half spent.
 */
export function ReviewsCarousel({
  reviews,
  title = "What Customers Say",
  /** Headline rating shown beside the title, e.g. 4.6. */
  rating,
}: {
  reviews: Review[];
  title?: string;
  rating?: number;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const reduced = useRef(false);

  const count = reviews.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || held || count < 2 || reduced.current) return;

    const tick = () => setIndex((i) => (i + 1) % count);
    let id = window.setInterval(tick, INTERVAL_MS);

    // A backgrounded tab should not keep rotating; restart cleanly on return
    // so the visitor gets a full dwell on whatever slide they come back to.
    const onVisibility = () => {
      window.clearInterval(id);
      if (!document.hidden) id = window.setInterval(tick, INTERVAL_MS);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing, held, count, index]);

  if (count === 0) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-[var(--bk-page-width)] px-4 md:mt-14 md:px-6">
      <div className="mb-3 flex items-baseline gap-2.5 md:mb-5">
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
      </div>

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
        className="relative overflow-hidden rounded-[var(--bk-r-block)] border border-bk-border bg-bk-bg-3"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={() => setHeld(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {reviews.map((r, i) => (
            <figure
              key={r.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              // Slides that are off-screen stay in the DOM for the slide
              // transition, so they are hidden from assistive tech explicitly
              // rather than being read as one long run-on quotation.
              aria-hidden={i !== index}
              className="w-full shrink-0 px-6 py-10 text-center md:px-16 md:py-14"
            >
              <div
                className="mb-4 flex items-center justify-center gap-1 text-bk-pink"
                aria-hidden="true"
              >
                {Array.from({ length: 5 }, (_, s) => (
                  <Star
                    key={s}
                    size={18}
                    fill={s < r.rating ? "currentColor" : "none"}
                    className={s < r.rating ? "" : "opacity-30"}
                  />
                ))}
              </div>

              <blockquote className="mx-auto max-w-2xl text-lg leading-relaxed text-bk-fg md:text-xl">
                {r.body}
              </blockquote>

              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-bk-fg">{r.author_name}</span>
                <span className="sr-only">, rated {r.rating} out of 5</span>
                {r.item_name && (
                  <span className="block text-bk-muted">{r.item_name}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <CarouselButton label="Previous review" onClick={() => go(index - 1)}>
            <ChevronLeft size={18} />
          </CarouselButton>

          <ul className="flex items-center gap-2 px-2">
            {reviews.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show review ${i + 1} of ${count}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-bk-fg" : "w-2 bg-bk-border hover:bg-bk-muted"
                  }`}
                />
              </li>
            ))}
          </ul>

          <CarouselButton label="Next review" onClick={() => go(index + 1)}>
            <ChevronRight size={18} />
          </CarouselButton>

          <CarouselButton
            label={playing ? "Pause the review carousel" : "Play the review carousel"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-bk-border text-bk-fg transition-colors hover:border-bk-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
