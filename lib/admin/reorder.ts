/**
 * The row an item swaps places with when moved up or down a list.
 *
 * The admin pages used to look for the row whose sort_order was exactly one
 * more or less. That holds only while the numbers have no gaps — and deleting
 * any row from the middle of a list makes one, after which the arrows either
 * side of the gap silently did nothing. The neighbour is whatever sits next to
 * the item in sort order, however far apart the numbers are.
 *
 * Ties (two rows with the same sort_order, possible after older edits) are
 * broken by id so the order is stable and every row is reachable.
 */
export function reorderNeighbour<T extends { id: string; sort_order: number }>(
  list: readonly T[],
  item: T,
  direction: "up" | "down"
): T | null {
  const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const index = sorted.findIndex((row) => row.id === item.id);
  if (index < 0) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  return sorted[target] ?? null;
}

/**
 * The two sort_order values to write for a swap. If the pair shares a value,
 * swapping would change nothing, so the moved item is nudged past its
 * neighbour instead.
 */
export function swappedSortOrders<T extends { sort_order: number }>(
  item: T,
  neighbour: T,
  direction: "up" | "down"
): { item: number; neighbour: number } {
  if (item.sort_order !== neighbour.sort_order) {
    return { item: neighbour.sort_order, neighbour: item.sort_order };
  }
  return direction === "up"
    ? { item: neighbour.sort_order - 1, neighbour: neighbour.sort_order }
    : { item: neighbour.sort_order + 1, neighbour: neighbour.sort_order };
}
