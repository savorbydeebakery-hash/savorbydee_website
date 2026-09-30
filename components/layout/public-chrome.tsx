"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The shop's own frame — header, closed banner, promo strip, footer, WhatsApp
 * bubble, phone bottom bar — which the admin panel does not want.
 *
 * The admin lives under the same root layout, so it was drawn inside all of
 * it: the public header's menu icon sat on top of the sidebar's "SAVOR", the
 * fixed sidebar covered the start of the closed banner, and the footer and
 * chat bubble followed staff through every admin page (found 2026-09-30).
 * The admin layout has its own sidebar and needs none of it.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
