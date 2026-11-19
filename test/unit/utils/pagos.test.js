import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EstadoOcupacion, EstadoPago, MetodoPago } from "../../../src/constants/enums.js";
import {
  AVISO_ANULAR_FINALIZADA,
  AVISO_DEVOLVER_DEBIENDO,
  accionesDePago,
  anulacionAviso,
  buildAnularBody,
  centsToMoney,
  devolucionAviso,
  devolvible,
  elegirPagoParaDevolver,
  moneyToCents,
  montoInicialDevolucion,
  pagoErrorField,
  pagoFilaInfo,
  pagosDevolvibles,
  shouldCloseActionAfterPago,
  shouldCloseDetailAfterPago,
  shouldReloadAfterPago,
  sortPagos,
  usuarioLabel,
  validateDevolucion,
} from "../../../src/utils/pagos.js";

const PAGADO = EstadoPago.PAGADO;
const ANULADO = EstadoPago.ANULADO;

const can = (...permisos) => (p) => permisos.includes(p);
const pago = (extra) => ({ id: 1, monto: 1000, montoDevuelto: 0, metodo: 1, estado: PAGADO, fechaPago: "2026-11-11T15:00:00Z", ...extra });

describe("enteros de la spec", () => {
  it("coinciden con enums.js", () => {
    expect(PAGADO).toBe(1);
    expect(ANULADO).toBe(2);
    expect(MetodoPago.EFECTIVO).toBe(1);
    expect(MetodoPago.TRANSFERENCIA).toBe(2);
    expect(EstadoOcupacion.FINALIZADA).toBe(4);
  });
});

describe("moneyToCents y centsToMoney", () => {
  it("1: sin error de coma flotante", () => {
    expect(moneyToCents(0.3)).toBe(30);
    expect(moneyToCents(12.34)).toBe(1234);
    expect(moneyToCents("10.50")).toBe(1050);
    expect(moneyToCents(0.1 + 0.2)).toBe(30);
  });
  it("lo no numérico da 0", () => {
    expect(moneyToCents(null)).toBe(0);
    expect(moneyToCents(undefined)).toBe(0);
    expect(moneyToCents("abc")).toBe(0);
  });
  it("2: centsToMoney", () => {
    expect(centsToMoney(1050)).toBe(10.5);
    expect(centsToMoney(30)).toBe(0.3);
  });
});

describe("devolvible", () => {
  it("3: sin devoluciones, todo el monto", () => {
    expect(devolvible({ monto: 1000, montoDevuelto: 0, estado: PAGADO })).toBe(1000);
  });
  it("4: con una devolución parcial", () => {
    expect(devolvible({ monto: 1000, montoDevuelto: 250.5, estado: PAGADO })).toBe(749.5);
  });
  it("5: sin error de coma flotante", () => {
    expect(devolvible({ monto: 0.3, montoDevuelto: 0.1, estado: PAGADO })).toBe(0.2);
  });
  it("6: un pago anulado no se devuelve", () => {
    expect(devolvible({ monto: 1000, montoDevuelto: 0, estado: ANULADO })).toBe(0);
  });
  it("7: un dato inconsistente da 0 sin lanzar", () => {
    expect(devolvible({ monto: 100, montoDevuelto: 150, estado: PAGADO })).toBe(0);
    expect(devolvible(null)).toBe(0);
  });
});

describe("pagosDevolvibles", () => {
  it("8: solo los PAGADOS con algo por devolver", () => {
    const A = pago({ id: 1, fechaPago: "2026-11-11T15:00:00Z", monto: 500 });
    const B = pago({ id: 2, fechaPago: "2026-11-15T15:00:00Z", estado: ANULADO });
    const C = pago({ id: 3, fechaPago: "2026-11-15T15:00:00Z", monto: 300, montoDevuelto: 300 });
    expect(pagosDevolvibles([A, B, C])).toEqual([A]);
  });
  it("9: fecha descendente y, a igual fecha, id descendente", () => {
    const A = pago({ id: 1, fechaPago: "2026-11-11T15:00:00Z" });
    const B = pago({ id: 2, fechaPago: "2026-11-15T15:00:00Z" });
    const C = pago({ id: 3, fechaPago: "2026-11-15T15:00:00Z" });
    expect(pagosDevolvibles([A, B, C])).toEqual([C, B, A]);
  });
});

describe("elegirPagoParaDevolver", () => {
  const A = pago({ id: 1, fechaPago: "2026-11-11T15:00:00Z", monto: 500 });
  const B = pago({ id: 2, fechaPago: "2026-11-15T15:00:00Z", monto: 200 });
  it("10: el más reciente que cubre el saldo a favor", () => {
    expect(elegirPagoParaDevolver([A, B], 300)).toBe(A);
  });
  it("11: si el más reciente alcanza, ese", () => {
    expect(elegirPagoParaDevolver([A, B], 100)).toBe(B);
  });
  it("12: si ninguno cubre, el más reciente", () => {
    const a = pago({ id: 1, fechaPago: "2026-11-11T15:00:00Z", monto: 200 });
    const b = pago({ id: 2, fechaPago: "2026-11-15T15:00:00Z", monto: 100 });
    expect(elegirPagoParaDevolver([a, b], 900)).toBe(b);
  });
  it("13: sin pagos devolvibles, null", () => {
    expect(elegirPagoParaDevolver([], 100)).toBeNull();
    expect(elegirPagoParaDevolver([pago({ estado: ANULADO })], 100)).toBeNull();
  });
  it("sin saldo a favor, el más reciente", () => {
    expect(elegirPagoParaDevolver([A, B], null)).toBe(B);
    expect(elegirPagoParaDevolver([A, B], 0)).toBe(B);
  });
});

describe("montoInicialDevolucion", () => {
  it("14: el saldo a favor si es menor que lo devolvible", () => {
    expect(montoInicialDevolucion(pago({ monto: 1000 }), 300)).toBe("300.00");
  });
  it("15: lo devolvible si el saldo a favor lo supera", () => {
    expect(montoInicialDevolucion(pago({ monto: 1000 }), 1500)).toBe("1000.00");
  });
  it("16: sin saldo a favor, lo devolvible", () => {
    expect(montoInicialDevolucion(pago({ monto: 1000, montoDevuelto: 250.5 }), null)).toBe("749.50");
    expect(montoInicialDevolucion(pago({ monto: 1000 }), 0)).toBe("1000.00");
  });
  it("sin pago, vacío", () => {
    expect(montoInicialDevolucion(null, 100)).toBe("");
  });
});

describe("sortPagos", () => {
  it("17: fecha descendente, id descendente y sin mutar", () => {
    const a = pago({ id: 1, fechaPago: "2026-11-10T10:00:00Z" });
    const b = pago({ id: 5, fechaPago: "2026-11-12T10:00:00Z" });
    const c = pago({ id: 7, fechaPago: "2026-11-12T10:00:00Z" });
    const d = pago({ id: 3, fechaPago: "2026-11-11T10:00:00Z" });
    const entrada = [a, b, c, d];
    expect(sortPagos(entrada)).toEqual([c, b, d, a]);
    expect(entrada).toEqual([a, b, c, d]);
  });
  it("no lanza con algo que no es un arreglo", () => {
    expect(sortPagos(null)).toEqual([]);
  });
});

describe("accionesDePago", () => {
  it("18: con anular y devolver, las dos", () => {
    const r = accionesDePago(pago({ monto: 500 }), can("pagos.anular", "pagos.devolver"));
    expect(r.anular).toBe(true);
    expect(r.devolver).toBe(true);
  });
  it("19: ENCARGADO, anula y no devuelve", () => {
    const r = accionesDePago(pago({ monto: 500 }), can("pagos.ver", "pagos.anular"));
    expect(r.anular).toBe(true);
    expect(r.devolver).toBe(false);
  });
  it("20: OPERADOR y AUDITOR, ninguna", () => {
    const r = accionesDePago(pago({ monto: 500 }), can("pagos.ver"));
    expect(r.anular).toBe(false);
    expect(r.devolver).toBe(false);
  });
  it("21: un pago anulado, ninguna", () => {
    const r = accionesDePago(pago({ estado: ANULADO }), can("pagos.ver", "pagos.anular", "pagos.devolver"));
    expect(r.anular).toBe(false);
    expect(r.devolver).toBe(false);
  });
  it("22: devuelto del todo, ni devolver ni anular", () => {
    const r = accionesDePago(pago({ monto: 500, montoDevuelto: 500 }), can("pagos.anular", "pagos.devolver"));
    expect(r.anular).toBe(false);
    expect(r.devolver).toBe(false);
  });
  it("23: con una devolución parcial, no se anula pero se puede seguir devolviendo", () => {
    const r = accionesDePago(pago({ monto: 500, montoDevuelto: 100 }), can("pagos.anular", "pagos.devolver"));
    expect(r.anular).toBe(false);
    expect(r.devolver).toBe(true);
    expect(r.anularBloqueadoPorDevoluciones).toBe(true);
  });
  it("23b: sin pagos.anular no se explica nada", () => {
    const r = accionesDePago(pago({ monto: 500, montoDevuelto: 100 }), can("pagos.ver"));
    expect(r.anularBloqueadoPorDevoluciones).toBe(false);
  });
});

describe("pagoFilaInfo", () => {
  it("24: pagado, pagado con devuelto y anulado", () => {
    expect(pagoFilaInfo(pago())).toEqual({ label: "Pagado", color: "success", devuelto: null, atenuado: false });
    expect(pagoFilaInfo(pago({ montoDevuelto: 100 }))).toEqual({
      label: "Pagado",
      color: "success",
      devuelto: 100,
      atenuado: false,
    });
    expect(pagoFilaInfo(pago({ estado: ANULADO }))).toEqual({
      label: "Anulado",
      color: "default",
      devuelto: null,
      atenuado: true,
    });
  });
});

describe("usuarioLabel", () => {
  it("25: Vos, Usuario #id y —", () => {
    expect(usuarioLabel(3, 3)).toBe("Vos");
    expect(usuarioLabel(3, 8)).toBe("Usuario #3");
    expect(usuarioLabel(3, null)).toBe("Usuario #3");
    expect(usuarioLabel(null, 8)).toBe("—");
    expect(usuarioLabel(undefined, undefined)).toBe("—");
  });
});

describe("buildAnularBody", () => {
  it("26: recorta y exige motivo", () => {
    expect(buildAnularBody(" Cobro duplicado ")).toEqual({ ok: true, body: { motivo: "Cobro duplicado" } });
    expect(buildAnularBody("")).toEqual({ ok: false, message: "Contanos el motivo" });
    expect(buildAnularBody("   ")).toEqual({ ok: false, message: "Contanos el motivo" });
    expect(buildAnularBody(undefined)).toEqual({ ok: false, message: "Contanos el motivo" });
  });
  it("26: 250 caracteres sí, 251 no", () => {
    expect(buildAnularBody("a".repeat(250)).ok).toBe(true);
    expect(buildAnularBody("a".repeat(251))).toEqual({
      ok: false,
      message: "El motivo no puede superar 250 caracteres",
    });
  });
});

describe("validateDevolucion", () => {
  const valido = { monto: "500", metodo: 1, motivo: " devolución del mensual ", pagoId: 7 };
  it("27: cuerpo sin pagoId", () => {
    const r = validateDevolucion(valido, { requirePago: true });
    expect(r).toEqual({ ok: true, pagoId: 7, body: { monto: 500, metodo: 1, motivo: "devolución del mensual" } });
    expect(r.body).not.toHaveProperty("pagoId");
  });
  it("28: monto con decimales y espacios", () => {
    expect(validateDevolucion({ ...valido, monto: "1500.5" }).body.monto).toBe(1500.5);
    expect(validateDevolucion({ ...valido, monto: " 99.99 " }).body.monto).toBe(99.99);
  });
  it("29: montos inválidos", () => {
    for (const monto of ["", "0", "-1", "12.345", "abc", "10000000.01"]) {
      const r = validateDevolucion({ ...valido, monto });
      expect(r.ok, `monto ${JSON.stringify(monto)}`).toBe(false);
      expect(r.errors.monto).toBeTruthy();
    }
    expect(validateDevolucion({ ...valido, monto: "10000000" }).ok).toBe(true);
  });
  it("29: los mensajes de monto", () => {
    expect(validateDevolucion({ ...valido, monto: "12.345" }).errors.monto).toBe("Ingresá un monto con hasta 2 decimales");
    expect(validateDevolucion({ ...valido, monto: "0" }).errors.monto).toBe("El monto debe ser mayor a 0");
    expect(validateDevolucion({ ...valido, monto: "10000000.01" }).errors.monto).toBe(
      "El monto no puede superar $ 10.000.000",
    );
  });
  it("30: método, motivo y pago", () => {
    expect(validateDevolucion({ ...valido, metodo: undefined }).errors.metodo).toBe("Elegí un método");
    expect(validateDevolucion({ ...valido, metodo: "" }).errors.metodo).toBe("Elegí un método");
    expect(validateDevolucion({ ...valido, metodo: 99 }).errors.metodo).toBe("Elegí un método");
    expect(validateDevolucion({ ...valido, motivo: "  " }).errors.motivo).toBe("Contanos el motivo");
    expect(validateDevolucion({ ...valido, motivo: "a".repeat(251) }).errors.motivo).toBe(
      "El motivo no puede superar 250 caracteres",
    );
    expect(validateDevolucion({ ...valido, motivo: "a".repeat(250) }).ok).toBe(true);
    expect(validateDevolucion({ ...valido, pagoId: undefined }, { requirePago: true }).errors.pagoId).toBe(
      "Elegí el pago a devolver",
    );
    // Sin `requirePago` el pago no se exige.
    expect(validateDevolucion({ ...valido, pagoId: undefined }).ok).toBe(true);
  });
  it("31: no valida contra el pago ni el saldo a favor", () => {
    expect(validateDevolucion({ ...valido, monto: "9999999" }).ok).toBe(true);
  });
});

describe("errores por code", () => {
  it("32: shouldReloadAfterPago", () => {
    for (const c of ["pago_no_encontrado", "pago_anulado", "pago_con_devoluciones", "devolucion_supera_pago"]) {
      expect(shouldReloadAfterPago(c), c).toBe(true);
    }
    for (const c of [
      "datos_invalidos",
      "operacion_invalida",
      "sin_permiso",
      "anulacion_requiere_dueno",
      "caja_cerrada",
      "caja_dia_anterior_abierta",
      "sin_conexion",
      "algo_raro",
      undefined,
    ]) {
      expect(shouldReloadAfterPago(c), String(c)).toBe(false);
    }
  });
  it("33: shouldCloseActionAfterPago", () => {
    for (const c of ["pago_no_encontrado", "pago_anulado", "pago_con_devoluciones"]) {
      expect(shouldCloseActionAfterPago(c), c).toBe(true);
    }
    for (const c of [
      "devolucion_supera_pago",
      "datos_invalidos",
      "anulacion_requiere_dueno",
      "sin_permiso",
      "caja_cerrada",
      "caja_dia_anterior_abierta",
      undefined,
    ]) {
      expect(shouldCloseActionAfterPago(c), String(c)).toBe(false);
    }
  });
  it("el detalle solo se cierra si el pago ya no existe", () => {
    expect(shouldCloseDetailAfterPago("pago_no_encontrado")).toBe(true);
    expect(shouldCloseDetailAfterPago("pago_anulado")).toBe(false);
    expect(shouldCloseDetailAfterPago(undefined)).toBe(false);
  });
  it("34: pagoErrorField", () => {
    expect(pagoErrorField("devolucion_supera_pago")).toBe("monto");
    expect(pagoErrorField("datos_invalidos")).toBeNull();
    expect(pagoErrorField(undefined)).toBeNull();
  });
});

describe("pagos.js no usa fechas del sistema", () => {
  it("35: sin getHours, toLocale ni toISOString", () => {
    const src = readFileSync(new URL("../../../src/utils/pagos.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/getHours|toLocale|toISOString/);
  });
});

describe("anulacionAviso", () => {
  it("36: solo con la ocupación finalizada", () => {
    expect(anulacionAviso({ estadoCalculado: 4 })).toBe(AVISO_ANULAR_FINALIZADA);
    expect(AVISO_ANULAR_FINALIZADA).toBe("La ocupación está finalizada: al anular va a quedar saldo pendiente de cobro");
    for (const e of [1, 2, 3]) expect(anulacionAviso({ estadoCalculado: e })).toBeNull();
  });
  it("36: sin estadoCalculado usa estado", () => {
    expect(anulacionAviso({ estado: 4 })).toBe(AVISO_ANULAR_FINALIZADA);
    expect(anulacionAviso({ estado: 1 })).toBeNull();
    expect(anulacionAviso(null)).toBeNull();
  });
});

describe("devolucionAviso", () => {
  it("37: compara en centavos", () => {
    expect(devolucionAviso("100", 300)).toBeNull();
    expect(devolucionAviso("300", 300)).toBeNull();
    expect(devolucionAviso("100", 0)).toBe(AVISO_DEVOLVER_DEBIENDO);
    expect(devolucionAviso("100", null)).toBe(AVISO_DEVOLVER_DEBIENDO);
    expect(devolucionAviso("300.01", 300)).toBe(AVISO_DEVOLVER_DEBIENDO);
    expect(devolucionAviso("abc", 300)).toBeNull();
  });
  it("el texto es el de la spec", () => {
    expect(AVISO_DEVOLVER_DEBIENDO).toBe(
      "No hay saldo a favor (o el monto lo supera): al devolver, la ocupación va a quedar debiendo",
    );
  });
  it("sin error de coma flotante", () => {
    expect(devolucionAviso("0.3", 0.1 + 0.2)).toBeNull();
  });
});
