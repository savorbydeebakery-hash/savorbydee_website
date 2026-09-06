/**
 * A book turning its pages, for the menu loading screen.
 *
 * The cake animation stays — the client asked to keep the loading screen and
 * add this to it — so the two stack: the cake says "Savor", the book says
 * "a menu is coming". A visitor who lands on /menu on a slow connection sees
 * something about the thing they asked for rather than a generic spinner.
 *
 * Pure CSS, no library and no client hook: it is a server component so a
 * loading state costs no JavaScript. Keyframes live in globals.css under
 * "Flipping book"; the stagger is a third of the cycle so one page is always
 * mid-turn.
 */
const PAGE_COUNT = 3;

export function FlippingBook({ label = "Loading the menu" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4"
    >
      <div className="[perspective:900px]">
        <div className="relative h-24 w-40 transform-3d">
          {/* Both halves of the open spread, and the spine between them. The
              leaves turn over the right half. */}
          <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-md border border-ink/10 bg-porcelain shadow-[inset_-6px_0_12px_-8px_rgb(46_33_27_/_0.35)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-md border border-ink/10 bg-porcelain shadow-[inset_6px_0_12px_-8px_rgb(46_33_27_/_0.35)]" />
          <div aria-hidden="true" className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-ink/15" />

          {/* Ruled lines, so the leaves read as a menu and not as blank card. */}
          <div aria-hidden="true" className="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center gap-2 px-3">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block h-[3px] rounded-full bg-ink/10" />
            ))}
          </div>

          {Array.from({ length: PAGE_COUNT }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="book-page absolute inset-y-0 left-1/2 w-1/2 rounded-r-md border border-ink/10 bg-porcelain"
              style={{ animationDelay: `${(i * 2.4) / PAGE_COUNT}s` }}
            >
              <div className="flex h-full flex-col justify-center gap-2 px-3">
                {[0, 1, 2, 3].map((line) => (
                  <span key={line} className="block h-[3px] rounded-full bg-ink/10" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
