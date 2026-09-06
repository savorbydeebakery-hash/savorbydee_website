import { LottieLoader } from "@/components/lottie-loader";
import { FlippingBook } from "@/components/flipping-book";

/**
 * The menu's loading screen. Covers /menu and /menu/[type].
 *
 * The cake animation is kept — that was the instruction — and the book is
 * added under it, so the wait says which page is coming rather than just that
 * something is.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
      <LottieLoader />
      <FlippingBook />
    </div>
  );
}
