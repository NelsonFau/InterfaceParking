import { describe, expect, it } from "vitest";
import { isStale } from "../../../src/utils/autoRefresh.js";

describe("isStale", () => {
  const now = 1_000_000_000;
  const interval = 300000;

  it("16: sin carga previa toca; a 299999 ms no; a 300000 ms sí", () => {
    expect(isStale(null, now, interval)).toBe(true);
    expect(isStale(now - 299999, now, interval)).toBe(false);
    expect(isStale(now - interval, now, interval)).toBe(true);
  });

  it("un valor que no es número cuenta como sin carga", () => {
    expect(isStale(undefined, now, interval)).toBe(true);
    expect(isStale(Number.NaN, now, interval)).toBe(true);
  });
});
