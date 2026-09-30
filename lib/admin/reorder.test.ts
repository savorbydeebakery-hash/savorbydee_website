import { describe, it, expect } from "vitest";
import { reorderNeighbour, swappedSortOrders } from "./reorder";

const rows = (orders: number[]) => orders.map((sort_order, i) => ({ id: `r${i}`, sort_order }));

describe("reorderNeighbour", () => {
  it("finds the adjacent row in a gapless list", () => {
    const list = rows([1, 2, 3]);
    expect(reorderNeighbour(list, list[1], "up")?.id).toBe("r0");
    expect(reorderNeighbour(list, list[1], "down")?.id).toBe("r2");
  });

  it("still finds it across a gap left by a deleted row", () => {
    // 1, 2, 5 — row "3" and "4" were deleted. The old ±1 lookup found
    // nothing either side of the gap and the arrows did nothing.
    const list = rows([1, 2, 5]);
    expect(reorderNeighbour(list, list[2], "up")?.id).toBe("r1");
    expect(reorderNeighbour(list, list[1], "down")?.id).toBe("r2");
  });

  it("works whatever order the list arrives in", () => {
    const list = [{ id: "c", sort_order: 30 }, { id: "a", sort_order: 10 }, { id: "b", sort_order: 20 }];
    expect(reorderNeighbour(list, list[0], "up")?.id).toBe("b");
  });

  it("returns null at either end", () => {
    const list = rows([1, 2]);
    expect(reorderNeighbour(list, list[0], "up")).toBeNull();
    expect(reorderNeighbour(list, list[1], "down")).toBeNull();
  });
});

describe("swappedSortOrders", () => {
  it("swaps two different values", () => {
    expect(swappedSortOrders({ sort_order: 2 }, { sort_order: 5 }, "down")).toEqual({ item: 5, neighbour: 2 });
  });

  it("moves past a neighbour with the same value instead of doing nothing", () => {
    expect(swappedSortOrders({ sort_order: 4 }, { sort_order: 4 }, "up")).toEqual({ item: 3, neighbour: 4 });
    expect(swappedSortOrders({ sort_order: 4 }, { sort_order: 4 }, "down")).toEqual({ item: 5, neighbour: 4 });
  });
});
