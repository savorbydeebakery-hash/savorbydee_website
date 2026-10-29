import { expect, type Page } from "@playwright/test";

/**
 * Fills the sign-in form and waits until both values have stuck.
 *
 * Straight after a deploy the page can be served by one version and its
 * scripts by the next; React then redraws the form, and whatever was typed
 * first (the email) is gone. Clicking Sign In with an empty email does
 * nothing, and the spec times out waiting for /admin. Refilling until the
 * values hold rides that out.
 */
export async function fillSignIn(page: Page, email: string, password: string) {
  const emailBox = page.getByLabel(/email/i);
  // Exact: the eye button next to the box is labelled "Show password".
  const passwordBox = page.getByLabel("Password", { exact: true });
  await expect(async () => {
    await emailBox.fill(email);
    await passwordBox.fill(password);
    await expect(emailBox).toHaveValue(email, { timeout: 1000 });
    await expect(passwordBox).toHaveValue(password, { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
}
