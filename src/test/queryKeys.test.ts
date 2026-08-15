import { describe, expect, it, vi } from "vitest";
import { queryKeys, invalidateDomains } from "../lib/queryKeys";

describe("queryKeys", () => {
  it("has unique key prefixes", () => {
    const values = Object.values(queryKeys).map((k) => k.join("|"));
    expect(new Set(values).size).toBe(values.length);
  });

  it("invalidateDomains invalidates every provided key", () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateDomains(qc, [queryKeys.sales, queryKeys.products]);
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(2);
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["sales"] });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["products"] });
  });
});
