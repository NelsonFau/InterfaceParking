import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber } from "../../../src/utils/formato.js";

// Los espacios (incluidos los no cortables) se normalizan antes de comparar.
const norm = (s) => s.replace(/[\s  ]+/g, " ");

describe("formatMoney", () => {
  it("usa separador de miles y coma decimal", () => {
    expect(norm(formatMoney(1234.5))).toContain("1.234,50");
  });

  it("lleva el símbolo de peso", () => {
    expect(formatMoney(10)).toContain("$");
  });

  it("acepta números como texto", () => {
    expect(norm(formatMoney("1234.5"))).toContain("1.234,50");
  });

  it("null, undefined, vacío y no numérico dan —", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("")).toBe("—");
    expect(formatMoney("   ")).toBe("—");
    expect(formatMoney("abc")).toBe("—");
    expect(formatMoney(NaN)).toBe("—");
    expect(formatMoney(Infinity)).toBe("—");
  });

  it("cero es un importe, no —", () => {
    expect(formatMoney(0)).not.toBe("—");
    expect(norm(formatMoney(0))).toContain("0,00");
  });
});

describe("formatNumber", () => {
  it("separa miles", () => {
    expect(formatNumber(1234)).toBe("1.234");
  });

  it("cero da 0", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("sin dato da —", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber("")).toBe("—");
    expect(formatNumber("abc")).toBe("—");
  });
});
