import { expect, type Page } from "@playwright/test";
import { instantToIstInput, istInputToInstant, istDayName } from "@/lib/time/ist";

/**
 * Midday on the first non-Sunday at or after `earliestMs`, as the IST wall
 * clock a `datetime-local` input expects.
 *
 * The specs used to fill the picker with
 * `new Date(Date.now() + 48h).toISOString().slice(0, 16)` — a *UTC* wall
 * clock pasted into a field that is read as IST. That was harmless only
 * because nothing validated opening hours; now that the API enforces them, a
 * suite run late in the UTC day would have produced a slot past the 21:00
 * close and the run would have gone red for a reason unrelated to the code
 * under test.
 *
 * Sunday is the one closed day in the live settings; if the client closes
 * another weekday or sets a holiday, this needs to read site_settings instead
 * of assuming.
 */
export function slotAtLeast(earliestMs: number): string {
  for (let i = 0; i < 14; i++) {
    const dayKey = instantToIstInput(earliestMs + i * 86_400_000).slice(0, 10);
    const wallClock = `${dayKey}T12:00`;
    const instant = istInputToInstant(wallClock);

    if (instant && instant.getTime() >= earliestMs && istDayName(instant) !== "sunday") {
      return wallClock;
    }
  }

  throw new Error(`No valid slot found within 14 days of ${new Date(earliestMs).toISOString()}`);
}

/** A slot at least `noticeHours` out. Prefer fillEarliestSlot where a page is available. */
export function validSlotInput(noticeHours = 48): string {
  return slotAtLeast(Date.now() + noticeHours * 3_600_000);
}

/**
 * Fill the checkout's slot picker with a value the page will actually accept,
 * read from the picker's own `min` attribute.
 *
 * Every checkout spec used to hardcode `now + 48h`, which silently assumed the
 * item it had added needed no more than that. Moving Frosted Sponge Cakes to
 * the top of the menu — a one-line change to a client-editable sort order —
 * made "the first item on /menu" a custom cake needing five days, and four
 * specs stalled on a Continue that would never enable. The window is a
 * property of the item, so it has to be read rather than assumed.
 */
export async function fillEarliestSlot(page: Page): Promise<string> {
  const input = page.locator("input[type='datetime-local']");
  await expect(input).toBeVisible();

  // The step's Continue reads "Checking availability…" and stays disabled
  // until site_settings arrives, so this is what guarantees `min` was computed
  // from the real schedule and not the pre-load fallback.
  await expect(page.getByRole("button", { name: /continue/i })).toBeEnabled();

  const min = await input.getAttribute("min");
  expect(min, "the slot picker must carry a min attribute").toBeTruthy();

  const minInstant = istInputToInstant(min!);
  expect(minInstant, `min attribute "${min}" is not a valid IST wall clock`).not.toBeNull();

  // A minute past the floor, so rounding up to midday never lands before it.
  const value = slotAtLeast(minInstant!.getTime() + 60_000);
  await input.fill(value);
  return value;
}
