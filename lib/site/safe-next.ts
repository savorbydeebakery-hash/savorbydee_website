/**
 * Where a login link may send someone afterwards: pages on this site only.
 *
 * `next` comes from the address, so anyone can write a link with their own. It
 * goes to window.location.assign, which runs a "javascript:" address as code in
 * the signed-in page: a crafted link could act as whoever logged in through it,
 * admin included. An outside address would be a convincing fake login page.
 *
 * Parsed rather than pattern-matched, because browsers forgive more than a
 * pattern expects: "/\evil.com", "//evil.com" and a tab inside "/\t/evil.com" all
 * leave the site. The parser reads them the way the browser will.
 */
const BASE = "https://savorbydee.in";

export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
