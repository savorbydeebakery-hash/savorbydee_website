import { test, type Page } from "@playwright/test";

/**
 * Skip a spec that has to place an order while the bakery is shut.
 *
 * The order API refuses orders outside business hours (Mon-Sat 09:00-21:00
 * IST, closed Sunday), which is the point of it. But `verify` runs on every
 * deploy at whatever time the deploy happens, so without this a perfectly good
 * build goes red for deploying at 9:30pm or on a Sunday.
 *
 * Skipping is the honest outcome: the scenario genuinely cannot be exercised
 * against a closed shop, and a skip says so where a failure would claim
 * something is broken. The closed banner is the storefront's own signal, so
 * this asks the page rather than re-deriving the schedule.
 */
export async function skipWhenClosed(page: Page): Promise<void> {
  await page.goto("/menu");

  const closed = await page
    .locator('[data-testid="shop-closed-banner"]')
    .isVisible()
    .catch(() => false);

  test.skip(
    closed,
    "Bakery is closed right now, so an order cannot be placed. Business hours are Mon-Sat 09:00-21:00 IST."
  );
}
