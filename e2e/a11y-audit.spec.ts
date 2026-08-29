import { test, expect } from "@playwright/test";

/**
 * Phase 8 verification: computed contrast + responsive overflow, run in a real
 * browser. Written because the in-editor browser pane does not composite when
 * hidden, which throttles JS so React never finishes hydrating — elements end
 * up with a null offsetParent and any audit silently skips them.
 *
 * Contrast is measured on COMPOSITED colours: Tailwind's opacity modifiers emit
 * oklab(), and text is blended over its nearest opaque ancestor background, so
 * both are normalised by painting them to a canvas rather than parsed by regex.
 */

const PAGES = ["/", "/menu", "/about", "/gallery"];
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const auditContrast = `(() => {
  const cv=document.createElement('canvas'); cv.width=cv.height=1;
  const cx=cv.getContext('2d',{willReadFrequently:true});
  const toRGBA=(css,under)=>{cx.clearRect(0,0,1,1); if(under){cx.fillStyle=under;cx.fillRect(0,0,1,1);} cx.fillStyle=css;cx.fillRect(0,0,1,1); const d=cx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255];};
  const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
  const ratio=(a,b)=>{const L1=lum(a),L2=lum(b);const[hi,lo]=L1>L2?[L1,L2]:[L2,L1];return (hi+0.05)/(lo+0.05);};
  // Where text sits over an image or a gradient painted by an absolutely
  // positioned SIBLING, no amount of ancestor-walking finds the real ground.
  // Those containers declare it explicitly via data-contrast-ground.
  const GROUNDS = { cocoa:[46,33,27,1], cream:[250,246,241,1], shell:[242,232,220,1], porcelain:[255,253,250,1], berry:[168,69,90,1] };
  const opaqueBg=el=>{
    let e=el;
    while(e&&e!==document.documentElement){
      const declared = e.getAttribute && e.getAttribute('data-contrast-ground');
      if (declared && GROUNDS[declared]) return GROUNDS[declared];
      const p=toRGBA(getComputedStyle(e).backgroundColor);
      if(p[3]>0.85)return p;
      e=e.parentElement;
    }
    return GROUNDS.cream;
  };
  const out=[]; let checked=0;
  document.querySelectorAll('h1,h2,h3,p,a,button,span,li').forEach(el=>{
    if (el.closest('[aria-hidden="true"]')) return;
    const t=(el.textContent||'').trim();
    if(!t||t.length>80||el.children.length>0)return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none'||!el.getClientRects().length)return;
    checked++;
    // Start at the element itself — it may carry its own opaque background
    // (e.g. a cocoa button), which the previous version skipped entirely.
    const bg=opaqueBg(el);
    const fg=toRGBA(cs.color,'rgb('+bg[0]+','+bg[1]+','+bg[2]+')');
    const r=ratio(fg,bg);
    const size=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight)>=700;
    const min=(size>=24||(size>=18.66&&bold))?3:4.5;
    if(r<min-0.05) out.push({text:t.slice(0,40),ratio:Math.round(r*100)/100,min,px:Math.round(size)});
  });
  const seen=new Set();
  return {checked, failures: out.filter(f=>{const k=f.text+f.ratio;if(seen.has(k))return false;seen.add(k);return true;})};
})()`;

for (const path of PAGES) {
  test(`contrast + overflow: ${path}`, async ({ page }) => {
    const problems: string[] = [];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path, { waitUntil: "networkidle" });

      // Horizontal overflow — the classic symptom of a decorative prop or a
      // wide table escaping its container.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (overflow > 1) {
        problems.push(`${vp.name}: horizontal overflow of ${overflow}px`);
      }

      if (vp.name === "desktop") {
        const res = (await page.evaluate(auditContrast)) as {
          checked: number;
          failures: { text: string; ratio: number; min: number; px: number }[];
        };
        expect(res.checked, `${path} rendered too few elements to audit`).toBeGreaterThan(20);
        for (const f of res.failures) {
          problems.push(
            `contrast ${f.ratio}:1 (needs ${f.min}) at ${f.px}px — "${f.text}"`
          );
        }
      }
    }

    expect(problems, `${path}\n  ${problems.join("\n  ")}`).toEqual([]);
  });
}

test("reduced motion: no transforms applied to decorative props", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(700);

  const moved = await page.evaluate(() =>
    [...document.querySelectorAll("[data-prop]")].filter(
      (el) => getComputedStyle(el).transform !== "none"
    ).length
  );
  expect(moved, "props must not animate under prefers-reduced-motion").toBe(0);
  await ctx.close();
});
