/**
 * How fast the page is moving, in one place.
 *
 * Lenis already computes a smoothed scroll velocity every frame; without
 * somewhere to put it, every component that wants to react to scroll speed
 * ends up attaching its own scroll listener and differentiating by hand, four
 * times, with four different smoothing constants.
 *
 * A plain module singleton rather than context: this is read inside a
 * gsap.ticker callback on most frames, and a context read would re-render
 * React components sixty times a second to deliver a number nothing renders.
 *
 * Units are Lenis's: pixels per frame, signed (positive scrolling down).
 * Zero whenever smooth scrolling is off — which includes reduced motion, so a
 * consumer that multiplies by this value is automatically still for those
 * visitors and needs no separate branch.
 */

let velocity = 0;
let decay = 0;

/** Called by the smooth-scroll driver on every scroll event. */
export function setScrollVelocity(next: number) {
  velocity = next;
  decay = 0;
}

/**
 * The current velocity, decaying toward zero on its own.
 *
 * Lenis stops emitting scroll events the moment the page settles, so the last
 * value it sent would otherwise stay on the books forever and leave whatever
 * reads it permanently skewed. Each read nudges it back toward rest, which
 * makes a consumer's "return to neutral" free.
 */
export function getScrollVelocity() {
  if (velocity === 0) return 0;
  decay += 1;
  if (decay > 4) velocity *= 0.82;
  if (Math.abs(velocity) < 0.01) velocity = 0;
  return velocity;
}
