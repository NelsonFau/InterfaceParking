import { describe, expect, it } from "vitest";
import {
  defaultFiltros,
  emptyFiltros,
  hasObjeto,
  toApiParams,
  validateFiltros,
} from "../../../src/utils/trazabilidadFiltros.js";

const TZ = "America/Montevideo";
const validar = (parcial) => validateFiltros({ ...emptyFiltros(), ...parcial }, TZ);

describe("validateFiltros", () => {
  it("7: sin ids ni rango -> rango_obligatorio", () => {
    const r = validar({});
    expect(r.ok).toBe(false);
    expect(r.errors.rango.code).toBe("rango_obligatorio");
  });

  it("8: desde sin hasta, y al revés -> rango_incompleto en el campo que falta", () => {
    expect(validar({ desde: "2026-11-01" }).errors.hasta.code).toBe("rango_incompleto");
    expect(validar({ hasta: "2026-11-01" }).errors.desde.code).toBe("rango_incompleto");
    expect(validar({ ocupacionId: 12, desde: "2026-11-01" }).errors.hasta.code).toBe("rango_incompleto");
  });

  it("9: desde mayor que hasta -> rango_invertido en hasta", () => {
    const r = validar({ desde: "2026-11-10", hasta: "2026-11-09" });
    expect(r.errors.hasta.code).toBe("rango_invertido");
  });

  it("10: del 1 al 31 de octubre sin ids es válido (31 días menos 1 ms)", () => {
    expect(validar({ desde: "2026-10-01", hasta: "2026-10-31" }).ok).toBe(true);
  });

  it("11: del 1 de octubre al 1 de noviembre sin ids -> rango_excede", () => {
    const r = validar({ desde: "2026-10-01", hasta: "2026-11-01" });
    expect(r.errors.hasta.code).toBe("rango_excede");
    expect(r.errors.hasta.message).toBe("El rango máximo es de 31 días.");
  });

  it("12: con ocupacionId el límite de 31 días no rige", () => {
    expect(validar({ ocupacionId: 12, desde: "2026-08-01", hasta: "2026-10-30" }).ok).toBe(true);
    expect(validar({ pagoId: "40", desde: "2026-08-01", hasta: "2026-10-30" }).ok).toBe(true);
    expect(validar({ cajaSesionId: 7, desde: "2026-08-01", hasta: "2026-10-30" }).ok).toBe(true);
  });

  it("13: con pagoId y sin rango es válido", () => {
    expect(validar({ pagoId: 40 }).ok).toBe(true);
  });

  it("14: ids de 0, -1, 1.5 y texto -> id_invalido", () => {
    for (const valor of [0, -1, 1.5, "abc", "0", "1.5"]) {
      const r = validar({ ocupacionId: valor, desde: "2026-11-01", hasta: "2026-11-02" });
      expect(r.errors.ocupacionId.code, String(valor)).toBe("id_invalido");
    }
    expect(validar({ usuarioId: "x", desde: "2026-11-01", hasta: "2026-11-02" }).errors.usuarioId.code).toBe("id_invalido");
  });

  it("un usuarioId no cuenta como objeto: sigue exigiendo el rango", () => {
    expect(validar({ usuarioId: 3 }).errors.rango.code).toBe("rango_obligatorio");
    expect(hasObjeto({ usuarioId: 3 })).toBe(false);
    expect(hasObjeto({ pagoId: 3 })).toBe(true);
  });

  it("una fecha mal formada -> fecha_invalida", () => {
    expect(validar({ desde: "2026-02-30", hasta: "2026-03-01" }).errors.desde.code).toBe("fecha_invalida");
  });
});

describe("toApiParams", () => {
  it("15: ids como números, fuente como arreglo e instantes con Z", () => {
    const params = toApiParams(
      { ocupacionId: 12, fuente: ["PAGO"], desde: "2026-10-01", hasta: "2026-10-31" },
      TZ,
    );
    expect(params).toEqual({
      ocupacionId: 12,
      fuente: ["PAGO"],
      desde: "2026-10-01T03:00:00.000Z",
      hasta: "2026-11-01T02:59:59.999Z",
    });
  });

  it("15: sin fuentes no trae la clave fuente", () => {
    const params = toApiParams({ ...emptyFiltros(), desde: "2026-10-01", hasta: "2026-10-31" }, TZ);
    expect("fuente" in params).toBe(false);
    expect(Object.keys(params).sort()).toEqual(["desde", "hasta"]);
  });

  it("13: pagoId sin rango no trae desde ni hasta", () => {
    expect(toApiParams({ ...emptyFiltros(), pagoId: "40" }, TZ)).toEqual({ pagoId: 40 });
  });

  it("convierte los ids de texto y quita las fuentes repetidas", () => {
    const params = toApiParams({ ...emptyFiltros(), usuarioId: "3", fuente: ["pago", "PAGO", "XYZ"], pagoId: 1 }, TZ);
    expect(params).toEqual({ pagoId: 1, usuarioId: 3, fuente: ["PAGO"] });
  });
});

describe("defaultFiltros", () => {
  it("16: 7 días incluido hoy, con el día de la zona y no el de UTC", () => {
    const f = defaultFiltros(TZ, new Date("2026-11-11T01:30:00.000Z"));
    expect(f).toMatchObject({ hasta: "2026-11-10", desde: "2026-11-04" });
    expect(f.fuente).toEqual([]);
  });

  it("el rango por defecto pasa la validación", () => {
    expect(validateFiltros(defaultFiltros(TZ, new Date("2026-11-11T01:30:00.000Z")), TZ).ok).toBe(true);
  });
});
