/**
 * A book turning its pages, for the menu loading screen.
 *
 * It is the whole loading screen now — the cake animation was removed from the
 * menu route on the client's instruction, so this stands alone and is sized to
 * carry the wait by itself.
 *
 * Each leaf has a front and a back and it is the LEAF that rotates, not a
 * single face. The first version put `backface-visibility: hidden` on the
 * rotating element itself, so a page turned as far as ninety degrees, showed
 * its back to the viewer and disappeared — half a turn, which reads as a
 * flicker rather than a page.
 *
 * Pure CSS, no library and no client hook, so a loading state costs no
 * JavaScript. Keyframes live in globals.css under "Flipping book".
 */
const LEAVES = 3;
const CYCLE_SECONDS = 2.1;

/** Ruled lines, so a page reads as a menu rather than as blank card. */
function Ruled({ lines = 5, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex h-full flex-col justify-center gap-2 px-4 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="block h-[3px] rounded-full bg-ink/12"
          // Ragged right, like a list of dishes rather than a paragraph.
          style={{ width: `${[100, 72, 92, 60, 84][i % 5]}%` }}
        />
      ))}
    </div>
  );
}

export function FlippingBook({ label = "Loading the menu" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-5">
      <div className="[perspective:1100px]">
        <div className="relative h-32 w-52 transform-3d">
          {/* The open spread. The leaves turn over the right half. */}
          <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-lg border border-ink/12 bg-porcelain shadow-[inset_-8px_0_14px_-10px_rgb(46_33_27_/_0.4)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-lg border border-ink/12 bg-porcelain shadow-[inset_8px_0_14px_-10px_rgb(46_33_27_/_0.4)]" />

          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2">
            <Ruled />
          </div>
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2">
            <Ruled />
          </div>

          {/* The spine, drawn over both halves. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-ink/20"
          />

          {Array.from({ length: LEAVES }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="book-leaf absolute inset-y-0 left-1/2 w-1/2"
              style={{ animationDelay: `${(i * CYCLE_SECONDS) / LEAVES}s` }}
            >
              <div className="book-leaf-face rounded-r-lg border border-ink/12 bg-porcelain shadow-[0_6px_18px_-8px_rgb(46_33_27_/_0.45)]">
                <Ruled />
              </div>
              {/* Very slightly darker, the way the far side of a page is. It
                  is also what makes the turn legible: without a difference
                  between the two sides the leaf reads as one flat shape. */}
              <div className="book-leaf-face book-leaf-back rounded-l-lg border border-ink/12 bg-shell shadow-[0_6px_18px_-8px_rgb(46_33_27_/_0.45)]">
                <Ruled />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
