import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAJA_ESTADO,
  accionesDeCaja,
  accionesDeSesion,
  buildReabrirBody,
  cajaFieldErrors,
  cajaVista,
  cierreVigente,
  diferenciaInfo,
  diferenciaVista,
  eventoCampos,
  fondoDifiere,
  rangoPorDefecto,
  shouldCloseActionAfterCaja,
  shouldCloseDetailAfterCaja,
  shouldReloadAfterCaja,
  validateAbrir,
  validateCerrar,
  validateRango,
} from "../../../src/utils/caja.js";

const ABIERTA = 1;
const CERRADA = 2;
const APERTURA = 1;
const CIERRE = 2;
const REAPERTURA = 3;
const DIARIA = 1;
const TURNO = 2;

const can = (...permisos) => (p) => permisos.includes(p);
const HOY = { hoy: "2026-11-19", aperturaDia: "2026-11-19" };
const sesion = { id: 5, estado: ABIERTA, fechaApertura: "2026-11-19T12:00:00Z", fondoInicial: 500 };

describe("cajaVista", () => {
  it("1: DIARIA sin sesión", () => {
    const v = cajaVista({ modo: DIARIA, sesion: null, fondoPropuesto: 500 }, HOY);
    expect(v).toMatchObject({ estado: CAJA_ESTADO.SIN_CAJA, modo: DIARIA, fondoPropuesto: 500 });
  });
  it("2: TURNO sin sesión", () => {
    expect(cajaVista({ modo: TURNO, sesion: null }, HOY)).toMatchObject({ estado: "SIN_CAJA", modo: TURNO });
  });
  it("3: DIARIA abierta de hoy", () => {
    expect(cajaVista({ modo: DIARIA, sesion }, HOY).estado).toBe("ABIERTA");
  });
  it("4: DIARIA abierta de un día anterior", () => {
    const v = cajaVista({ modo: DIARIA, sesion }, { hoy: "2026-11-19", aperturaDia: "2026-11-17" });
    expect(v.estado).toBe("ABIERTA_DIA_ANTERIOR");
    expect(v.diaAnterior).toBe("2026-11-17");
  });
  it("5: TURNO abierto de un día anterior no avisa", () => {
    const v = cajaVista({ modo: TURNO, sesion }, { hoy: "2026-11-19", aperturaDia: "2026-11-17" });
    expect(v.estado).toBe("ABIERTA");
    expect(v.diaAnterior).toBeNull();
  });
  it("6: sin datos válidos da null sin lanzar", () => {
    expect(cajaVista(null, HOY)).toBeNull();
    expect(cajaVista({}, HOY)).toBeNull();
    expect(cajaVista(undefined)).toBeNull();
  });
});

describe("accionesDeCaja", () => {
  it("7: sin caja y con caja.abrir", () => {
    expect(accionesDeCaja({ estado: "SIN_CAJA" }, can("caja.abrir"))).toMatchObject({ abrir: true, cerrar: false });
    expect(accionesDeCaja("SIN_CAJA", can("caja.abrir")).abrir).toBe(true);
  });
  it("8: abierta con cerrar y ver_esperado", () => {
    expect(accionesDeCaja({ estado: "ABIERTA" }, can("caja.cerrar", "caja.ver_esperado"))).toEqual({
      abrir: false,
      cerrar: true,
      verEsperado: true,
    });
    expect(accionesDeCaja({ estado: "ABIERTA_DIA_ANTERIOR" }, can("caja.cerrar")).cerrar).toBe(true);
  });
  it("9: AUDITOR solo mira", () => {
    for (const estado of ["SIN_CAJA", "ABIERTA"]) {
      expect(accionesDeCaja({ estado }, can("caja.ver"))).toEqual({ abrir: false, cerrar: false, verEsperado: false });
      expect(accionesDeCaja({ estado }, can("caja.ver", "caja.ver_esperado"))).toEqual({
        abrir: false,
        cerrar: false,
        verEsperado: true,
      });
    }
  });
});

describe("accionesDeSesion", () => {
  it("10: cerrada, sin otra abierta y con caja.reabrir", () => {
    const a = accionesDeSesion({ estado: CERRADA }, { hayAbierta: false }, can("caja.reabrir"));
    expect(a.reabrir).toBe(true);
    expect(a.cerrar).toBe(false);
  });
  it("11: con otra abierta no se reabre", () => {
    const todos = can("caja.reabrir", "caja.cerrar", "caja.ver_esperado", "auditoria.ver");
    expect(accionesDeSesion({ estado: CERRADA }, { hayAbierta: true }, todos).reabrir).toBe(false);
  });
  it("12: abierta con caja.cerrar", () => {
    const a = accionesDeSesion({ estado: ABIERTA }, { hayAbierta: true }, can("caja.cerrar", "caja.reabrir"));
    expect(a.cerrar).toBe(true);
    expect(a.reabrir).toBe(false);
  });
  it("13: sin caja.reabrir no se reabre", () => {
    const a = accionesDeSesion({ estado: CERRADA }, { hayAbierta: false }, can("caja.cerrar", "caja.abrir"));
    expect(a.reabrir).toBe(false);
  });
  it("ver trazabilidad solo con auditoria.ver; acepta el estado suelto", () => {
    expect(accionesDeSesion(CERRADA, {}, can("auditoria.ver")).trazabilidad).toBe(true);
    expect(accionesDeSesion(CERRADA, {}, can()).trazabilidad).toBe(false);
  });
});

describe("fondoDifiere y diferenciaVista", () => {
  it("14: compara en centavos", () => {
    expect(fondoDifiere("500.00", 500)).toBe(false);
    expect(fondoDifiere("500", 500)).toBe(false);
    expect(fondoDifiere("500.50", 500)).toBe(true);
    expect(fondoDifiere("0", null)).toBe(false);
    expect(fondoDifiere("abc", 500)).toBe(false);
  });
  it("15: diferencia sin coma flotante", () => {
    expect(diferenciaVista("1050.50", 1000)).toBe(50.5);
    expect(diferenciaVista("990", 1000)).toBe(-10);
    expect(diferenciaVista("1000", 1000)).toBe(0);
    expect(diferenciaVista("0.3", 0.1 + 0.2)).toBe(0);
  });
  it("16: sin dato o inválido da null", () => {
    expect(diferenciaVista("", 1000)).toBeNull();
    expect(diferenciaVista("abc", 1000)).toBeNull();
    expect(diferenciaVista("100", null)).toBeNull();
  });
});

describe("diferenciaInfo", () => {
  it("sobra, falta, cero y sin dato", () => {
    expect(diferenciaInfo(50.5).tipo).toBe("sobra");
    expect(diferenciaInfo(-10).tipo).toBe("falta");
    expect(diferenciaInfo(0).label).toBe("sin diferencia");
    expect(diferenciaInfo(0.001).tipo).toBe("cero");
    expect(diferenciaInfo(null)).toBeNull();
    expect(diferenciaInfo("abc")).toBeNull();
  });
});

describe("validateAbrir", () => {
  it("17: ok con el cuerpo recortado", () => {
    expect(validateAbrir({ fondoInicial: "500", observacion: " cambié el fondo " })).toEqual({
      ok: true,
      body: { fondoInicial: 500, observacion: "cambié el fondo" },
    });
  });
  it("18: el 0 es válido y la observación vacía no se manda", () => {
    expect(validateAbrir({ fondoInicial: "0", observacion: "" })).toEqual({ ok: true, body: { fondoInicial: 0 } });
  });
  it("19: formato y tope del fondo", () => {
    for (const v of ["", "-1", "12.345", "abc", "10000000.01"]) {
      const r = validateAbrir({ fondoInicial: v });
      expect(r.ok).toBe(false);
      expect(r.errors.fondoInicial).toBeTruthy();
    }
    expect(validateAbrir({ fondoInicial: "10000000" }).ok).toBe(true);
  });
  it("20: largo de la observación", () => {
    expect(validateAbrir({ fondoInicial: "1", observacion: "a".repeat(501) }).errors.observacion).toBeTruthy();
    expect(validateAbrir({ fondoInicial: "1", observacion: "a".repeat(500) }).ok).toBe(true);
  });
  it("21: no valida contra el backend", () => {
    expect(validateAbrir({ fondoInicial: "999" }).ok).toBe(true);
  });
});

describe("validateCerrar", () => {
  it("22: ok con el cuerpo", () => {
    expect(validateCerrar({ efectivoContado: "1050.50", fondoSiguiente: "500", observacion: "" })).toEqual({
      ok: true,
      body: { efectivoContado: 1050.5, fondoSiguiente: 500 },
    });
  });
  it("23: error en cada campo inválido", () => {
    for (const v of ["", "-1", "1.234"]) {
      const r = validateCerrar({ efectivoContado: v, fondoSiguiente: v });
      expect(r.ok).toBe(false);
      expect(r.errors.efectivoContado).toBeTruthy();
      expect(r.errors.fondoSiguiente).toBeTruthy();
    }
    const solo = validateCerrar({ efectivoContado: "10", fondoSiguiente: "x" });
    expect(Object.keys(solo.errors)).toEqual(["fondoSiguiente"]);
  });
  it("24: no valida fondo siguiente contra lo contado", () => {
    expect(validateCerrar({ efectivoContado: "100", fondoSiguiente: "500" }).ok).toBe(true);
  });
});

describe("buildReabrirBody", () => {
  it("25: motivo con trim, obligatorio y con tope", () => {
    expect(buildReabrirBody(" Error de conteo ")).toEqual({ ok: true, body: { motivo: "Error de conteo" } });
    expect(buildReabrirBody("")).toEqual({ ok: false, message: "Contanos el motivo" });
    expect(buildReabrirBody("   ")).toEqual({ ok: false, message: "Contanos el motivo" });
    expect(buildReabrirBody("a".repeat(251))).toEqual({
      ok: false,
      message: "El motivo no puede superar 250 caracteres",
    });
    expect(buildReabrirBody("a".repeat(250)).ok).toBe(true);
  });
});

describe("rangoPorDefecto y validateRango", () => {
  it("26: 30 días contando hoy", () => {
    expect(rangoPorDefecto("2026-11-19")).toEqual({ desde: "2026-10-21", hasta: "2026-11-19" });
  });
  it("27: rango válido tal cual", () => {
    expect(validateRango({ desde: "2026-11-01", hasta: "2026-11-19" })).toEqual({
      ok: true,
      desde: "2026-11-01",
      hasta: "2026-11-19",
    });
    expect(validateRango({ desde: "2026-11-19", hasta: "2026-11-19" }).ok).toBe(true);
  });
  it("28: invertido, vacío e inválido", () => {
    expect(validateRango({ desde: "2026-11-20", hasta: "2026-11-19" }).errors.desde).toBe(
      "La fecha 'Desde' no puede ser posterior a 'Hasta'",
    );
    expect(validateRango({ desde: "", hasta: "2026-11-19" }).errors).toEqual({ desde: "Elegí la fecha" });
    expect(validateRango({ desde: "2026-11-01", hasta: "" }).errors).toEqual({ hasta: "Elegí la fecha" });
    expect(validateRango({ desde: "2026-13-40", hasta: "2026-11-19" }).errors.desde).toBeTruthy();
  });
  it("29: no valida el tope de 366 días", () => {
    expect(validateRango({ desde: "2025-10-01", hasta: "2026-11-05" }).ok).toBe(true);
  });
});

describe("cierreVigente", () => {
  it("30: el último CIERRE", () => {
    const h = [
      { tipo: APERTURA },
      { tipo: CIERRE, efectivoContado: 100 },
      { tipo: REAPERTURA },
      { tipo: CIERRE, efectivoContado: 120 },
    ];
    expect(cierreVigente(h).efectivoContado).toBe(120);
  });
  it("31: sin cierre da null", () => {
    expect(cierreVigente([{ tipo: APERTURA }])).toBeNull();
    expect(cierreVigente([])).toBeNull();
    expect(cierreVigente(undefined)).toBeNull();
  });
});

describe("eventoCampos", () => {
  it("32: apertura con fondo distinto", () => {
    const r = eventoCampos({ tipo: APERTURA, fondoDeclarado: 600, fondoQueQuedo: 500 });
    expect(r.campos.map((c) => c.key)).toEqual(["fondoDeclarado", "fondoQueQuedo"]);
    expect(r.distinto).toBe(true);
  });
  it("33: igual o automática no avisa", () => {
    expect(eventoCampos({ tipo: APERTURA, fondoDeclarado: 500, fondoQueQuedo: 500 }).distinto).toBe(false);
    const auto = eventoCampos({ tipo: APERTURA, automatica: true, fondoDeclarado: 500, fondoQueQuedo: 500 });
    expect(auto.distinto).toBe(false);
  });
  it("34: cierre y reapertura", () => {
    const c = eventoCampos({
      tipo: CIERRE,
      efectivoContado: 1,
      efectivoEsperado: 2,
      diferencia: -1,
      fondoSiguiente: 0,
      observacion: " falta ",
    });
    expect(c.campos.map((x) => x.key)).toEqual(["efectivoContado", "efectivoEsperado", "diferencia", "fondoSiguiente"]);
    expect(c.campos.find((x) => x.key === "fondoSiguiente").value).toBe(0);
    expect(c.observacion).toBe("falta");
    const r = eventoCampos({ tipo: REAPERTURA, motivo: "Error" });
    expect(r.campos).toEqual([{ key: "motivo", label: "Motivo", value: "Error", money: false }]);
  });
});

describe("cajaFieldErrors", () => {
  it("35: mapea los campos y deja lo demás en general", () => {
    const r = cajaFieldErrors({
      errors: { Observacion: ["a"], FondoSiguiente: ["b"], Hasta: ["c"], Otro: ["d"] },
    });
    expect(r.fields).toEqual({ observacion: "a", fondoSiguiente: "b", hasta: "c" });
    expect(r.general).toEqual(["d"]);
  });
  it("36: sin errors", () => {
    for (const e of [{}, { errors: null }, { errors: {} }, null, undefined]) {
      expect(cajaFieldErrors(e)).toEqual({ fields: {}, general: [] });
    }
  });
});

describe("qué hacer por code", () => {
  const estadoViejo = ["caja_ya_abierta", "caja_cerrada", "caja_no_es_la_ultima", "caja_sesion_no_encontrada"];
  const otros = [
    "datos_invalidos",
    "sin_permiso",
    "caja_dia_anterior_abierta",
    "sin_conexion",
    "servidor_ocupado",
    "otro",
    undefined,
  ];
  it("37: recarga", () => {
    for (const c of estadoViejo) expect(shouldReloadAfterCaja(c)).toBe(true);
    for (const c of otros) expect(shouldReloadAfterCaja(c)).toBe(false);
  });
  it("38: cierra la acción", () => {
    for (const c of estadoViejo) expect(shouldCloseActionAfterCaja(c)).toBe(true);
    for (const c of otros) expect(shouldCloseActionAfterCaja(c)).toBe(false);
  });
  it("cierra el detalle solo si la sesión no existe", () => {
    expect(shouldCloseDetailAfterCaja("caja_sesion_no_encontrada")).toBe(true);
    expect(shouldCloseDetailAfterCaja("caja_cerrada")).toBe(false);
  });
});

describe("pureza", () => {
  it("41: sin Date ni toLocale", () => {
    const src = readFileSync(new URL("../../../src/utils/caja.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/getHours|toLocale|toISOString|new Date/);
  });
});
