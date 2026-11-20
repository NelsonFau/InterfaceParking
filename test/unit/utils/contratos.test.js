import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  accionesDeContrato,
  bajaAviso,
  buildQuitarBajaBody,
  candidatosMensuales,
  contratoFieldErrors,
  defaultVigenteDesde,
  motivoAplicarAjuste,
  resultadoLote,
  shouldCloseActionAfterContrato,
  shouldReloadAfterContrato,
  validateAjusteMasivo,
  validateAjustePrecio,
  validateFin,
} from "../../../src/utils/contratos.js";
import { formatMoney } from "../../../src/utils/formato.js";

const NOW = new Date("2026-11-19T15:00:00.000Z");
const PAST = "2026-11-01T10:00:00.000Z";
const FUTURE = "2027-01-01T10:00:00.000Z";
const can = (...permisos) => (p) => permisos.includes(p);
const TODOS = can("tarifas.editar", "ocupaciones.finalizar", "ocupaciones.ver");
const mes = (extra = {}) => ({ tipo: 3, estado: 1, estadoCalculado: 1, inicio: PAST, fin: null, ...extra });
const none = { ajustarPrecio: false, programarBaja: false, cambiarFin: false, quitarBaja: false };

describe("accionesDeContrato", () => {
  it("MES en curso sin fin", () => {
    expect(accionesDeContrato(mes(), NOW, TODOS)).toEqual({
      ajustarPrecio: true, programarBaja: true, cambiarFin: false, quitarBaja: false,
    });
  });
  it("MES en curso con fin", () => {
    expect(accionesDeContrato(mes({ fin: FUTURE }), NOW, TODOS)).toEqual({
      ajustarPrecio: true, programarBaja: false, cambiarFin: true, quitarBaja: true,
    });
  });
  it("solo ocupaciones.finalizar", () => {
    expect(accionesDeContrato(mes(), NOW, can("ocupaciones.finalizar"))).toEqual({
      ajustarPrecio: false, programarBaja: true, cambiarFin: false, quitarBaja: false,
    });
  });
  it("solo tarifas.editar", () => {
    expect(accionesDeContrato(mes(), NOW, can("tarifas.editar"))).toEqual({ ...none, ajustarPrecio: true });
  });
  it("solo ocupaciones.ver", () => {
    expect(accionesDeContrato(mes(), NOW, can("ocupaciones.ver"))).toEqual(none);
  });
  it("reserva y vencida se ofrecen", () => {
    expect(accionesDeContrato(mes({ inicio: FUTURE }), NOW, TODOS).ajustarPrecio).toBe(true);
    expect(accionesDeContrato(mes({ estadoCalculado: 2, fin: PAST }), NOW, TODOS).cambiarFin).toBe(true);
  });
  it("finalizada y cancelada no ofrecen nada", () => {
    expect(accionesDeContrato(mes({ estado: 4, estadoCalculado: 4 }), NOW, TODOS)).toEqual(none);
    expect(accionesDeContrato(mes({ estado: 3, estadoCalculado: 3 }), NOW, TODOS)).toEqual(none);
  });
  it("HORA y DIA no son mensuales", () => {
    expect(accionesDeContrato(mes({ tipo: 1 }), NOW, TODOS)).toEqual(none);
    expect(accionesDeContrato(mes({ tipo: 2 }), NOW, TODOS)).toEqual(none);
  });
});

describe("defaultVigenteDesde", () => {
  it("es mañana", () => {
    expect(defaultVigenteDesde("2026-11-19")).toBe("2026-11-20");
    expect(defaultVigenteDesde("2026-12-31")).toBe("2027-01-01");
  });
});

describe("validateAjustePrecio", () => {
  const base = { vigenteDesde: "2026-12-01", precioUnitario: "1500", motivo: " Ajuste anual " };
  it("ok con cuerpo normalizado", () => {
    expect(validateAjustePrecio(base)).toEqual({
      ok: true,
      body: { vigenteDesde: "2026-12-01", precioUnitario: 1500, motivo: "Ajuste anual" },
    });
  });
  it("decimales", () => {
    expect(validateAjustePrecio({ ...base, precioUnitario: "1500.5" }).body.precioUnitario).toBe(1500.5);
    expect(validateAjustePrecio({ ...base, precioUnitario: " 99.99 " }).body.precioUnitario).toBe(99.99);
  });
  it("precios inválidos", () => {
    for (const p of ["", "0", "-1", "12.345", "abc", "10000000.01"]) {
      const r = validateAjustePrecio({ ...base, precioUnitario: p });
      expect(r.ok, p).toBe(false);
      expect(r.errors.precioUnitario, p).toBeTruthy();
    }
    expect(validateAjustePrecio({ ...base, precioUnitario: "10000000" }).ok).toBe(true);
  });
  it("fecha inválida", () => {
    for (const v of ["", "2026-13-40"]) {
      expect(validateAjustePrecio({ ...base, vigenteDesde: v }).errors.vigenteDesde).toBe("Elegí la fecha");
    }
  });
  it("motivo", () => {
    expect(validateAjustePrecio({ ...base, motivo: "" }).errors.motivo).toBe("Contanos el motivo");
    expect(validateAjustePrecio({ ...base, motivo: "   " }).errors.motivo).toBe("Contanos el motivo");
    expect(validateAjustePrecio({ ...base, motivo: "x".repeat(251) }).errors.motivo).toBe(
      "El motivo no puede superar 250 caracteres"
    );
    expect(validateAjustePrecio({ ...base, motivo: "x".repeat(250) }).ok).toBe(true);
  });
  it("no valida contra el backend (fecha de hoy o anterior)", () => {
    expect(validateAjustePrecio({ ...base, vigenteDesde: "2020-01-01" }).ok).toBe(true);
  });
});

describe("validateAjusteMasivo", () => {
  const base = { vigenteDesde: "2026-12-01", porcentaje: "10", motivo: "Inflación" };
  it("ok sin excluir", () => {
    expect(validateAjusteMasivo(base)).toEqual({
      ok: true,
      body: { vigenteDesde: "2026-12-01", porcentaje: 10, motivo: "Inflación" },
    });
  });
  it("excluir", () => {
    expect(validateAjusteMasivo({ ...base, excluir: [5, 9] }).body.excluir).toEqual([5, 9]);
    expect("excluir" in validateAjusteMasivo({ ...base, excluir: [] }).body).toBe(false);
  });
  it("porcentajes válidos", () => {
    for (const p of ["-50", "100", "0", "12.5", "-0.01"]) expect(validateAjusteMasivo({ ...base, porcentaje: p }).ok, p).toBe(true);
  });
  it("porcentajes inválidos", () => {
    for (const p of ["-50.01", "100.01", "1.234", "", "abc", "1e2"]) {
      const r = validateAjusteMasivo({ ...base, porcentaje: p });
      expect(r.ok, p).toBe(false);
      expect(r.errors.porcentaje, p).toBeTruthy();
    }
  });
  it("no valida que deje un precio en cero", () => {
    expect(validateAjusteMasivo({ ...base, porcentaje: "-50" }).ok).toBe(true);
  });
});

describe("validateFin", () => {
  const ok = () => ({ ok: true, instant: "2027-03-31T21:00:00.000Z" });
  it("ok", () => {
    expect(validateFin({ fin: "2027-03-31T18:00" }, { localInputToInstant: ok })).toEqual({
      ok: true,
      body: { fin: "2027-03-31T21:00:00.000Z" },
    });
  });
  it("vacío o convertidor con error", () => {
    expect(validateFin({ fin: "" }, { localInputToInstant: ok }).errors.fin).toBe("Elegí la fecha y la hora de fin");
    const r = validateFin({ fin: "2027-03-14T02:30" }, { localInputToInstant: () => ({ ok: false, message: "Hora inexistente" }) });
    expect(r.errors.fin).toBe("Hora inexistente");
  });
  it("no valida contra el backend (fin pasado)", () => {
    expect(validateFin({ fin: "2001-01-01T00:00" }, { localInputToInstant: ok }).ok).toBe(true);
  });
});

describe("buildQuitarBajaBody", () => {
  it("lleva la clave fin con null", () => {
    const b = buildQuitarBajaBody();
    expect(b).toEqual({ fin: null });
    expect("fin" in b).toBe(true);
  });
});

describe("candidatosMensuales", () => {
  it("deja solo los MES ACTIVA, en orden, sin mutar", () => {
    const lista = [
      { id: 1, tipo: 1, estado: 1 },
      { id: 2, tipo: 3, estado: 1 },
      { id: 3, tipo: 2, estado: 1 },
      { id: 4, tipo: 3, estado: 3 },
      { id: 5, tipo: 3, estado: 1 },
    ];
    const copia = [...lista];
    expect(candidatosMensuales(lista).map((o) => o.id)).toEqual([2, 5]);
    expect(lista).toEqual(copia);
  });
  it("vacío, undefined y null", () => {
    expect(candidatosMensuales([])).toEqual([]);
    expect(candidatosMensuales(undefined)).toEqual([]);
    expect(candidatosMensuales(null)).toEqual([]);
  });
});

describe("resultadoLote", () => {
  it("ordena por ocupacionId sin mutar", () => {
    const B = { id: 0, ocupacionId: 9 };
    const A = { id: 0, ocupacionId: 5 };
    const contratos = [B, A];
    expect(resultadoLote({ cantidad: 2, contratos })).toEqual({ cantidad: 2, vacio: false, contratos: [A, B] });
    expect(contratos).toEqual([B, A]);
  });
  it("sin contratos es vacío", () => {
    expect(resultadoLote({ cantidad: 0, contratos: [] }).vacio).toBe(true);
  });
});

describe("bajaAviso", () => {
  it("avisa con saldo a favor", () => {
    const a = bajaAviso(1200);
    expect(a).toContain(formatMoney(1200));
    expect(a).toContain("Quedó un saldo a favor de");
    expect(bajaAviso(0.5)).toContain(formatMoney(0.5));
  });
  it("sin saldo no avisa", () => {
    expect(bajaAviso(0)).toBeNull();
    expect(bajaAviso(null)).toBeNull();
  });
});

describe("contratoFieldErrors", () => {
  it("mapea los campos y deja el resto en general", () => {
    const r = contratoFieldErrors({
      errors: { VigenteDesde: ["a"], PrecioUnitario: ["b"], Porcentaje: ["c"], Fin: ["d"], Motivo: ["e"], Otro: ["f"] },
    });
    expect(r.fields).toEqual({ vigenteDesde: "a", precioUnitario: "b", porcentaje: "c", fin: "d", motivo: "e" });
    expect(r.general).toEqual(["f"]);
  });
  it("sin errors", () => {
    for (const e of [{}, { errors: null }, { errors: {} }]) expect(contratoFieldErrors(e)).toEqual({ fields: {}, general: [] });
  });
});

describe("códigos de error", () => {
  const STALE = ["ocupacion_no_encontrada", "ocupacion_no_mensual", "ocupacion_no_activa"];
  it("shouldReloadAfterContrato", () => {
    for (const c of STALE) expect(shouldReloadAfterContrato(c)).toBe(true);
    for (const c of ["datos_invalidos", "cochera_no_disponible", "sin_permiso", "sin_conexion", "raro", undefined]) {
      expect(shouldReloadAfterContrato(c)).toBe(false);
    }
  });
  it("shouldCloseActionAfterContrato", () => {
    for (const c of STALE) expect(shouldCloseActionAfterContrato(c)).toBe(true);
    for (const c of ["cochera_no_disponible", "datos_invalidos", "sin_permiso", "servidor_ocupado", undefined]) {
      expect(shouldCloseActionAfterContrato(c)).toBe(false);
    }
  });
});

describe("motivoAplicarAjuste", () => {
  it("lista ok y confirmado da null", () => {
    expect(motivoAplicarAjuste({ listaStatus: "ok", entiendo: true })).toBeNull();
  });
  it("lista con error da el texto de la lista", () => {
    expect(motivoAplicarAjuste({ listaStatus: "error", entiendo: true })).toBe("No se pudo cargar la lista; volvé al paso anterior");
    expect(motivoAplicarAjuste({ listaStatus: "error", entiendo: false })).toBe("No se pudo cargar la lista; volvé al paso anterior");
  });
  it("lista cargando (o sin pedir) no tiene motivo", () => {
    expect(motivoAplicarAjuste({ listaStatus: "loading", entiendo: false })).toBeNull();
    expect(motivoAplicarAjuste({ listaStatus: undefined, entiendo: false })).toBeNull();
  });
  it("lista ok sin confirmar da el texto de la confirmación", () => {
    expect(motivoAplicarAjuste({ listaStatus: "ok", entiendo: false })).toBe("Marcá «Entiendo que el ajuste no se puede deshacer»");
  });
});

describe("contratos.js no usa fechas del sistema", () => {
  it("sin getHours, toLocale, toISOString ni new Date", () => {
    const src = readFileSync(new URL("../../../src/utils/contratos.js", import.meta.url), "utf8");
    for (const t of ["getHours", "toLocale", "toISOString", "new Date"]) expect(src.includes(t), t).toBe(false);
  });
});
