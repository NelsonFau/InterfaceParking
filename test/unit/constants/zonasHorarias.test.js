import { describe, expect, it } from "vitest";
import { ZONAS_HORARIAS, labelOfZona } from "../../../src/constants/zonasHorarias.js";
import { isValidTimeZone } from "../../../src/utils/fechas.js";

// Tabla de docs/inventario/backend.md, sección 5 (ZonasHorarias.cs:14-28), en su orden.
const INVENTARIO = [
  "America/Montevideo",
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Mendoza",
  "America/Sao_Paulo",
  "America/Bahia",
  "America/Fortaleza",
  "America/Belem",
  "America/Manaus",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Rio_Branco",
];

describe("ZONAS_HORARIAS", () => {
  it("tiene las 12 zonas del inventario, en su orden y sin repetidas", () => {
    expect(ZONAS_HORARIAS.map((z) => z.value)).toEqual(INVENTARIO);
    expect(new Set(ZONAS_HORARIAS.map((z) => z.value)).size).toBe(12);
  });

  it("cada zona es un IANA válido y tiene etiqueta", () => {
    for (const z of ZONAS_HORARIAS) {
      expect(isValidTimeZone(z.value)).toBe(true);
      expect(z.label).toBeTruthy();
    }
  });
});

describe("labelOfZona", () => {
  it("da la etiqueta de una zona de la lista", () => {
    expect(labelOfZona("America/Montevideo")).toBe("Montevideo (Uruguay)");
  });

  it("una zona fuera de la lista vuelve tal cual", () => {
    expect(labelOfZona("Europe/Madrid")).toBe("Europe/Madrid");
  });
});
