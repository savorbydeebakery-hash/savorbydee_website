import { test, expect } from "@playwright/test";
import { skipWhenClosed } from "./helpers/shop-open";
import { istInputToInstant, istDayName, instantToIstInput } from "@/lib/time/ist";

/**
 * T6.7: a day the bakery has marked closed cannot be booked.
 *
 * This spec used to look for `input[type='date']`. The checkout has always
 * used `datetime-local`, so the locator never matched, the whole body sat
 * inside `if (visible)`, and the test passed without asserting anything —
 * while Sunday, marked closed in site_settings, was bookable in production
 * the entire time. Both halves are now real assertions.
 */
test("closed day is not offered and is refused if entered", async ({ page }) => {
  await skipWhenClosed(page);
  await page.goto("/menu");
  await page.locator("button", { hasText: /add to cart/i }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .click();
  await page.goto("/cart");
  await page.getByRole("button", { name: /checkout/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  const slotInput = page.locator("input[type='datetime-local']");
  await expect(slotInput).toBeVisible();

  // The slot step's Continue is labelled "Checking availability…" and disabled
  // until site_settings arrives, so waiting for it here is what guarantees the
  // min attribute below was computed from the real schedule.
  await expect(page.getByRole("button", { name: /continue/i })).toBeEnabled();

  // 1. The floor the picker offers is a day the bakery is open.
  const min = await slotInput.getAttribute("min");
  expect(min, "the slot picker must carry a min attribute").toBeTruthy();
  const minInstant = istInputToInstant(min!);
  expect(minInstant).not.toBeNull();
  expect(istDayName(minInstant!)).not.toBe("sunday");

  // 2. Typing a closed day anyway is refused, with a reason.
  //
  // The Sunday has to be past the picker's own floor, not simply the next one.
  // Whichever item this added sets the notice window, and a five-day window
  // swallows the coming Sunday — the page then refuses the slot for being too
  // soon and the "closed on Sundays" message never appears, which is a real
  // refusal of the wrong kind.
  const sunday = nextSundayAfter(minInstant!.getTime());
  await slotInput.fill(sunday);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText(/closed on Sundays/i)).toBeVisible();
});

/** The first Sunday at midday at or after `fromMs`, as an IST wall clock. */
function nextSundayAfter(fromMs: number): string {
  for (let i = 0; i <= 14; i++) {
    const dayKey = instantToIstInput(fromMs + i * 86_400_000).slice(0, 10);
    const instant = istInputToInstant(`${dayKey}T12:00`);
    if (instant && instant.getTime() >= fromMs && istDayName(instant) === "sunday") {
      return `${dayKey}T12:00`;
    }
  }
  throw new Error("No Sunday within 14 days of the floor, which cannot happen");
}
