import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAJA_PATH, buildCajaPath, parseCajaSesionId } from "../../../src/utils/cajaLink.js";

describe("buildCajaPath", () => {
  it("39: con id válido arma /caja?sesion=N; inválido da la ruta sola", () => {
    expect(buildCajaPath(12)).toBe("/caja?sesion=12");
    expect(buildCajaPath("12")).toBe("/caja?sesion=12");
    expect(buildCajaPath(0)).toBe("/caja");
    expect(buildCajaPath("x")).toBe("/caja");
    expect(buildCajaPath(null)).toBe("/caja");
    expect(buildCajaPath(undefined)).toBe("/caja");
    expect(CAJA_PATH).toBe("/caja");
  });
});

describe("parseCajaSesionId", () => {
  it("40: entero positivo; lo demás es null", () => {
    expect(parseCajaSesionId("?sesion=12")).toBe(12);
    expect(parseCajaSesionId("?sesion=0")).toBeNull();
    expect(parseCajaSesionId("?sesion=abc")).toBeNull();
    expect(parseCajaSesionId("?sesion=12.5")).toBeNull();
    expect(parseCajaSesionId("")).toBeNull();
    expect(parseCajaSesionId(null)).toBeNull();
  });

  it("acepta un URLSearchParams", () => {
    expect(parseCajaSesionId(new URLSearchParams("sesion=7"))).toBe(7);
  });

  it("41: el módulo no usa Date ni toLocale", () => {
    const src = readFileSync(new URL("../../../src/utils/cajaLink.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/getHours|toLocale|toISOString|new Date/);
  });
});
