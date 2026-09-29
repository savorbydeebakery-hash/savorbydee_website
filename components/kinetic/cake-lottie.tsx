"use client";

import { useEffect, useMemo, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * The cake animation, downloaded once per visit and shared by every loader.
 *
 * WHY NOT `src="/Cake.lottie"`
 * With `src`, each DotLottie fetches the file itself and aborts that fetch
 * when it unmounts. Route loading screens unmount the moment the page is
 * ready — often before a 27 KB file has arrived — and the library reports its
 * own abort as "Failed to load animation data from URL: /Cake.lottie.
 * AbortError" through console.error. Nothing was broken, but it lit up the
 * Next.js error overlay on every fast navigation and put a false error in the
 * console of every visitor with a quick connection.
 *
 * Here the fetch belongs to this module, not to any one loader, so a loader
 * that disappears early has nothing to cancel; the next one gets the finished
 * data immediately instead of downloading it again.
 */

let cakePromise: Promise<ArrayBuffer> | null = null;
let cakeBuffer: ArrayBuffer | null = null;

function loadCake(): Promise<ArrayBuffer> {
  cakePromise ??= fetch("/Cake.lottie")
    .then((res) => {
      if (!res.ok) throw new Error(`Cake.lottie: HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buffer) => (cakeBuffer = buffer))
    .catch((error: unknown) => {
      // Let a later loader try again rather than caching the failure.
      cakePromise = null;
      throw error;
    });
  return cakePromise;
}

// Start downloading as soon as this code runs in the browser — before React
// has even hydrated — rather than waiting for a loader's effect. The splash
// is only on screen for ~2s, so every hundred milliseconds here shows.
if (typeof window !== "undefined") {
  void loadCake().catch(() => {});
}

export function CakeLottie({ className }: { className?: string }) {
  const [data, setData] = useState<ArrayBuffer | null>(cakeBuffer);

  useEffect(() => {
    if (data) return;
    let live = true;
    loadCake()
      .then((buffer) => live && setData(buffer))
      .catch(() => {
        // The loader is decoration around a page that is loading anyway; an
        // empty box of the same size is the right fallback, not an error.
      });
    return () => {
      live = false;
    };
  }, [data]);

  // A copy per mount: the player may hand its buffer to WebAssembly memory,
  // and the shared one has to stay intact for the next loader.
  const copy = useMemo(() => (data ? data.slice(0) : null), [data]);

  // Mounted straight away, with no `src`: the player starts loading its
  // WebAssembly engine now, in parallel with the file, and has no fetch of its
  // own to abort. When `data` arrives, DotLottieReact's own effect calls
  // load() with it. Rendering a placeholder until then would have made the
  // engine wait for the file, and the cake appear later than it used to.
  return <DotLottieReact data={copy ?? undefined} loop autoplay className={className} />;
}
