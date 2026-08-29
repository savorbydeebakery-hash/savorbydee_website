# SAVOR — Visual Redesign & Motion Implementation Plan

**Author:** Claude Opus 5 · **Executor:** Claude Sonnet 5 · **Date:** 2026-08-29
**Branch to create:** `redesign/liquid-glass`

---

## STATUS — complete (2026-08-29)

Branch `redesign/liquid-glass`, 26 commits. `master` is untouched at `ea88237`
and remains the rollback point.

All nine phases done, plus the work that came after: WebGL hero backdrop and
glass torus, scroll-scrubbed video sections, travelling macaron, card-on-field
hero, CI pipeline.

**Gates:** tsc 0 · eslint 0 errors / 1 warning (baseline 9) · vitest 56/56
(baseline 48) · OpenNext build OK · **Playwright 14/14**

### Done since the original plan

| | |
|---|---|
| Images | 1.27MB uncached -> 42KB WebP with `max-age=31536000`. 129 objects re-stamped. |
| Menu images | 0/76 -> 57/76. 19 savouries left text-only on purpose. |
| Motion | 3 scroll-scrubbed video sections, travelling macaron, 3D grid rises, card tilt, velocity-skewed marquee, scroll progress |
| Hero | rebuilt to the client reference: light card on a live shader field |
| CI | `.github/workflows/deploy.yml`, check -> deploy -> verify |

### Blocked on the user, not on code

1. **Git push is rejected.** `jeremygideonbareh` is not a collaborator on
   `savorbydeebakery-hash/savorbydee_website` (403). 26 commits waiting.
   Fix: add the account as a collaborator, or `gh auth login` as the owner.
2. **Cloudflare deploy needs auth.** `wrangler whoami` reports not
   authenticated and no `CLOUDFLARE_API_TOKEN` exists. `wrangler login` is an
   interactive browser flow.
3. **Rotate the Supabase service-role key.** It sat in plaintext in
   `scripts/upload-gallery-images.ts`. Removing it did not invalidate it.
4. **CI secrets** need setting once, listed in `.github/workflows/README.md`.

### Deferred, with reasons

- **ISR** stays `force-dynamic`. Re-enabling needs real Cloudflare Queues; with
  `memoryQueue` the worker hangs and the page renders a permanent skeleton.
- **`next dev` does not hydrate** in this workspace. Turbopack 403s on
  `/_next/static/chunks/*`; `--webpack` fixes those but an HMR websocket
  handshake failure remains. Use `wrangler dev` for visual checks.
- **General Sans** needs the woff2 in `public/fonts/`; Plus Jakarta Sans ships.
- **Mobile 9:16 clips** not generated. Video sections are desktop-only.
- **Fraunces** is on the anti-slop skill's banned list but was the client's
  pick, so it stays.
- **One unused clip** (`_unused/`, the fantasy-village one) cannot be salvaged.

## 0. Read This First (Executor Briefing)

You are redesigning an existing, **working** Next.js 16 bakery site. The backend, cart
math, checkout, RBAC, payments, realtime alarm, and E2E suite all work and are **not**
in scope. This is a visual + motion + performance job.

### 0.1 Hard guardrails — do not break these

| Rule | Why |
|---|---|
| **Do not touch** `lib/cart/**`, `lib/supabase/**`, `lib/email/**`, `lib/alarm/**`, `lib/realtime/**`, `app/api/**`, `middleware.ts`, `supabase/migrations/00001`–`00010` | Business logic. Verified working. Out of scope. |
| **Preserve every `data-*` attribute** on menu cards and buttons (`data-item-id`, `data-item-name`, `data-item-price`, `data-category`, `data-category-section`) | The 9 Playwright specs in `e2e/` select on these. Breaking them breaks CI. |
| **Preserve accessible names**: `aria-label="Increase quantity"` / `"Decrease quantity"`, `role="dialog"` + `aria-modal`, button text `"Add to Cart"` / `"Unavailable"`, the `"Flavour Preference"` spelling | Same reason. E2E selectors. |
| **Read `node_modules/next/dist/docs/` before writing Next.js APIs** | Per `AGENTS.md` — this Next.js version has breaking changes vs. training data. |
| **Never hardcode secrets.** Read from `process.env`. | See §0.3 below — there is already a leaked key in the tree. |
| **Every animation must respect `prefers-reduced-motion`** | Already a site-wide invariant (`app/globals.css:75`). Keep it. |
| **No hydration mismatches.** Server and first client render must produce identical HTML. | This codebase has already fought and fixed hydration bugs — see the comments in `components/kinetic/reveal.tsx` and `lib/cart/store.ts:154`. Any scroll/3D component either renders nothing on the server or is `dynamic(..., { ssr: false })`. |

### 0.2 Verification gate — run after EVERY phase

```bash
npx tsc --noEmit && npx eslint . && npx vitest run
```

All three must be clean before you move to the next phase. At the end of Phase 1 and
Phase 8 also run the full build:

```bash
npx opennextjs-cloudflare build
```

> **Windows note:** kill any lock-holding processes before rebuilding:
> `Get-Process | Where { $_.ProcessName -match "wrangler|workerd" } | Stop-Process -Force`

### 0.3 ⚠️ Security issue to fix in Phase 0

`scripts/upload-gallery-images.ts` line 6 contains a **hardcoded Supabase service-role
key**. The file is currently untracked (`??` in git status), so it is not in git history
— but the working tree has many untracked files and a careless `git add -A` would commit
it. Fix it in Phase 0 before doing anything else.

### 0.4 Helper skills available

Invoke these with the `Skill` tool when you reach the matching phase. They are already
installed:

| Skill | Use during |
|---|---|
| `gsap-framer-scroll-animation` | Phase 3, 4, 5 — ScrollTrigger patterns, pinning, scrub, Lenis integration |
| `design-taste-frontend` | Phase 2, 6, 7 — anti-generic layout and type decisions |
| `impeccable` | Phase 8 — final polish, hierarchy and a11y audit |
| `redesign-existing-projects` | Phase 6 — auditing what to keep vs. replace |

---

## 1. Diagnosis — why the site currently feels bland

I read every page and component. The blandness is not vague; it has four specific causes.

**1. The palette has no anchor.** `app/globals.css:11-37` defines twelve colours and
eleven of them are cream, almond, or blush at 90%+ lightness. `--ink: #3B3630` is the
only dark value and it is used *only for text*, never as a surface. Every section is
therefore cream-on-cream. There is no visual rhythm, no punctuation, nothing for the eye
to land on. **This is the single biggest problem.**

**2. Every section is structurally identical.** `app/page.tsx` renders eight sections and
seven of them are `mx-auto max-w-6xl px-4 py-8/12` with a 2xl-heading + grid-of-cards.
Same container, same width, same padding, same rhythm. The page reads as one long
undifferentiated column.

**3. The type has no scale contrast.** Section headings are `text-2xl font-semibold`
(24px) sitting next to `text-sm` body (14px). That is a ~1.7× ratio — far too flat to
create hierarchy. The inspiration images use 5–8× ratios between display and body.

**4. Motion is decorative, not structural.** `Reveal` does one fade-and-rise on entry and
then nothing. There is no parallax, no scroll-linked transformation, no depth. The page
is static once it has faded in.

### 1.1 Diagnosis — why images are slow

I measured this against the live Supabase project. Four compounding causes:

| # | Cause | Evidence | Impact |
|---|---|---|---|
| 1 | **`Cache-Control: no-cache` on every stored object** | `curl -I` on four storage URLs — all return `no-cache` | **Critical.** Zero browser caching, zero Cloudflare CDN caching. Every image is re-fetched from Tokyo on *every page load, every visit*. |
| 2 | **`KineticImage` renders each image twice** | `components/kinetic/kinetic-image.tsx:45` and `:62` — two `<img>` with identical `src` | 2× DOM nodes and 2× decodes for every image on the site |
| 3 | **Unbounded gallery query feeding a 3× marquee** | `app/page.tsx:43-48` has no `.limit()`; `components/gallery-marquee.tsx:26` triples the array; each slot is a double-rendering `KineticImage` | With ~100 gallery rows: **~600 `<img>` elements on the homepage** |
| 4 | **Raw `<img>`, no `next/image`** | Everywhere. `next.config.ts` is empty. | No responsive `srcset`, no WebP, no width/height (CLS). A 1200px JPEG is served into a 288px marquee slot. |

**The good news:** I verified that **Supabase image transformations are enabled** on this
project. The `/storage/v1/render/image/public/...` endpoint returns `200` and does
automatic WebP content negotiation:

```
gallery/savor-cake.jpg                       62,302 B  (original JPEG)
  ?width=400&quality=70                      39,659 B  (JPEG,  -36%)
  ?width=400&quality=60  + Accept: webp      23,820 B  (WebP,  -62%)
```

So the fix is a `next/image` custom loader pointed at that endpoint, plus a one-off
re-stamp of the stored `Cache-Control` metadata. Both are covered in Phase 1.

---

## 2. Design Direction

Derived from the three inspiration images, reconciled with the existing brand.

### 2.1 The core move: introduce a dark anchor

Inspiration image 1 works because a **cream card floats on a deep mocha field**. That
contrast is what makes it feel expensive. The current site has the cream but no mocha.

Add `--cocoa` and use it as a *surface*, not just as text: hero vignette, primary
buttons, the "Best Bakery" band, the footer, and the custom-cake CTA. Roughly **one dark
band every two light sections**.

### 2.2 Palette (extends the existing tokens — do not delete the old ones)

```
NEW ANCHORS
--cocoa            #2E211B   deep brown — dark section surfaces, primary buttons, footer
--cocoa-soft       #4A3830   raised elements on cocoa
--berry            #C2566B   saturated accent — prices, active chips, badges  (4.6:1 on cream ✓)

NEW SURFACES
--shell            #F2E8DC   raised surface — alternating section background
--porcelain        #FFFDFA   card surface, slightly warmer than pure white

KEEP AS-IS (already good)
--background #FAF6F1  --ink #3B3630  --ink-soft #6E655C  --ink-faint #A89F94
--pastel-pink #F6C7CF (→ alias --blush)  --gold-deep #A9926F  --pastel-peach #F7D8CC
```

**Contrast rules (WCAG AA, non-negotiable):**
- Body text on cream/shell → `--ink` (10.2:1 ✓)
- Body text on cocoa → `#F2E8DC` (12.1:1 ✓) — **never `--ink-soft` on cocoa**
- `--berry` is for ≥18px text, badges, and UI accents only — never for body copy
- `--gold-deep` on cream is 3.4:1 → **large text only**. Prices move from `--gold-deep` to `--berry`.

### 2.3 Section rhythm (this fixes problem #2)

Alternate the background so the page has a pulse. Assign in Phase 6:

```
Hero              cocoa gradient + imagery      DARK
Tiles             cream                          light
Chef's Choice     shell                          light-raised
Most Ordered      cream                          light
Today's Menu      shell                          light-raised
Gallery marquee   cocoa                          DARK   ← glass shines here
Best Bakery       cream                          light
Custom Cake CTA   cocoa + glass panel            DARK
How It Works      shell                          light-raised
Footer            cocoa                          DARK
```

### 2.4 Typography

**Display — Fraunces** (Google, variable). Soft high-contrast serif with `opsz`, `SOFT`,
and `WONK` axes. Warm rather than cold; exactly the register of inspiration images 1 & 3.

**Body/UI — General Sans** (Fontshare) *if the files are present*, otherwise **Plus Jakarta
Sans** (Google). See P2.1 for the decision procedure — do not skip it.

**Scale (this fixes problem #3).** Use `clamp()` throughout; note the jump from `display`
to `body` is now ~5×, not 1.7×:

| Token | Size | Font | Use |
|---|---|---|---|
| `display` | `clamp(3rem, 9vw, 7.5rem)` | Fraunces 700, `opsz:144`, tracking `-0.03em`, leading `0.92` | Hero H1 only |
| `h1` | `clamp(2.5rem, 5vw, 4rem)` | Fraunces 600, `opsz:72` | Page titles |
| `h2` | `clamp(2rem, 3.5vw, 3rem)` | Fraunces 600, `opsz:48` | Section headings |
| `h3` | `1.25rem` | Sans 600 | Card titles |
| `body` | `1rem` / `leading-relaxed` | Sans 400 | Paragraphs |
| `eyebrow` | `0.75rem`, `tracking-[0.18em]`, uppercase | Sans 600 | Section kickers |

**Retire `.font-round8` / Baloo 2 and `public/fonts/Round8.otf`.** Baloo's rounded
playfulness is the "bland/childish" feeling the user is reacting to.

### 2.5 Liquid glass — the specification

Glass only reads as glass when there is something **behind** it to refract. Over flat
cream it turns into grey mud.

> **Placement rule — enforce this.** Glass elements are permitted ONLY over: (a) imagery,
> (b) the cocoa dark bands, (c) the hero gradient mesh. **Never over flat cream or shell.**

Three tiers, defined once in `globals.css`:

**`.glass` — standard panel** (nav pill, stat cards, price chips)
```css
background: color-mix(in oklab, var(--porcelain) 12%, transparent);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid color-mix(in oklab, white 22%, transparent);
box-shadow:
  0 8px 32px -8px rgb(46 33 27 / 0.28),          /* ambient drop  */
  inset 0 1px 0 0 rgb(255 255 255 / 0.35),        /* top specular  */
  inset 0 -1px 0 0 rgb(255 255 255 / 0.08);       /* bottom bounce */
border-radius: 20px;
```

**`.glass-liquid` — adds true refraction.** `.glass` plus an SVG displacement filter. This
is the "liquid" part and what separates it from ordinary frosted glass. Define the filter
once in a hidden SVG mounted in `app/layout.tsx`:

```html
<svg aria-hidden="true" style="position:absolute;width:0;height:0">
  <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008"
                  numOctaves="2" seed="7" result="noise" />
    <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
    <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="14"
                       xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```
Apply as `filter: url(#liquid-glass)` on a `::before` pseudo-element that carries the
backdrop — **never on the element containing text**, or the text will warp and become
unreadable.

**`.glass-sheen` — moving specular highlight.** A `::after` carrying a 110°
`transparent → rgba(255,255,255,.5) → transparent` linear gradient at 200% width,
translated on hover (250ms) or bound to scroll progress. This is what makes it feel alive.

**Fallback (required):**
```css
@supports not (backdrop-filter: blur(1px)) {
  .glass, .glass-liquid { background: color-mix(in oklab, var(--porcelain) 82%, transparent); }
}
```

**Mobile performance rule:** `backdrop-filter` is expensive. Below `768px`, cap blur at
`12px` and drop `.glass-liquid` to plain `.glass` (the displacement filter is the costly
part). Never stack more than **3** backdrop-filtered elements in one viewport.

### 2.6 Shape & elevation

- Radii: `--r-sm: 12px`, `--r-md: 20px`, `--r-lg: 28px`, `--r-xl: 40px` (large image tiles)
- Shadows are **warm**, never neutral grey: `rgb(46 33 27 / α)`
- Card hover: `translateY(-4px)` + shadow bloom, `250ms cubic-bezier(0.22, 1, 0.36, 1)`
- Standard easing everywhere: `cubic-bezier(0.22, 1, 0.36, 1)` (already the codebase's ease — keep it)

---

## 3. Phases

Ordered deliberately. **Phase 1 comes first** because every later phase adds weight, and
you need the performance floor fixed before you pile motion and WebGL on top of it.

| Phase | Title | Est. files | Gate |
|---|---|---|---|
| 0 | Safety & baseline | 3 | build passes |
| 1 | Image pipeline & performance | 8 | Lighthouse + payload check |
| 2 | Design system foundation | 4 | visual smoke test |
| 3 | Motion infrastructure | 4 | reduced-motion verified |
| 4 | 3D prop system | 6 | 60fps scroll on mid-tier |
| 5 | Hero upgrade | 3 | LCP < 2.5s |
| 6 | Section redesign | 9 | full visual pass |
| 7 | Menu page | 3 | E2E green |
| 8 | Polish & verification | — | all gates |

---

## PHASE 0 — Safety & Baseline  ✅ COMPLETE (2026-08-29, Opus)

> **Sonnet: Phase 0 is already done. Start at Phase 1.**
>
> What was done, in this order (the key had to be stripped *before* the commit,
> otherwise the checkpoint would have written the secret into git history permanently):
>
> 1. Stripped the hardcoded service-role key from `scripts/upload-gallery-images.ts`
>    → now reads `process.env`. Re-scanned all tracked + untracked files: clean.
> 2. Checkpointed 60 uncommitted files to `master` as `ea88237` — this is your
>    **rollback point**. `git checkout master` restores the pre-redesign state.
> 3. Branched `redesign/liquid-glass`.
> 4. Installed: `gsap@3.15` `@gsap/react@2.1` `lenis@1.3` `three@0.185`
>    `@react-three/fiber@9.7` `@react-three/drei@10.7` `@types/three` `tsx@4.23`.
>    R3F 9.7 peer-requires `react >=19 <19.3`; project has 19.2.8 ✓
> 5. Recorded baseline (commit `f53802e`):
>
> | Gate | Baseline |
> |---|---|
> | `tsc --noEmit` | 0 errors |
> | `eslint .` | 0 errors, **9 warnings** |
> | `vitest run` | **48/48** passing |
> | `opennextjs-cloudflare build` | OK — server handler **5.11 MB**, assets **2.2 MB** |
>
> Compare against these numbers at every later gate. The 9 lint warnings are:
> 7 × `no-img-element` in `modern-hero-section.tsx` (Phase 1/5 removes these),
> 1 unused `y` prop in `reveal.tsx` (Phase 3 rewrites this file), and
> 1 anonymous-default-export in `open-next.config.ts` (pre-existing, leave alone).
> **Warnings should go down, never up.**
>
> ⚠️ **Still outstanding — user action:** the exposed service-role key must be
> **rotated in the Supabase dashboard**. It sat in plaintext on disk. Removing it
> from the file does not invalidate it.

<details>
<summary>Original Phase 0 instructions (for reference)</summary>

**P0.1 — Branch.**
```bash
git checkout -b redesign/liquid-glass
```

**P0.2 — Purge the leaked service-role key.**
In `scripts/upload-gallery-images.ts`, replace lines 5–8 with:
```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .dev.vars");
}
```
Also replace the hardcoded `FOLDER` constant with `process.argv[2] ?? process.env.GALLERY_FOLDER`.
Then tell the user, in your final message, that **this key should be rotated in the
Supabase dashboard** — it existed in plaintext on disk.

**P0.3 — Install dependencies.**
```bash
npm i gsap @gsap/react lenis three @react-three/fiber @react-three/drei
npm i -D @types/three
```
- `gsap@3.15` is under the Standard "no charge" licence — ScrollTrigger and all former
  Club plugins are free. Verified.
- `@react-three/fiber@9` peer-requires `react >=19 <19.3`; this project has `19.2.8`. ✓

**P0.4 — Baseline build.** Run the §0.2 gate plus `npx opennextjs-cloudflare build`.
Record the current bundle size so you can compare at the end.

</details>

---

## PHASE 1 — Image Pipeline & Performance

> This phase alone should cut homepage image payload by roughly 75%. Do it completely
> before touching any visual work.

### P1.1 — Supabase image loader

Create `lib/images/supabase-loader.ts`:

```ts
/**
 * next/image custom loader → Supabase Storage render endpoint.
 *
 * Rewrites  /storage/v1/object/public/<bucket>/<path>
 * to        /storage/v1/render/image/public/<bucket>/<path>?width=&quality=
 *
 * The render endpoint does automatic WebP/AVIF content negotiation from the
 * browser's Accept header, so we do not request a format explicitly.
 *
 * Any non-Supabase src (local /public assets, Unsplash seeds from migration
 * 00011) is returned untouched — with `loader: "custom"` this function receives
 * EVERY next/image src, so the passthrough is mandatory.
 */
export default function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.includes("/storage/v1/object/public/")) return src;

  const rendered = src.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality ?? 72),
    resize: "cover",
  });
  return `${rendered}?${params}`;
}
```

### P1.2 — `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./lib/images/supabase-loader.ts",
    // Site max content width is max-w-6xl (1152px); 2x DPR ceiling is ~2304.
    // Trimming these shrinks every srcset we emit.
    deviceSizes: [384, 640, 828, 1080, 1200, 1920, 2304],
    imageSizes: [96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
```

> Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/images.md`
> to confirm these key names before you write the file.

### P1.3 — Replace `KineticImage` with `SmartImage`

This kills the double render (cause #2) and adds `next/image`.

Create `components/kinetic/smart-image.tsx`. **Keep the exact same prop signature** as
`KineticImage` so the ~8 call sites need only an import + name change:

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { Cake } from "lucide-react";

export function SmartImage({
  src, alt, className = "", aspect = "aspect-[4/3]",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px",
  priority = false,
}: {
  src?: string | null; alt: string; className?: string;
  aspect?: string; sizes?: string; priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div className={`${aspect} overflow-hidden rounded-[--r-md] bg-shell ${className}`}>
        <div className="flex h-full w-full items-center justify-center text-ink-faint">
          <Cake size={28} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${aspect} relative overflow-hidden rounded-[--r-md] bg-shell ${className}`}>
      {!loaded && <div className="skeleton absolute inset-0 z-10" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onLoad={() => setLoaded(true)}
        className="object-cover transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "scale(1)" : "scale(1.04)",
          filter: loaded ? "grayscale(0)" : "grayscale(1)",
        }}
      />
    </div>
  );
}
```

Note what changed: **one** `<img>`, not two. The reveal effect is preserved but expressed
as a CSS transition on the single element instead of a second stacked copy.

**Migrate all call sites**, then delete `components/kinetic/kinetic-image.tsx`:
- `components/home/curation-row.tsx:58`
- `components/home/home-tiles.tsx:45`
- `components/home/best-bakery-section.tsx:45`
- `components/daily-menu.tsx:51`
- `components/menu-client.tsx:154`
- `components/gallery-marquee.tsx:49`
- `app/page.tsx:180`
- plus any in `app/gallery/page.tsx` and `app/about/page.tsx`

Pass a correct `sizes` at each site — the marquee slot is 288px wide, so
`sizes="288px"` there; the hero background is `sizes="100vw"`.

### P1.4 — Cache-Control re-stamp script  ⭐ highest-impact single fix

Supabase has no metadata-only update API, so objects must be re-uploaded with new
`cacheControl`. Create `scripts/fix-image-cache.ts`:

```ts
/**
 * One-off: re-stamp every Storage object with a 1-year Cache-Control.
 *
 * Supabase defaults uploads to `cacheControl: no-cache`, which disables BOTH
 * browser caching and Cloudflare CDN caching — every image is re-fetched from
 * the Tokyo origin on every page load. There is no metadata-only PATCH, so we
 * download each object and re-upload it with the correct header.
 *
 * Idempotent. Safe to re-run. Run with:
 *   npx tsx scripts/fix-image-cache.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars");

const supabase = createClient(url, key);
const BUCKETS = ["gallery", "menu-items", "promo-banners", "site-assets"];
const ONE_YEAR = "31536000";

async function walk(bucket: string, prefix = ""): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });
  if (error) { console.error(`  list ${bucket}/${prefix}:`, error.message); return []; }

  const files: string[] = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Supabase returns folders as rows with a null id.
    if (entry.id === null) files.push(...(await walk(bucket, path)));
    else files.push(path);
  }
  return files;
}

async function main() {
  for (const bucket of BUCKETS) {
    const paths = await walk(bucket);
    console.log(`\n${bucket}: ${paths.length} objects`);

    for (const path of paths) {
      const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
      if (dlErr || !blob) { console.error(`  ✗ ${path}: ${dlErr?.message}`); continue; }

      const { error: upErr } = await supabase.storage.from(bucket).upload(
        path,
        await blob.arrayBuffer(),
        { cacheControl: ONE_YEAR, upsert: true, contentType: blob.type || "image/jpeg" }
      );
      console.log(upErr ? `  ✗ ${path}: ${upErr.message}` : `  ✓ ${path}`);
    }
  }
}

main().catch(console.error);
```

Add to `package.json` scripts: `"fix:image-cache": "tsx scripts/fix-image-cache.ts"`.
Install `tsx` as a dev dependency if it is not already present.

**Verify after running:**
```bash
curl -sI "https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake.jpg" | grep -i cache-control
# expect: cache-control: max-age=31536000
```
Re-run twice and confirm `cf-cache-status` becomes `HIT`.

> If the user has not set `SUPABASE_SERVICE_ROLE_KEY` locally, do not attempt to run this.
> Write the script, note it in your summary, and let them run it.

### P1.5 — Bound the queries (cause #3)

In `app/page.tsx`:
- Gallery query (line ~43): add `.limit(24)`.
- The `menuItems` query (line ~49) fetches every item just to harvest `image_url` for the
  hero collage. Add `.not("image_url", "is", null).limit(12)`.
- Change `export const dynamic = "force-dynamic"` → `export const revalidate = 60`.
  The KV incremental cache (`NEXT_INC_CACHE_KV`) is already configured in
  `wrangler.jsonc`, so ISR will work. 60s is fresh enough for the sold-out toggle, which
  is re-validated server-side at checkout anyway.

In `components/gallery-marquee.tsx`: cap the source to 12 photos before tripling
(`photos.slice(0, 12)`), so the DOM holds 36 slots and not 300.

Apply `export const revalidate = 60` to `app/menu/page.tsx` too, replacing its
`force-dynamic`.

### P1.6 — LCP priority

The hero's largest image is the LCP element. Give the hero background and the central
collage image `priority` (which sets `fetchpriority="high"` and skips lazy loading).
Everything below the fold stays lazy.

### Phase 1 acceptance criteria

- [ ] Homepage DOM contains **< 60** `<img>` elements (was ~600)
- [ ] Every image request URL contains `/render/image/` and a `width=` param
- [ ] DevTools → Network, filter Img, disable cache off: second load shows `(disk cache)`
- [ ] `curl -I` on a storage object returns `max-age=31536000`
- [ ] Response `Content-Type: image/webp` in a WebP-capable browser
- [ ] No CLS from images (every one has `fill` inside an aspect-ratio box)
- [ ] §0.2 gate clean + `opennextjs-cloudflare build` succeeds

---

## PHASE 2 — Design System Foundation

### P2.1 — Fonts

**Decision procedure — follow exactly:**

1. Check whether `public/fonts/` contains a General Sans variable file
   (`GeneralSans-Variable.woff2` or similar).
2. **If present** → load it with `next/font/local`.
3. **If absent** (expected) → use `Plus_Jakarta_Sans` from `next/font/google`. It is the
   closest widely-available match to General Sans: geometric-humanist, slightly rounded
   terminals, excellent at UI sizes. Leave a comment marking the swap point.

Rewrite the font block in `app/layout.tsx`:

```tsx
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

// Display — soft high-contrast serif. opsz/SOFT/WONK are Fraunces' extra
// variable axes; `wght` is always included and must not be listed here.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

// Body/UI. SWAP POINT: to use General Sans instead, drop the woff2 into
// public/fonts/ and replace this with next/font/local.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
```

Update the `<html>` className to `${fraunces.variable} ${jakarta.variable}`. **Remove**
the `Geist`, `Geist_Mono`, and `Baloo_2` imports and their variables.

Then:
- Delete the `.font-round8` rule from `globals.css` (lines 3–9)
- Delete `public/fonts/Round8.otf`
- `grep -rn "font-round8\|font-baloo\|geist" app components` and fix every hit

> Confirm the `axes` option against
> `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` §`axes`
> before writing.

### P2.2 — Token layer in `globals.css`

Add the new colours to `:root` and register them in the `@theme inline` block so Tailwind
generates `bg-cocoa`, `text-berry`, `bg-shell`, etc. Follow the existing file's pattern
exactly — every `--color-*` in `@theme inline` points at a `:root` variable.

Add radius tokens, warm shadow tokens, and the three type-scale utilities
(`.text-display`, `.text-h1`, `.text-h2`) using the `clamp()` values from §2.4.

### P2.3 — Glass primitives

Append the `.glass`, `.glass-liquid`, `.glass-sheen` rules from §2.5 to `globals.css`,
including the `@supports` fallback and the `max-width: 767px` blur reduction.

Mount the hidden SVG filter in `app/layout.tsx`, immediately inside `<body>`, before
`<SplashLoader />`.

### P2.4 — Primitive components

- **`components/ui/button.tsx`** — add a `cocoa` variant (`bg-cocoa text-shell`, the new
  primary CTA) and a `glass` variant. Retune `primary` to use `--berry`. **Keep the
  existing variant names and the whole prop signature** — buttons are everywhere.
- **`components/ui/card.tsx`** — add `variant?: "solid" | "glass" | "raised"`, default
  `"solid"` so existing call sites are unaffected. Bump radius to `--r-lg`, warm the
  hover shadow.
- **`components/ui/badge.tsx`** — recolour against the new palette; keep all existing
  `color` prop values working.

---

## PHASE 3 — Motion Infrastructure

> Invoke the `gsap-framer-scroll-animation` skill before starting this phase.

### P3.1 — GSAP provider

Create `components/motion/gsap-provider.tsx` — a client component that registers
ScrollTrigger once and exposes nothing:

```tsx
"use client";
import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function GsapProvider({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Route changes in the App Router can leave stale trigger positions.
    ScrollTrigger.refresh();
  }, []);
  return <>{children}</>;
}
```

Use `useGSAP` from `@gsap/react` in every consuming component — it handles
`gsap.context()` scoping and cleanup automatically, which matters because React 19 Strict
Mode double-invokes effects and will otherwise create duplicate ScrollTriggers.

### P3.2 — Reimplement `Reveal` on ScrollTrigger

**Critical: keep `Reveal`, `RevealGroup`, `RevealItem` exported from
`components/kinetic/reveal.tsx` with identical props.** There are 12+ call sites; changing
the internals means every section upgrades for free with a one-file diff.

Replace the IntersectionObserver internals with ScrollTrigger:
- `Reveal` → `gsap.from(el, { y: 32, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", once } })`
- `RevealGroup` → same, with `stagger` across `.kinetic-reveal-item` children
- Add a new optional prop `parallax?: number` — when set, adds a `scrub: true` trigger
  translating the element by that many pixels across its scroll range. This is how
  sections get depth in Phase 6.

**Reduced-motion gate** (do this in one place, not per-component):
```ts
const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: no-preference)", () => { /* animations here */ });
```
Under reduced motion the elements simply render in their final state.

### P3.3 — Lenis smooth scroll (optional but recommended)

Create `components/motion/smooth-scroll.tsx`. Lenis is what makes scroll-scrubbed motion
feel expensive rather than jittery.

```tsx
const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

**Three things that will break if you are careless:**
1. Disable Lenis entirely under `prefers-reduced-motion`.
2. The sticky header (`components/layout/header.tsx:50`) must keep working — verify.
3. When a modal opens, call `lenis.stop()`; on close, `lenis.start()`. Wire this in
   `components/ui/modal.tsx`. Without it, the page scrolls behind open modals.

If any of these fight you, **drop Lenis** — it is a nice-to-have. Native scroll with
ScrollTrigger still looks good. Do not spend more than one attempt on it.

### P3.4 — Scroll progress hook

`lib/motion/use-scroll-progress.ts` — returns `0→1` for an element's travel through the
viewport. Phase 4's props consume it.

---

## PHASE 4 — 3D Prop System

The scattered pastry objects. **CSS-3D, no WebGL** — they must run on every phone.

### P4.1 — How these are built

Each prop is a `preserve-3d` container holding 2–4 layered `div`s offset on `translateZ`.
Depth reads from three cues, all cheap:

1. **Layered geometry** — real Z separation between the parts
2. **Baked shading** — a `radial-gradient` with an off-centre light source at
   `30% 25%` (consistent across every prop — this is what makes them look like one set)
3. **Contact shadow** — a separate blurred ellipse that scales inversely with height

Global light direction: **top-left, warm**. Highlight `rgba(255,252,248,0.9)`,
shadow `rgba(46,33,27,0.25)`.

### P4.2 — The prop library

Create `components/props/` with one file each. Design them yourself following the recipes:

| Prop | Construction | Best placement |
|---|---|---|
| **Macaron** | 3 stacked ellipses: shell / ganache (inset, darker) / shell. `rotateX(62deg)` base, `translateZ` ±14px. Ruffled "foot" = a 4th ellipse with a dotted border-image. | Hero, Chef's Choice |
| **Sprinkle** | `border-radius: 999px`, 4×12px, random `rotate3d`. Render 8–14 as one component. Cheapest prop — use for density. | Everywhere, low opacity |
| **Cherry** | Sphere via `radial-gradient(circle at 30% 25%, #E8879B, #8E2740 70%)` + a specular `::before` dot + a curved stem (`border-radius` on a bordered box). | Cards, CTA band |
| **Cake slice** | 3 wedges via `clip-path: polygon()` with graduated brightness; the "front face" is a separate `translateZ`'d layer. Most complex — build last. | Best Bakery, tiles |
| **Chocolate curl** | A `border-radius: 60% 40% 30% 70%` blob with a dark-to-mid gradient and a `rotate3d` twist. | Dark bands |

**Every prop must:**
- accept `{ size, x, y, depth, className }` where `depth` (0–1) drives parallax rate
- be `aria-hidden="true"` and `pointer-events-none`
- be `position: absolute` inside a `relative` section wrapper — never `fixed` (fixed
  breaks on iOS Safari with smooth scroll)
- set `will-change: transform` **only while animating**, cleared after

### P4.3 — Scroll binding

Create `components/props/prop-field.tsx` — one wrapper that positions a set of props in a
section and binds them all to a single ScrollTrigger (**one trigger per section, not one
per prop** — this is the difference between 60fps and 25fps).

```tsx
// Inside useGSAP, scoped to the section:
gsap.to(".prop", {
  y: (i, el) => -160 * Number(el.dataset.depth),
  rotateZ: (i, el) => 25 * Number(el.dataset.depth),
  ease: "none",
  scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1 },
});
```

Write transforms with `gsap.quickTo` where you can — it is measurably cheaper than
repeated `gsap.to` on scroll.

### P4.4 — Budget rules (enforce these)

| Rule | Value |
|---|---|
| Props visible per viewport | ≤ 6 desktop, ≤ 3 mobile |
| Total props on homepage | ≤ 18 |
| Disabled entirely | `prefers-reduced-motion`, and below 640px keep only sprinkles |
| Animate only | `transform` and `opacity` — **never** `top`/`left`/`width`/`filter` |
| Every prop | `pointer-events: none`, `aria-hidden="true"` |

### P4.5 — Placement map

```
Hero              2 macarons + sprinkle cluster    depth 0.3 / 0.7
Tiles             1 cherry (between tiles)         depth 0.5
Chef's Choice     1 macaron + 1 choc curl          depth 0.4 / 0.8
Gallery (cocoa)   3 sprinkle clusters              depth 0.6  ← light props on dark
Best Bakery       1 cake slice                     depth 0.35
Custom CTA        2 cherries + sprinkles           depth 0.5 / 0.9
How It Works      1 macaron                        depth 0.4
```

---

## PHASE 5 — Hero

> The user explicitly asked to **keep the hero's layout**. Do not restructure the collage.
> Improve the background, add parallax, add the WebGL centrepiece.

### P5.1 — Background (the specific complaint)

Currently `components/ui/modern-hero-section.tsx:41-52` is a blurred photo at
`opacity-30` under a flat cream gradient. That is the "boring background".

Replace with four stacked layers, back to front:

1. **Cocoa gradient mesh** — 3 overlapping `radial-gradient`s (cocoa → berry-tinted →
   peach) at low opacity on a `--cocoa` base. Animate the gradient positions with GSAP on
   a slow 20s `yoyo` loop. This is the "liquid" backdrop the glass refracts against.
2. **The bakery photo**, `opacity-25`, `scale-110`, parallax `y: 80` on scrub.
3. **Grain** — a tiling SVG `feTurbulence` at `opacity: 0.05`, `mix-blend-mode: overlay`.
   This one cheap layer is most of what separates "cheap gradient" from "designed".
4. **Vignette** — `radial-gradient(ellipse at center, transparent 40%, var(--cocoa) 100%)`
   to focus the eye on the headline.

Because the hero is now dark, the H1 becomes `--shell`, the subtitle `#D8CCC0`, and the
stat cards become **`.glass-liquid`** — glass over a rich background, exactly where §2.5
says it belongs.

### P5.2 — Collage parallax

Each of the 7 collage images gets a `data-depth` (centre image shallowest at `0.15`, the
outer far-left/far-right deepest at `0.85`) and:

- **Scroll parallax** — `y: -depth * 180`, `scrub: 1`, one shared trigger
- **Pointer parallax** — on `mousemove`, `gsap.quickTo(el, "x")` toward
  `(pointerX - centerX) * depth * 0.04`. Desktop + fine-pointer only
  (`window.matchMedia("(pointer: fine)")`).
- Keep the existing 6s float loop, but move it from the inline `<style>` tag into
  `globals.css` — an inline `<style>` inside a component re-injects on every render.

### P5.3 — WebGL centrepiece

One R3F canvas, ~360px, sitting behind the central collage image.

**Object:** a slowly rotating torus (a glass macaron) using `MeshPhysicalMaterial` with
`transmission: 1`, `thickness: 1.5`, `roughness: 0.15`, `ior: 1.4`, and a warm
`--blush` tint. This is *literal* liquid glass in 3D and ties the whole design language
together. Scroll drives `rotation.x`; pointer drives a subtle `rotation.y` lean.

**Loading gate — all four conditions required:**
```tsx
const HeroGlass = dynamic(() => import("./hero-glass").then(m => m.HeroGlass), {
  ssr: false,          // 1. never server-rendered — no hydration risk
  loading: () => null,
});

// Mount only when:
//   2. window.matchMedia("(min-width: 1024px)").matches
//   3. !window.matchMedia("(prefers-reduced-motion: reduce)").matches
//   4. after requestIdleCallback  — never competes with LCP
```

Use `<Canvas frameloop="demand" dpr={[1, 1.75]}>` and `invalidate()` on scroll/pointer.
A continuously-rendering canvas will drain phone batteries and show up in the user's
performance complaint.

Prefer `MeshPhysicalMaterial` over drei's `MeshTransmissionMaterial` — the latter does
multiple render passes and is significantly more expensive for a marginal quality gain at
this size.

---

## PHASE 6 — Section Redesign

Keep every section (user requirement). Improve each. Apply the §2.3 background rhythm.

**P6.1 Header** — Transparent over the hero, transitioning to `.glass` on scroll past
100px (GSAP ScrollTrigger toggling a class). Nav links get an animated underline that
wipes from left. Cart badge: wire it to the real `useCart()` count — right now
`components/layout/header.tsx:109` renders a hardcoded `0` inside a `hidden` span, which
is a genuine bug. Fix it.

**P6.2 HomeTiles** — Currently a flat symmetric 2×2. Make it an **asymmetric bento**:
tile 1 spans 2 columns (wide), tiles 2 & 3 stack in column 3, tile 4 is wide beneath.
Radius → `--r-xl`. On hover: image `scale(1.06)`, the label block lifts, and a
`.glass` "Order Now" pill slides up. Add scroll parallax at `depth 0.2` on the images
inside their frames (image moves, frame does not — this is the effect that reads as
expensive).

**P6.3 CurationRow (Chef's Choice / Most Ordered)** — Convert from a static grid to a
**horizontal scroll rail** on desktop with GSAP-driven momentum, falling back to a
regular grid on mobile. Cards: `--r-lg`, image top with a 4:5 portrait crop (taller
cards read as more premium than 4:3), name in Fraunces, price as a `.glass` chip
overlaid on the image bottom-right. Eyebrow label above the section title.

**P6.4 DailyMenu** — Keep the grid, restyle to match P6.3's cards. Add a rotating
"Fresh Today" seal — a circular SVG `textPath` slowly rotating. Small, cheap, memorable.

**P6.5 GalleryMarquee** — Move onto the **cocoa** band. Two rows scrolling in opposite
directions instead of one. Each tile skews slightly toward its travel direction
(`skewX(-2deg)`) with velocity-based skew via `ScrollTrigger.getVelocity()`. Replace the
white edge-fade gradients with cocoa. Cap at 12 source photos (per P1.5).

**P6.6 BestBakerySection** — Keep the split layout. Image gets a `--r-xl` frame with
parallax inside it. The 4.7 rating card becomes `.glass-liquid` overlapping the image
corner. Stat rows animate in on a stagger. Narrative text gets a `text-h2` pull-quote
treatment on the first sentence.

**P6.7 Custom Cake CTA** — Currently a flat pastel gradient box. Make it a full-bleed
**cocoa** band with the gradient mesh from P5.1, a `.glass-liquid` panel holding the
copy, and cherry props floating at two depths. This becomes the page's second visual
peak after the hero.

**P6.8 HowItWorks** — Numbers become huge Fraunces display figures (`text-display`
scale, `--shell` on `--cocoa`, or outlined via `-webkit-text-stroke`). Connect the three
steps with an SVG path that draws itself on scroll (`strokeDashoffset` scrubbed by
ScrollTrigger). This is a classic, cheap, and very effective scroll moment.

**P6.9 Footer** — Move to `--cocoa`. Add a large Fraunces "SAVOR" wordmark as a
background watermark at low opacity. Restructure to 4 columns.

---

## PHASE 7 — Menu Page

This is where inspiration image 1's product grid applies most directly.

**P7.1** — `app/menu/page.tsx`: add a compact hero band (cocoa, gradient mesh, `text-h1`
in Fraunces, one line of copy). Set `export const revalidate = 60`.

**P7.2** — `components/menu-client.tsx`:
- Sticky filter bar that becomes `.glass` when it sticks. Category chips: pill,
  `--berry` when active. **Keep `data-category` on every chip.**
- Cards restyled to match P6.3. **Keep `data-item-id`, `data-item-name`,
  `data-item-price`, `menu-item-card`, `data-category-section` — the E2E specs need them.**
- Animate filter transitions with GSAP FLIP (`gsap/Flip`) so cards move rather than pop.
- Category section headings in Fraunces `text-h2` with a hairline rule.

**P7.3** — `components/item-detail-modal.tsx`: `.glass-liquid` backdrop, spring entrance.
**Preserve `role="dialog"`, `aria-modal="true"`, and both quantity `aria-label`s.**

---

## PHASE 8 — Polish & Verification

**P8.1 Reduced motion** — Set the OS flag and reload every page. Requirements: no
parallax, no scrub, no WebGL, no Lenis, no float loops. The marquee is the one deliberate
exception (already documented at `globals.css:85`). Everything renders in its final state.

**P8.2 Responsive** — Test at 375 / 768 / 1024 / 1440 / 1920. Watch for: props escaping
their sections and causing horizontal scroll (`overflow-x: clip` on section wrappers);
glass over cream on mobile after a layout reflow; the hero collage on small screens.

**P8.3 Performance** — Throttle to "Fast 4G" + 4× CPU. Targets: **LCP < 2.5s**,
**CLS < 0.1**, **INP < 200ms**, sustained **≥ 50fps** while scrolling the homepage.
If the props drop frames, cut their count before cutting their quality.

**P8.4 Accessibility** — Run the `impeccable` skill. Verify: contrast on the new cocoa
bands, focus rings visible on glass surfaces (they will need an explicit
`--berry` ring — glass eats default outlines), keyboard nav through the horizontal rail,
and that every prop is `aria-hidden`.

**P8.5 E2E** — The real gate:
```bash
npx playwright test
```
All 9 specs must pass. If any fail, you changed a selector — check §0.1.

**P8.6 Build**
```bash
npx opennextjs-cloudflare build
```
Confirm the worker bundle is still under 10MB compressed. Three.js is client-side and
lands in `.open-next/assets`, not the worker, so this should be unaffected — but verify.

**P8.7 Cleanup** — Delete `components/kinetic-loader.tsx` (already deleted in the working
tree), `components/kinetic/kinetic-image.tsx`, `public/fonts/Round8.otf`. Run
`npx eslint .` for unused imports.

---

## 4. Final Checklist

| # | Requirement (user's words) | Where |
|---|---|---|
| 1 | "currently the website looks very bland and boring" | §2.1–2.3 palette anchor + section rhythm; Phase 6 |
| 2 | "i like the hero so keep that" | P5.x — layout preserved, only enhanced |
| 3 | "the background of the hero is boring so improve that" | P5.1 — 4-layer gradient mesh + grain + vignette |
| 4 | "implement liquid glass into the design" | §2.5 spec; P2.3; used in P5.1, P6.1/5/6/7, P7.2/3 |
| 5 | "i want to have scroll animation" | Phase 3 (GSAP + ScrollTrigger + Lenis) |
| 6 | "implement three js" | P5.3 — R3F glass torus, lazy + desktop-gated |
| 7 | "gsap maybe for animations" | Phase 3–7 throughout |
| 8 | "interactive but easy to navigate and not complicated" | P6.1 nav; motion is decorative, never blocks a task |
| 9 | "3d components to scatter around... affected by scroll" | Phase 4 — 5-prop CSS-3D library + scroll binding |
| 10 | "design them yourself" | P4.2 construction recipes |
| 11 | "everything flows together and doesnt look out of place" | Single light direction (§4.1), one easing curve, one radius scale, one prop set |
| 12 | "i dont like the font... bold but not out of place" | §2.4 — Fraunces + Plus Jakarta Sans; Baloo 2 retired |
| 13 | "second image is inspiration... keep all sections but improve" | Phase 6 — all 8 sections kept, each restyled |
| 14 | "hero... more interactive with paralax" | P5.2 — scroll parallax + pointer parallax |
| 15 | "photos in production take alot of time to load fix that" | **Phase 1** — 4 root causes, ~75% payload reduction |

---

## 5. Execution Order for Sonnet

Work one phase at a time. Run the §0.2 gate between each. Do not start a phase before the
previous one's acceptance criteria pass.

```
P0 → P1 → [verify images before continuing] → P2 → P3 → P4 → P5 → P6 → P7 → P8
```

If you must cut scope under time pressure, cut in this order: **P5.3** (WebGL) first,
then **P3.3** (Lenis), then **P6.3**'s horizontal rail. Never cut Phase 1 or Phase 2 —
they are the load-bearing work.
