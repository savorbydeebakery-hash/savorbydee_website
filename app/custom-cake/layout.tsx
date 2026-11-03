import type { ReactNode } from "react";
import { pageMeta } from "@/lib/site/seo";

// The page itself is a client component, which can't export metadata.
export const metadata = pageMeta({
  title: "Custom Cakes in Shillong",
  description:
    "Design your own cake with Savor by Dee in Shillong. Tell us the flavour, size and theme and we'll send a quote. Custom cakes need up to 5 days' notice.",
  path: "/custom-cake",
});

export default function CustomCakeLayout({ children }: { children: ReactNode }) {
  return children;
}
