/**
 * Turning a PostgREST failure into something a baker can act on.
 *
 * Two things made admin writes fail silently. supabase-js RESOLVES on a
 * database error — it returns `{ data, error }` and does not throw — so the
 * `try/catch` around the menu-item save was dead code, and the categories page
 * ignored the result entirely. Either way the modal closed, the list refetched,
 * and the client watched their edit revert with nothing on screen to explain
 * it. The most likely causes are exactly the ones that look like nothing
 * happened: a check constraint, an RLS policy, a foreign key.
 *
 * The raw messages are not useful on their own. "insert or update on table
 * \"menu_items\" violates foreign key constraint" does not tell a bakery owner
 * that the category they picked has been deleted in another tab.
 */

/** The shape supabase-js returns. Kept structural so this needs no import. */
export interface WriteError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export function describeWriteError(error: WriteError, subject = "that change"): string {
  const code = error.code ?? "";
  const raw = error.message ?? "";

  switch (code) {
    case "23505":
      return `Something with that name already exists, so ${subject} was not saved.`;
    case "23503":
      // Both directions land here: deleting a category items still point at,
      // and saving an item whose category has since gone.
      return `${capitalize(subject)} is still linked to something else, so it could not be saved. If you are deleting a category, move its items first.`;
    case "23514":
      return `${capitalize(subject)} was refused because a value is out of range. Notice hours cannot be negative and a bulk threshold has to be at least 1.`;
    case "23502":
      return `${capitalize(subject)} is missing a required field.`;
    case "22P02":
      return `${capitalize(subject)} contains a value in the wrong format.`;
    case "42501":
    case "PGRST301":
      return `You are not allowed to make ${subject}. Your sign-in may have expired — reload the page and sign in again.`;
    case "PGRST204":
      // "Could not find the 'x' column" — a migration has not been applied.
      return `${capitalize(subject)} refers to a column the database does not have yet. A migration is probably missing: ${raw}`;
    case "PGRST205":
    case "42P01":
      return `That table does not exist yet — a migration has not been applied.`;
    default:
      return raw ? `Could not save: ${raw}` : `Could not save ${subject}.`;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
