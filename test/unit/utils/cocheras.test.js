import { describe, expect, it } from "vitest";
import { EstadoCochera } from "../../../src/constants/enums.js";
import {
  MAX_ALTA_RANGO,
  accionesDeEstado,
  buildCreateBody,
  buildEstadoBody,
  buildUpdateBody,
  parseRango,
  motivoCrearCocheras,
  previewRango,
  shouldCloseDetailAfter,
  shouldReloadAfter,
  tarjetaInfo,
  validateBloqueo,
  validateEditCochera,
  vencimientoTexto,
} from "../../../src/utils/cocheras.js";

const NOW = new Date("2026-11-18T15:00:00.000Z");
const existentes = [12, 13, 40];

const MSG_DESDE = "Ingresá el número de la primera cochera";
const MSG_RANGO = "Los números van del 1 al 999";

describe("parseRango", () => {
  it("1: rango válido", () => {
    expect(parseRango("10", "25")).toEqual({ ok: true, desde: 10, hasta: 25, cantidad: 16 });
  });

  it("2: hasta vacío o igual a desde es una sola cochera", () => {
    expect(parseRango(" 7 ", "")).toMatchObject({ ok: true, desde: 7, hasta: 7, cantidad: 1 });
    expect(parseRango("7", "7")).toMatchObject({ ok: true, cantidad: 1 });
  });

  it("3: desde vacío o no numérico", () => {
    expect(parseRango("", "")).toEqual({ ok: false, error: MSG_DESDE });
    expect(parseRango("abc", "")).toEqual({ ok: false, error: MSG_DESDE });
  });

  it("4: fuera de 1 a 999", () => {
    expect(parseRango("0", "5")).toEqual({ ok: false, error: MSG_RANGO });
    expect(parseRango("1000", "")).toEqual({ ok: false, error: MSG_RANGO });
    expect(parseRango("5", "1000")).toEqual({ ok: false, error: MSG_RANGO });
  });

  it("5: decimales, notación científica y negativos son error", () => {
    for (const v of ["1.5", "1e2", "-3"]) expect(parseRango(v, "").ok).toBe(false);
    expect(parseRango("5", "abc")).toEqual({ ok: false, error: MSG_RANGO });
  });

  it("6: hasta menor que desde", () => {
    expect(parseRango("5", "3")).toEqual({
      ok: false,
      error: 'El "Hasta" no puede ser menor que el "Desde"',
    });
  });

  it("7: tope de 100 por alta", () => {
    expect(MAX_ALTA_RANGO).toBe(100);
    expect(parseRango("1", "100")).toMatchObject({ ok: true, cantidad: 100 });
    expect(parseRango("1", "101")).toEqual({ ok: false, error: "Podés crear hasta 100 cocheras por vez" });
  });
});

describe("previewRango", () => {
  it("8: con choques no es creable y los lista", () => {
    const p = previewRango("10", "15", existentes);
    expect(p.ok).toBe(false);
    expect(p.choques).toEqual([12, 13]);
    expect(p.texto).toBe("Ya existen las cocheras: 12, 13");
  });

  it("9: rango libre", () => {
    const p = previewRango("10", "11", existentes);
    expect(p.ok).toBe(true);
    expect(p.choques).toEqual([]);
    expect(p.texto).toContain("2 cocheras");
    expect(p.texto).toContain("del 10 al 11");
  });

  it("9b: una sola cochera", () => {
    expect(previewRango("10", "", existentes).texto).toBe("Se va a crear la cochera #10");
  });

  it("10: lista a lo sumo 10 choques y dice cuántos más", () => {
    const todas = Array.from({ length: 30 }, (_, i) => i + 1);
    const p = previewRango("1", "30", todas);
    expect(p.choques).toHaveLength(30);
    expect(p.texto).toContain("1, 2, 3, 4, 5, 6, 7, 8, 9, 10");
    expect(p.texto).not.toContain("11,");
    expect(p.texto).toContain("y 20 más");
  });

  it("con error de rango devuelve el mensaje y no es ok", () => {
    const p = previewRango("5", "3", existentes);
    expect(p.ok).toBe(false);
    expect(p.error).toBe('El "Hasta" no puede ser menor que el "Desde"');
  });
});

describe("buildCreateBody", () => {
  it("11: con rango manda desde y hasta; con uno solo, sin la clave hasta", () => {
    expect(buildCreateBody(10, 25)).toEqual({ desde: 10, hasta: 25 });
    const igual = buildCreateBody(10, 10);
    expect(igual).toEqual({ desde: 10 });
    expect("hasta" in igual).toBe(false);
    const sin = buildCreateBody(10);
    expect(sin).toEqual({ desde: 10 });
    expect("hasta" in sin).toBe(false);
  });
});

describe("validateEditCochera", () => {
  it("12: el mismo número propio no es choque", () => {
    expect(validateEditCochera({ numero: "12", nota: "x" }, { actual: 12, existentes })).toEqual({
      ok: true,
      numero: 12,
      nota: "x",
    });
  });

  it("13: el número de otra cochera es error", () => {
    const r = validateEditCochera({ numero: "13", nota: "" }, { actual: 12, existentes });
    expect(r.ok).toBe(false);
    expect(r.errors.numero).toBe("Ya existe la cochera #13");
    expect(r.errors.nota).toBeUndefined();
  });

  it("14: número fuera de rango y nota larga, cada uno en su campo", () => {
    for (const numero of ["", "0", "1000"]) {
      const r = validateEditCochera({ numero, nota: "" }, { actual: 12, existentes });
      expect(r.ok).toBe(false);
      expect(r.errors.numero).toBe(MSG_RANGO);
    }
    const r = validateEditCochera({ numero: "5", nota: "a".repeat(301) }, { actual: 12, existentes });
    expect(r.ok).toBe(false);
    expect(r.errors.nota).toBe("La nota no puede superar 300 caracteres");
    expect(r.errors.numero).toBeUndefined();
    expect(validateEditCochera({ numero: "5", nota: "a".repeat(300) }, { actual: 12, existentes }).ok).toBe(true);
  });

  it("nota vacía se devuelve como null", () => {
    expect(validateEditCochera({ numero: "5", nota: "  " }, { actual: 12, existentes })).toMatchObject({
      ok: true,
      nota: null,
    });
  });
});

describe("buildUpdateBody", () => {
  it("15: nota recortada o null, nunca vacía", () => {
    expect(buildUpdateBody(12, " reparada ")).toEqual({ numero: 12, nota: "reparada" });
    expect(buildUpdateBody(12, "   ")).toEqual({ numero: 12, nota: null });
  });
});

describe("validateBloqueo", () => {
  it("16: motivo vacío o demasiado largo", () => {
    expect(validateBloqueo("")).toEqual({ ok: false, error: "Contanos el motivo del bloqueo" });
    expect(validateBloqueo("   ")).toEqual({ ok: false, error: "Contanos el motivo del bloqueo" });
    expect(validateBloqueo("a".repeat(301))).toEqual({
      ok: false,
      error: "El motivo no puede superar 300 caracteres",
    });
  });

  it("17: motivo válido, recortado", () => {
    expect(validateBloqueo(" en reparación ")).toEqual({ ok: true, nota: "en reparación" });
  });
});

describe("accionesDeEstado", () => {
  it("18: Bloquear solo desde DISPONIBLE; Desbloquear solo desde BLOQUEADA", () => {
    expect(accionesDeEstado(EstadoCochera.DISPONIBLE)).toEqual({ bloquear: true, desbloquear: false });
    expect(accionesDeEstado(EstadoCochera.BLOQUEADA)).toEqual({ bloquear: false, desbloquear: true });
    for (const e of [EstadoCochera.OCUPADA, EstadoCochera.RESERVADA, 99]) {
      expect(accionesDeEstado(e)).toEqual({ bloquear: false, desbloquear: false });
    }
  });
});

describe("buildEstadoBody", () => {
  it("18d: nota recortada, conservada o null; nunca vacía", () => {
    expect(buildEstadoBody(EstadoCochera.BLOQUEADA, " en reparación ")).toEqual({ estado: 2, nota: "en reparación" });
    expect(buildEstadoBody(EstadoCochera.DISPONIBLE, "en reparación")).toEqual({ estado: 1, nota: "en reparación" });
    expect(buildEstadoBody(EstadoCochera.DISPONIBLE, "")).toEqual({ estado: 1, nota: null });
    expect(buildEstadoBody(EstadoCochera.DISPONIBLE, "  ")).toEqual({ estado: 1, nota: null });
  });
});

describe("vencimientoTexto", () => {
  it("19: vence en horas y minutos", () => {
    expect(vencimientoTexto("2026-11-18T17:30:00.000Z", NOW)).toBe("vence en 2h 30m");
  });

  it("20: venció hace", () => {
    expect(vencimientoTexto("2026-11-18T14:15:00.000Z", NOW)).toBe("venció hace 45m");
  });

  it("21: días y minutos sueltos", () => {
    expect(vencimientoTexto("2026-11-19T18:00:00.000Z", NOW)).toBe("vence en 1d 3h");
    expect(vencimientoTexto("2026-11-18T15:20:00.000Z", NOW)).toBe("vence en 20m");
  });

  it("22: sin fin devuelve vacío", () => {
    expect(vencimientoTexto(null, NOW)).toBe("");
    expect(vencimientoTexto(undefined, NOW)).toBe("");
  });

  it("acepta now como texto ISO", () => {
    expect(vencimientoTexto("2026-11-18T17:30:00.000Z", "2026-11-18T15:00:00.000Z")).toBe("vence en 2h 30m");
  });
});

describe("tarjetaInfo", () => {
  const activa = (extra = {}) => ({
    ocupacionId: 9,
    clienteNombre: "Ana",
    inicio: "2026-11-18T10:00:00.000Z",
    fin: "2026-11-18T17:30:00.000Z",
    ...extra,
  });

  it("23: OCUPADA con fin", () => {
    const t = tarjetaInfo({ estado: EstadoCochera.OCUPADA, ocupacionActiva: activa() }, NOW);
    expect(t).toMatchObject({
      modo: "ocupada",
      cliente: "Ana",
      fin: "2026-11-18T17:30:00.000Z",
      vence: "vence en 2h 30m",
    });
  });

  it("24: RESERVADA", () => {
    const t = tarjetaInfo(
      { estado: EstadoCochera.RESERVADA, ocupacionActiva: activa({ inicio: "2026-11-20T10:00:00.000Z" }) },
      NOW
    );
    expect(t).toMatchObject({ modo: "reservada", inicio: "2026-11-20T10:00:00.000Z", vence: "" });
  });

  it("25: sin ocupación activa, o DISPONIBLE, es ninguno", () => {
    expect(tarjetaInfo({ estado: EstadoCochera.DISPONIBLE }, NOW).modo).toBe("ninguno");
    expect(tarjetaInfo({ estado: EstadoCochera.BLOQUEADA }, NOW).modo).toBe("ninguno");
    expect(tarjetaInfo({ estado: EstadoCochera.OCUPADA }, NOW).modo).toBe("ninguno");
    expect(tarjetaInfo({ estado: EstadoCochera.OCUPADA, ocupacionActiva: null }, NOW).modo).toBe("ninguno");
  });

  it("25b: BLOQUEADA con ocupacionActiva decide por el inicio", () => {
    const pasada = tarjetaInfo({ estado: EstadoCochera.BLOQUEADA, ocupacionActiva: activa() }, NOW);
    expect(pasada).toMatchObject({ modo: "ocupada", bloqueada: true, cliente: "Ana" });
    const futura = tarjetaInfo(
      { estado: EstadoCochera.BLOQUEADA, ocupacionActiva: activa({ inicio: "2026-11-20T10:00:00.000Z" }) },
      NOW
    );
    expect(futura).toMatchObject({ modo: "reservada", bloqueada: true });
  });

  it("26: OCUPADA sin fin dice 'Sin hora de fin'", () => {
    const t = tarjetaInfo({ estado: EstadoCochera.OCUPADA, ocupacionActiva: activa({ fin: null }) }, NOW);
    expect(t).toMatchObject({ modo: "ocupada", fin: null, vence: "Sin hora de fin" });
  });

  it("un estado desconocido con ocupación es ninguno", () => {
    expect(tarjetaInfo({ estado: 99, ocupacionActiva: activa() }, NOW).modo).toBe("ninguno");
  });
});

describe("shouldReloadAfter y shouldCloseDetailAfter", () => {
  it("27: recarga con los códigos de estado viejo", () => {
    for (const c of [
      "cochera_no_encontrada",
      "cochera_numero_repetido",
      "cochera_bloqueada",
      "cochera_con_ocupacion_activa",
      "cochera_no_disponible",
    ]) {
      expect(shouldReloadAfter(c)).toBe(true);
    }
    for (const c of ["datos_invalidos", "operacion_invalida", "sin_permiso", "otro", undefined]) {
      expect(shouldReloadAfter(c)).toBe(false);
    }
  });

  it("28: cierra el detalle solo si la cochera no existe", () => {
    expect(shouldCloseDetailAfter("cochera_no_encontrada")).toBe(true);
    for (const c of ["cochera_numero_repetido", "datos_invalidos", undefined]) {
      expect(shouldCloseDetailAfter(c)).toBe(false);
    }
  });
});

describe("motivoCrearCocheras", () => {
  it("sin nada escrito pide el número", () => {
    expect(motivoCrearCocheras({ pristine: true, preview: previewRango("", "", []) })).toBe(
      "Ingresá el número de la cochera",
    );
  });
  it("con una vista previa válida da null", () => {
    expect(motivoCrearCocheras({ pristine: false, preview: previewRango("10", "12", []) })).toBeNull();
  });
  it("con una vista previa inválida repite su texto", () => {
    const preview = previewRango("10", "12", [11]);
    expect(motivoCrearCocheras({ pristine: false, preview })).toBe("Ya existe la cochera: 11");
  });
});
