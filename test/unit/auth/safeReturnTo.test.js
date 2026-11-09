import { describe, expect, it } from "vitest";
import { safeReturnTo } from "../../../src/auth/safeReturnTo.js";

describe("safeReturnTo (rutaDeRetornoSegura)", () => {
  it.each(["//otro.com", "https://otro.com", "javascript:alert(1)", "clientes", "/\\otro.com", "/cli\tentes", "", null, undefined])(
    "rechaza %j",
    (value) => {
      expect(safeReturnTo(value)).toBeNull();
    }
  );

  it.each(["/clientes?x=1", "/dashboard", "/"])("acepta %j", (value) => {
    expect(safeReturnTo(value)).toBe(value);
  });
});
