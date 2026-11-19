import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OCUPACIONES_PATH,
  buildAlertasDeOcupacionPath,
  buildOcupacionPath,
  parseOcupacionId,
} from "../../../src/utils/ocupacionLink.js";

describe("buildOcupacionPath", () => {
  it("54: arma /ocupaciones?id=N; un id inválido da la ruta sola y no lanza", () => {
    expect(buildOcupacionPath(12)).toBe("/ocupaciones?id=12");
    expect(buildOcupacionPath("12")).toBe("/ocupaciones?id=12");
    for (const malo of [0, -1, 1.5, "abc", null, undefined]) {
      expect(buildOcupacionPath(malo)).toBe("/ocupaciones");
    }
    expect(OCUPACIONES_PATH).toBe("/ocupaciones");
  });
});

describe("parseOcupacionId", () => {
  it("55: lee el id y ignora lo que no es un entero positivo", () => {
    expect(parseOcupacionId("?id=12")).toBe(12);
    expect(parseOcupacionId("?id=abc")).toBeNull();
    expect(parseOcupacionId("?id=0")).toBeNull();
    expect(parseOcupacionId("")).toBeNull();
    expect(parseOcupacionId(undefined)).toBeNull();
    expect(parseOcupacionId(new URLSearchParams("id=7"))).toBe(7);
  });

  it("56: ida y vuelta con buildOcupacionPath", () => {
    expect(parseOcupacionId(`?${buildOcupacionPath(12).split("?")[1]}`)).toBe(12);
  });
});

describe("buildAlertasDeOcupacionPath", () => {
  it("arma el query que lee la pantalla de Alertas", () => {
    expect(buildAlertasDeOcupacionPath(12)).toBe("/alertas-operativas?ocupacionId=12");
    expect(buildAlertasDeOcupacionPath(0)).toBe("/alertas-operativas");
  });
});

describe("57: higiene de los módulos puros", () => {
  it("no usan getHours, toLocale ni toISOString", () => {
    for (const file of ["src/utils/ocupaciones.js", "src/utils/ocupacionLink.js"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/getHours|toLocale|toISOString/);
    }
  });
});
