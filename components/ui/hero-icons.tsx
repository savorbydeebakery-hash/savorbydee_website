/**
 * Outline marks for the hero proof badges.
 *
 * Drawn here rather than pulled from lucide because the reference uses thin
 * single-weight outlines inside a circle, and mixing a general icon set into
 * that ring gives three glyphs at three optical weights.
 */

export function CakeSlice() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 17h16v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 17v-3.5A3.5 3.5 0 0 1 8.5 10h7a3.5 3.5 0 0 1 3.5 3.5V17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 10V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function HeartHandshakeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
