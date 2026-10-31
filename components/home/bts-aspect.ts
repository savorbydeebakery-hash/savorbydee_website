/**
 * Behind the Scenes tiles take the menu cards' shape
 * (components/home/photo-link-card.tsx), so the clips match "Two ways to
 * order" above them. Its own module because the server section and the
 * client clip both read it, and a value exported from a "use client" file
 * reaches a server component as a reference, not the string.
 */
export const BTS_ASPECT = "aspect-[4/3] md:aspect-[16/10]";
