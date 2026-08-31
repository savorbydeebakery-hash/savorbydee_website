import { instantToIstInput, istInputToInstant, istDayName } from "@/lib/time/ist";

/**
 * A slot value the checkout will accept, as the IST wall clock a
 * `datetime-local` input expects.
 *
 * The specs used to fill the picker with
 * `new Date(Date.now() + 48h).toISOString().slice(0, 16)` — a *UTC* wall
 * clock pasted into a field that is read as IST. That was harmless only
 * because nothing validated opening hours; now that the API enforces them, a
 * suite run late in the UTC day would have produced a slot past the 21:00
 * close and the run would have gone red for a reason unrelated to the code
 * under test.
 *
 * Midday on the first non-Sunday at least `noticeHours` out is inside every
 * open day's window. Sunday is the one closed day in the live settings; if the
 * client closes another weekday or sets a holiday, this needs to read
 * site_settings instead of assuming.
 */
export function validSlotInput(noticeHours = 48): string {
  const earliestMs = Date.now() + noticeHours * 3_600_000;

  for (let i = 0; i < 10; i++) {
    const dayKey = instantToIstInput(earliestMs + i * 86_400_000).slice(0, 10);
    const wallClock = `${dayKey}T12:00`;
    const instant = istInputToInstant(wallClock);

    if (instant && instant.getTime() >= earliestMs && istDayName(instant) !== "sunday") {
      return wallClock;
    }
  }

  throw new Error(`No valid slot found within 10 days of +${noticeHours}h`);
}
