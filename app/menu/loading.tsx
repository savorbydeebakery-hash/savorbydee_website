import { FlippingBook } from "@/components/flipping-book";

/**
 * The menu's loading screen. Covers /menu and /menu/[type].
 *
 * The cake animation was removed from this route on the client's instruction —
 * every other page still uses it. A book turning its pages says which page is
 * on its way, where the cake only said that something was.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <FlippingBook />
    </div>
  );
}
