import { describe, expect, it } from "vitest";
import {
  MAX_PRECIO,
  buildUpdateBody,
  shouldReloadAfter,
  summarizeChange,
  tarifaEstado,
  validateTarifaForm,
} from "../../../src/utils/tarifas.js";

const TODAY = "2026-11-18";

describe("tarifaEstado", () => {
  it("1: vigente true -> vigente", () => {
    expect(tarifaEstado({ vigente: true, vigenteDesde: "2026-10-01" }, TODAY)).toBe("vigente");
  });

  it("2: no vigente y desde futuro -> programada", () => {
    expect(tarifaEstado({ vigente: false, vigenteDesde: "2026-12-01" }, TODAY)).toBe("programada");
  });

  it("3: no vigente y desde pasado -> finalizada", () => {
    const t = { vigente: false, vigenteDesde: "2026-10-01", vigenteHasta: "2026-11-17" };
    expect(tarifaEstado(t, TODAY)).toBe("finalizada");
  });

  it("4: límite, desde == hoy y no vigente -> finalizada (solo fija el `>` estricto)", () => {
    expect(tarifaEstado({ vigente: false, vigenteDesde: "2026-11-18" }, TODAY)).toBe("finalizada");
  });
});

describe("validateTarifaForm", () => {
  const run = (precio, fecha = "") => validateTarifaForm({ precio, fecha }, TODAY);

  it("5: precios válidos dan nuevoPrecio numérico", () => {
    expect(run("120")).toMatchObject({ ok: true, nuevoPrecio: 120 });
    expect(run("120.5")).toMatchObject({ ok: true, nuevoPrecio: 120.5 });
    expect(run("120.50")).toMatchObject({ ok: true, nuevoPrecio: 120.5 });
    expect(run(" 120 ")).toMatchObject({ ok: true, nuevoPrecio: 120 });
  });

  it("6: precios inválidos dan el error de precio que corresponde", () => {
    const formato = "Ingresá un precio con hasta 2 decimales";
    for (const p of ["", "-5", "12.345", "1e3", "abc", "120."]) {
      expect(run(p)).toEqual({ ok: false, errors: { precio: formato } });
    }
    for (const p of ["0", "0.00"]) {
      expect(run(p)).toEqual({ ok: false, errors: { precio: "El precio debe ser mayor a 0" } });
    }
  });

  it("7: el tope es inclusivo", () => {
    expect(MAX_PRECIO).toBe(10_000_000);
    expect(run("10000000").ok).toBe(true);
    expect(run("10000000.00").ok).toBe(true);
    expect(run("10000000.01")).toEqual({
      ok: false,
      errors: { precio: "El precio no puede superar $ 10.000.000" },
    });
  });

  it("8: fecha vacía -> ok con vigenteDesde null", () => {
    expect(run("120", "")).toEqual({ ok: true, nuevoPrecio: 120, vigenteDesde: null });
  });

  it("9: hoy y futuro pasan; el pasado no", () => {
    expect(run("120", "2026-11-18")).toMatchObject({ ok: true, vigenteDesde: "2026-11-18" });
    expect(run("120", "2026-12-01")).toMatchObject({ ok: true, vigenteDesde: "2026-12-01" });
    expect(run("120", "2026-11-17")).toEqual({
      ok: false,
      errors: { fecha: "La fecha no puede ser anterior a hoy" },
    });
  });

  it("10: fecha inexistente o con otro formato -> no es válida", () => {
    for (const f of ["2026-02-30", "18/11/2026"]) {
      expect(run("120", f)).toEqual({ ok: false, errors: { fecha: "La fecha no es válida" } });
    }
  });

  it("informa precio y fecha a la vez", () => {
    const r = run("0", "2026-01-01");
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(["fecha", "precio"]);
  });
});

describe("buildUpdateBody", () => {
  it("11: sin fecha omite la clave vigenteDesde", () => {
    const body = buildUpdateBody(1, { nuevoPrecio: 120, vigenteDesde: null });
    expect(body).toEqual({ tipo: 1, nuevoPrecio: 120 });
    expect("vigenteDesde" in body).toBe(false);
  });

  it("12: con fecha la manda tal cual", () => {
    expect(buildUpdateBody(1, { nuevoPrecio: 120, vigenteDesde: "2026-12-01" })).toEqual({
      tipo: 1,
      nuevoPrecio: 120,
      vigenteDesde: "2026-12-01",
    });
  });
});

describe("summarizeChange", () => {
  const vigente = { id: 1, tipo: 1, precio: 100, vigenteDesde: "2026-10-01", vigente: true };
  const programada = (id, desde, precio = 110) => ({
    id,
    tipo: 1,
    precio,
    vigenteDesde: desde,
    vigente: false,
  });

  it("13: sin fecha -> fecha efectiva hoy y sin reemplazo", () => {
    const r = summarizeChange({ vigente, nuevoPrecio: 120, vigenteDesde: null, historial: [vigente], today: TODAY });
    expect(r).toEqual({ precioActual: 100, precioNuevo: 120, fechaEfectiva: TODAY, reemplaza: null });
  });

  it("14: fecha futura con una programada en esa fecha -> reemplaza", () => {
    const p = programada(2, "2026-12-01");
    const r = summarizeChange({
      vigente,
      nuevoPrecio: 120,
      vigenteDesde: "2026-12-01",
      historial: [p, vigente],
      today: TODAY,
    });
    expect(r.reemplaza).toBe(p);
    expect(r.fechaEfectiva).toBe("2026-12-01");
  });

  it("15: fecha futura con programadas en otras fechas -> sin reemplazo", () => {
    const r = summarizeChange({
      vigente,
      nuevoPrecio: 120,
      vigenteDesde: "2026-12-01",
      historial: [programada(2, "2026-12-15"), programada(3, "2026-11-25"), vigente],
      today: TODAY,
    });
    expect(r.reemplaza).toBeNull();
  });

  it("16: sin vigente -> precio actual null", () => {
    const r = summarizeChange({ vigente: null, nuevoPrecio: 120, vigenteDesde: null, historial: [], today: TODAY });
    expect(r.precioActual).toBeNull();
  });

  it("con hoy no hay reemplazo aunque exista una tarifa que empieza hoy (da 409 en el backend)", () => {
    const hoy = { id: 9, tipo: 1, precio: 100, vigenteDesde: TODAY, vigente: true };
    const r = summarizeChange({ vigente: hoy, nuevoPrecio: 120, vigenteDesde: null, historial: [hoy], today: TODAY });
    expect(r.reemplaza).toBeNull();
  });
});

describe("shouldReloadAfter", () => {
  it("17: recarga en los tres códigos de estado viejo", () => {
    for (const c of ["tarifa_ya_vigente", "tarifa_no_encontrada", "tarifa_modificada"]) {
      expect(shouldReloadAfter(c)).toBe(true);
    }
  });

  it("17: no recarga en el resto", () => {
    for (const c of ["datos_invalidos", "sin_permiso", "tarifa_no_configurada", "codigo_raro", undefined, null]) {
      expect(shouldReloadAfter(c)).toBe(false);
    }
  });
});
