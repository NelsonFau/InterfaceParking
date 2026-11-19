import { describe, expect, it } from "vitest";
import { ApiError } from "../../../src/api/errors.js";
import { EstadoOcupacion, MetodoPago, ResolucionExcedente, TipoOcupacion } from "../../../src/constants/enums.js";
import {
  DEFAULT_OCUPACION_FILTERS,
  OPEN_HORIZON_DAYS,
  accionesDeOcupacion,
  altaErrorField,
  altaModo,
  buildCancelBody,
  buildFinalizarBody,
  buildListQueries,
  cuentaRotulos,
  defaultAltaForm,
  disponiblesRange,
  faseChip,
  fieldErrorsFromApi,
  isTruncated,
  mergeOcupaciones,
  needsResolutionError,
  ocupacionFase,
  resolutionMessage,
  shouldCloseActionAfter,
  shouldCloseDetailAfter,
  shouldReloadAfter,
  showMotivoRetroactivo,
  validateAltaForm,
  validatePago,
} from "../../../src/utils/ocupaciones.js";

const TZ = "America/Montevideo"; // UTC-3 fijo
const NY = "America/New_York";
const NOW = new Date("2026-11-18T15:00:00.000Z"); // 12:00 locales
const NOW_30S = new Date("2026-11-18T15:00:30.000Z");

const canOf = (...permisos) => {
  const set = new Set(permisos);
  return (p) => set.has(p);
};
const TODOS = canOf(
  "ocupaciones.crear",
  "ocupaciones.crear_retroactiva",
  "ocupaciones.tarifa_excepcional",
  "ocupaciones.finalizar",
  "ocupaciones.cancelar",
  "pagos.registrar",
);

const activa = (extra) => ({ estado: 1, estadoCalculado: 1, inicio: "2026-11-18T14:00:00.000Z", ...extra });
const ctx = { timeZone: TZ, now: NOW };

describe("ocupacionFase", () => {
  it("1: ACTIVA con inicio pasado es en_curso", () => {
    expect(ocupacionFase(activa(), NOW)).toBe("en_curso");
  });
  it("2: ACTIVA con inicio futuro es reserva", () => {
    expect(ocupacionFase(activa({ inicio: "2026-11-19T13:00:00.000Z" }), NOW)).toBe("reserva");
  });
  it("3: inicio igual a now es en_curso (límite estricto)", () => {
    expect(ocupacionFase(activa({ inicio: NOW.toJSON() }), NOW)).toBe("en_curso");
  });
  it("4: estadoCalculado VENCIDA es vencida", () => {
    expect(ocupacionFase(activa({ estadoCalculado: 2 }), NOW)).toBe("vencida");
  });
  it("5: CANCELADA y FINALIZADA, aunque el inicio sea futuro", () => {
    expect(ocupacionFase(activa({ estado: 3, estadoCalculado: 3 }), NOW)).toBe("cancelada");
    expect(
      ocupacionFase({ estado: 4, estadoCalculado: 4, inicio: "2026-11-19T13:00:00.000Z" }, NOW),
    ).toBe("finalizada");
  });
  it("6: sin estadoCalculado usa estado", () => {
    expect(ocupacionFase({ estado: 3, inicio: "2026-11-18T14:00:00.000Z" }, NOW)).toBe("cancelada");
    expect(ocupacionFase({ estado: 1, inicio: "2026-11-19T14:00:00.000Z" }, NOW)).toBe("reserva");
  });
  it("acepta now como milisegundos o texto", () => {
    expect(ocupacionFase(activa(), NOW.getTime())).toBe("en_curso");
    expect(ocupacionFase(activa(), NOW.toJSON())).toBe("en_curso");
  });
});

describe("faseChip", () => {
  it("7: reserva con color propio; el resto con la etiqueta y el color del enum", () => {
    expect(faseChip("reserva")).toEqual({ label: "Reserva", color: "secondary" });
    expect(faseChip("en_curso")).toEqual({ label: "En curso", color: "success" });
    expect(faseChip("vencida")).toEqual({ label: "Vencida", color: "warning" });
    expect(faseChip("finalizada")).toEqual({ label: "Finalizada", color: "info" });
    expect(faseChip("cancelada")).toEqual({ label: "Cancelada", color: "default" });
  });
});

describe("accionesDeOcupacion", () => {
  const reserva = activa({ inicio: "2026-11-19T13:00:00.000Z", saldo: 0 });
  const enCurso = activa({ saldo: 0 });
  const vencida = activa({ estadoCalculado: 2, saldo: 0 });

  it("8: en curso con finalizar", () => {
    const a = accionesDeOcupacion(enCurso, NOW, canOf("ocupaciones.finalizar", "ocupaciones.cancelar"));
    expect(a.finalizar).toBe(true);
    expect(a.cancelarReserva).toBe(false);
  });
  it("9: reserva con cancelar y con finalizar", () => {
    expect(accionesDeOcupacion(reserva, NOW, canOf("ocupaciones.cancelar")).cancelarReserva).toBe(true);
    expect(accionesDeOcupacion(reserva, NOW, canOf("ocupaciones.finalizar")).finalizar).toBe(false);
  });
  it("10: vencida con finalizar", () => {
    expect(accionesDeOcupacion(vencida, NOW, canOf("ocupaciones.finalizar")).finalizar).toBe(true);
  });
  it("11: finalizada y cancelada, con todos los permisos, no se finalizan ni se cancelan", () => {
    for (const estado of [3, 4]) {
      const a = accionesDeOcupacion({ estado, estadoCalculado: estado, inicio: activa().inicio, saldo: 0 }, NOW, TODOS);
      expect(a.finalizar).toBe(false);
      expect(a.cancelarReserva).toBe(false);
    }
  });
  it("12: registrarPago según permiso, saldo y estado", () => {
    const pago = canOf("pagos.registrar");
    expect(accionesDeOcupacion(activa({ saldo: 100 }), NOW, pago).registrarPago).toBe(true);
    expect(accionesDeOcupacion(activa({ saldo: 0 }), NOW, pago).registrarPago).toBe(false);
    expect(accionesDeOcupacion(activa({ saldo: null }), NOW, pago).registrarPago).toBe(false);
    expect(accionesDeOcupacion(activa({ estado: 3, estadoCalculado: 3, saldo: 100 }), NOW, pago).registrarPago).toBe(false);
  });
  it("una reserva y una vencida con saldo aceptan pagos", () => {
    const pago = canOf("pagos.registrar");
    expect(accionesDeOcupacion({ ...reserva, saldo: 50 }, NOW, pago).registrarPago).toBe(true);
    expect(accionesDeOcupacion({ ...vencida, saldo: 50 }, NOW, pago).registrarPago).toBe(true);
  });
  it("13: sin permisos todo es falso en cualquier fase", () => {
    const nada = canOf();
    for (const o of [reserva, enCurso, vencida, { estado: 4, estadoCalculado: 4, inicio: activa().inicio, saldo: 10 }]) {
      expect(accionesDeOcupacion({ ...o, saldo: 10 }, NOW, nada)).toEqual({
        finalizar: false,
        cancelarReserva: false,
        registrarPago: false,
      });
    }
  });
});

describe("buildListQueries", () => {
  const q = (filters, now = NOW) => buildListQueries(filters, { timeZone: TZ, now });

  it("14: por defecto, dos pedidos (activas y vencidas)", () => {
    expect(q({})).toEqual({
      ok: true,
      queries: [
        { estado: 1, take: 200 },
        { estado: 2, take: 200 },
      ],
    });
    expect(q(DEFAULT_OCUPACION_FILTERS).queries).toHaveLength(2);
  });
  it("15: todas, vencidas, finalizadas y canceladas son un solo pedido", () => {
    expect(q({ estado: "todas" }).queries).toEqual([{ take: 200 }]);
    expect(q({ estado: "vencidas" }).queries).toEqual([{ estado: 2, take: 200 }]);
    expect(q({ estado: "finalizadas" }).queries).toEqual([{ estado: 4, take: 200 }]);
    expect(q({ estado: "canceladas" }).queries).toEqual([{ estado: 3, take: 200 }]);
  });
  it("15b: activas con venceEnDias es un solo pedido", () => {
    expect(q({ venceEnDias: "7" }).queries).toEqual([{ estado: 1, venceEnDias: 7, take: 200 }]);
  });
  it("16: rango de un día, con hasta inclusivo en la zona", () => {
    const r = q({ estado: "todas", desde: "2026-11-01", hasta: "2026-11-01" });
    expect(r.queries[0].desde).toBe("2026-11-01T03:00:00.000Z");
    expect(r.queries[0].hasta).toBe("2026-11-02T02:59:59.999Z");
  });
  it("17: desde posterior a hasta es un error y no devuelve pedidos", () => {
    const r = q({ desde: "2026-11-05", hasta: "2026-11-01" });
    expect(r.ok).toBe(false);
    expect(r.message).toBe("La fecha 'Desde' no puede ser posterior a 'Hasta'");
    expect(r.queries).toBeUndefined();
    expect(q({ desde: "2026-13-45" }).ok).toBe(false);
  });
  it("18: reservas manda estado ACTIVA y desde = el más tardío entre ahora y 'Inicio desde'", () => {
    expect(q({ estado: "reservas" }).queries).toEqual([{ estado: 1, desde: "2026-11-18T15:00:00.000Z", take: 200 }]);
    expect(q({ estado: "reservas", desde: "2026-11-01" }).queries[0].desde).toBe("2026-11-18T15:00:00.000Z");
    expect(q({ estado: "reservas", desde: "2026-11-25" }).queries[0].desde).toBe("2026-11-25T03:00:00.000Z");
  });
  it("19: venceEnDias entero de 0 o más; vacío se omite; lo demás es error", () => {
    expect(q({ venceEnDias: "7" }).queries[0].venceEnDias).toBe(7);
    expect(q({ venceEnDias: "0" }).queries[0].venceEnDias).toBe(0);
    expect(q({ venceEnDias: "" }).queries[0]).not.toHaveProperty("venceEnDias");
    for (const malo of ["-1", "1.5", "abc"]) expect(q({ venceEnDias: malo }).ok).toBe(false);
  });
  it("20: cocheraId y clienteId como enteros; vacíos se omiten", () => {
    const r = q({ cocheraId: "12", clienteId: "9" });
    expect(r.queries[0]).toMatchObject({ cocheraId: 12, clienteId: 9 });
    const vacio = q({ cocheraId: "", clienteId: "" }).queries[0];
    expect(vacio).not.toHaveProperty("cocheraId");
    expect(vacio).not.toHaveProperty("clienteId");
  });
  it("take: el elegido, o 200 si no es un entero positivo", () => {
    expect(q({ take: 500 }).queries[0].take).toBe(500);
    expect(q({ take: "50" }).queries[0].take).toBe(50);
    expect(q({ take: "x" }).queries[0].take).toBe(200);
  });
});

describe("mergeOcupaciones", () => {
  it("15c: ordena por inicio descendente y por id descendente, y corta", () => {
    const A = [
      { id: 1, inicio: "2026-11-11T10:00:00.000Z" },
      { id: 2, inicio: "2026-11-15T10:00:00.000Z" },
    ];
    const B = [
      { id: 3, inicio: "2026-11-15T10:00:00.000Z" },
      { id: 4, inicio: "2026-11-09T10:00:00.000Z" },
    ];
    expect(mergeOcupaciones([A, B], 3).map((o) => o.id)).toEqual([3, 2, 1]);
  });
  it("no repite una ocupación que vino en los dos pedidos", () => {
    const o = { id: 1, inicio: "2026-11-11T10:00:00.000Z" };
    expect(mergeOcupaciones([[o], [o]], 10)).toHaveLength(1);
  });
});

describe("isTruncated", () => {
  const filas = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
  it("21: alcanza con que un pedido llegue al tope", () => {
    expect(isTruncated([filas(200)], 200)).toBe(true);
    expect(isTruncated([filas(199), filas(199)], 200)).toBe(false);
    expect(isTruncated([filas(100), filas(200)], 200)).toBe(true);
  });
});

describe("altaModo", () => {
  const modo = (form) => altaModo(form, ctx);
  it("22: reserva, abierta, cerrada y null", () => {
    expect(modo({ inicio: "2026-11-20T09:00", fin: "2026-11-20T18:00", sinFin: false })).toBe("reserva");
    expect(modo({ inicio: "2026-11-18T12:00", fin: "", sinFin: true })).toBe("abierta");
    expect(modo({ inicio: "2026-11-18T08:00", fin: "2026-11-18T10:00", sinFin: false })).toBe("cerrada");
    expect(modo({ inicio: "", fin: "", sinFin: true })).toBeNull();
  });
});

describe("disponiblesRange", () => {
  it("23: con fin, los dos instantes", () => {
    expect(disponiblesRange({ inicio: "2026-11-20T09:00", fin: "2026-11-20T18:00", sinFin: false }, TZ)).toEqual({
      desde: "2026-11-20T12:00:00.000Z",
      hasta: "2026-11-20T21:00:00.000Z",
    });
  });
  it("24: sin fin, hasta es desde más OPEN_HORIZON_DAYS días exactos", () => {
    const r = disponiblesRange({ inicio: "2026-11-20T09:00", fin: "", sinFin: true }, TZ);
    expect(Date.parse(r.hasta) - Date.parse(r.desde)).toBe(OPEN_HORIZON_DAYS * 86_400_000);
    expect(OPEN_HORIZON_DAYS).toBe(3650);
  });
  it("25: fin igual o anterior al inicio, inicio vacío y hora inexistente dan null", () => {
    expect(disponiblesRange({ inicio: "2026-11-20T09:00", fin: "2026-11-20T09:00", sinFin: false }, TZ)).toBeNull();
    expect(disponiblesRange({ inicio: "2026-11-20T09:00", fin: "2026-11-20T08:00", sinFin: false }, TZ)).toBeNull();
    expect(disponiblesRange({ inicio: "2026-11-20T09:00", fin: "", sinFin: false }, TZ)).toBeNull();
    expect(disponiblesRange({ inicio: "", fin: "", sinFin: true }, TZ)).toBeNull();
    expect(disponiblesRange({ inicio: "2026-03-08T02:30", fin: "", sinFin: true }, NY)).toBeNull();
  });
});

describe("showMotivoRetroactivo", () => {
  const show = (inicio, can, fieldErrors) =>
    showMotivoRetroactivo({ inicio }, { timeZone: TZ, now: NOW_30S, can, fieldErrors });
  const conPermiso = canOf("ocupaciones.crear_retroactiva");

  it("26: el minuto actual no; un minuto antes sí", () => {
    expect(show("2026-11-18T12:00", conPermiso)).toBe(false);
    expect(show("2026-11-18T11:59", conPermiso)).toBe(true);
  });
  it("27: sin el permiso, nunca; con inicio futuro, tampoco", () => {
    expect(show("2026-11-18T11:00", canOf())).toBe(false);
    expect(show("2026-11-20T11:00", conPermiso)).toBe(false);
  });
  it("28: con el permiso, un error del servidor en el campo lo muestra", () => {
    expect(show("2026-11-18T12:00", conPermiso, { motivoRetroactivo: "Falta el motivo" })).toBe(true);
    expect(show("2026-11-18T12:00", canOf(), { motivoRetroactivo: "Falta el motivo" })).toBe(false);
  });
});

describe("defaultAltaForm", () => {
  it("inicio en el minuto actual del local, Hora y sin fin", () => {
    const f = defaultAltaForm(ctx);
    expect(f.inicio).toBe("2026-11-18T12:00");
    expect(f.tipo).toBe(TipoOcupacion.HORA);
    expect(f.sinFin).toBe(true);
    expect(f.cliente).toBeNull();
  });
});

describe("validateAltaForm", () => {
  const base = {
    tipo: 1,
    cliente: { id: 9 },
    cocheraId: 5,
    inicio: "2026-11-18T12:00",
    sinFin: true,
    fin: "",
    excepcional: false,
    precio: "",
    motivoExcepcional: "",
    motivoRetroactivo: "",
  };
  const v = (form, can = TODOS, timeZone = TZ) => validateAltaForm({ ...base, ...form }, { timeZone, can });

  it("29: abierta válida, sin la clave fin", () => {
    const r = v({}, canOf());
    expect(r.ok).toBe(true);
    expect(r.body).toEqual({
      cocheraId: 5,
      clienteId: 9,
      tipo: 1,
      inicio: "2026-11-18T15:00:00.000Z",
      usarTarifaExcepcional: false,
    });
    expect(r.body).not.toHaveProperty("fin");
  });
  it("30: con fin", () => {
    expect(v({ sinFin: false, fin: "2026-11-18T18:00" }).body.fin).toBe("2026-11-18T21:00:00.000Z");
  });
  it("31: fin igual o anterior al inicio", () => {
    for (const fin of ["2026-11-18T12:00", "2026-11-18T11:00"]) {
      expect(v({ sinFin: false, fin }).errors.fin).toBe("El fin debe ser posterior al inicio");
    }
  });
  it("32: no abierta y sin fin", () => {
    expect(v({ sinFin: false, fin: "" }).errors.fin).toBe("Ingresá el fin o marcá «Sin hora de fin»");
  });
  it("33: sin cochera, sin cliente y sin inicio", () => {
    const r = v({ cocheraId: "", cliente: null, inicio: "" });
    expect(Object.keys(r.errors).sort()).toEqual(["cliente", "cocheraId", "inicio"]);
    expect(r.errors.cocheraId).toBe("Elegí una cochera");
    expect(r.errors.cliente).toBe("Elegí un cliente");
    expect(r.errors.inicio).toBe("Ingresá el inicio");
  });
  it("34: inicio inexistente por cambio de horario", () => {
    const r = v({ inicio: "2026-03-08T02:30" }, TODOS, NY);
    expect(r.ok).toBe(false);
    expect(r.errors.inicio).toMatch(/no existe/);
  });
  it("35: tarifa excepcional con permiso", () => {
    const r = v({ excepcional: true, precio: "850.50", motivoExcepcional: " cliente frecuente " });
    expect(r.ok).toBe(true);
    expect(r.body).toMatchObject({
      usarTarifaExcepcional: true,
      precioUnitarioExcepcional: 850.5,
      motivoTarifaExcepcional: "cliente frecuente",
    });
  });
  it("36: precio inválido y motivo vacío; 10000000 es válido", () => {
    for (const precio of ["", "0", "12.345", "10000000.01"]) {
      expect(v({ excepcional: true, precio, motivoExcepcional: "x" }).errors.precio).toBeTruthy();
    }
    expect(v({ excepcional: true, precio: "0", motivoExcepcional: "x" }).errors.precio).toBe(
      "El precio debe ser mayor a 0",
    );
    expect(v({ excepcional: true, precio: "10000000.01", motivoExcepcional: "x" }).errors.precio).toBe(
      "El precio no puede superar $ 10.000.000",
    );
    expect(v({ excepcional: true, precio: "10", motivoExcepcional: "  " }).errors.motivoExcepcional).toBe(
      "Contanos el motivo de la tarifa excepcional",
    );
    expect(v({ excepcional: true, precio: "10", motivoExcepcional: "a".repeat(251) }).errors.motivoExcepcional).toBe(
      "El motivo no puede superar 250 caracteres",
    );
    expect(v({ excepcional: true, precio: "10000000", motivoExcepcional: "x" }).ok).toBe(true);
  });
  it("37: interruptor activo sin el permiso: ni precio ni motivo, y no se valida", () => {
    const r = v({ excepcional: true, precio: "", motivoExcepcional: "" }, canOf());
    expect(r.ok).toBe(true);
    expect(r.body.usarTarifaExcepcional).toBe(false);
    expect(r.body).not.toHaveProperty("precioUnitarioExcepcional");
    expect(r.body).not.toHaveProperty("motivoTarifaExcepcional");
  });
  it("38: motivo retroactivo con permiso, sin permiso y demasiado largo", () => {
    expect(v({ motivoRetroactivo: " cargado de la mañana " }).body.motivoRetroactivo).toBe("cargado de la mañana");
    expect(v({ motivoRetroactivo: "x" }, canOf()).body).not.toHaveProperty("motivoRetroactivo");
    expect(v({ motivoRetroactivo: "a".repeat(251) }).errors.motivoRetroactivo).toBe(
      "El motivo no puede superar 250 caracteres",
    );
  });
  it("39: no valida configuración: un inicio de hace un año y un fin a diez años pasan", () => {
    expect(v({ inicio: "2025-01-01T00:00", sinFin: false, fin: "2036-11-18T12:00" }).ok).toBe(true);
  });
});

describe("buildCancelBody", () => {
  it("40: recorta, exige motivo y limita a 250; el cuerpo es solo { motivo }", () => {
    expect(buildCancelBody(" Cliente avisó ")).toEqual({ ok: true, body: { motivo: "Cliente avisó" } });
    for (const vacio of ["", "   ", undefined]) {
      expect(buildCancelBody(vacio)).toEqual({ ok: false, message: "Contanos el motivo de la cancelación" });
    }
    expect(buildCancelBody("a".repeat(251))).toEqual({ ok: false, message: "El motivo no puede superar 250 caracteres" });
    expect(buildCancelBody("a".repeat(250)).ok).toBe(true);
    expect(buildCancelBody("x").body).not.toHaveProperty("finReal");
  });
});

describe("excedente al finalizar", () => {
  it("41: needsResolutionError solo con 400 datos_invalidos y errors.ResolucionExcedente", () => {
    const e = (props) => new ApiError({ status: 400, code: "datos_invalidos", ...props });
    expect(needsResolutionError(e({ errors: { ResolucionExcedente: ["…"] } }))).toBe(true);
    expect(needsResolutionError(e({ errors: { Motivo: ["…"] } }))).toBe(false);
    expect(needsResolutionError(new ApiError({ status: 400, code: "operacion_invalida" }))).toBe(false);
    expect(needsResolutionError(null)).toBe(false);
    expect(needsResolutionError(undefined)).toBe(false);
    // No usa saldoAFavor ni nada que no sea el propio error.
    expect(needsResolutionError({ status: 400, code: "datos_invalidos", errors: null, saldoAFavor: 100 })).toBe(false);
  });
  it("resolutionMessage muestra el texto del campo (con los montos) y, si no, el mensaje", () => {
    const conMontos = new ApiError({
      status: 400,
      code: "datos_invalidos",
      message: "Hay datos inválidos en el pedido.",
      errors: { ResolucionExcedente: ["Lo pagado (150.00) supera lo que corresponde hasta la salida (100.00)."] },
    });
    expect(resolutionMessage(conMontos)).toBe("Lo pagado (150.00) supera lo que corresponde hasta la salida (100.00).");
    expect(resolutionMessage(new ApiError({ message: "otro" }))).toBe("otro");
  });
  it("42: sin paso de resolución el cuerpo no existe", () => {
    expect(buildFinalizarBody({})).toEqual({ ok: true, body: undefined });
    expect(buildFinalizarBody()).toEqual({ ok: true, body: undefined });
  });
  it("43: con el paso abierto hay que elegir", () => {
    expect(buildFinalizarBody({ resolviendo: true, resolucion: null })).toMatchObject({
      ok: false,
      message: "Elegí cómo resolver el excedente",
    });
  });
  it("44: COBRAR_COMPLETO exige motivo", () => {
    const COBRAR = ResolucionExcedente.COBRAR_COMPLETO;
    expect(buildFinalizarBody({ resolviendo: true, resolucion: COBRAR, motivo: "" }).ok).toBe(false);
    expect(buildFinalizarBody({ resolviendo: true, resolucion: COBRAR, motivo: " pactado " })).toEqual({
      ok: true,
      body: { resolucionExcedente: 1, motivo: "pactado" },
    });
  });
  it("45: DEVOLVER con motivo opcional y tope de 250", () => {
    const DEVOLVER = ResolucionExcedente.DEVOLVER;
    expect(buildFinalizarBody({ resolviendo: true, resolucion: DEVOLVER, motivo: "" })).toEqual({
      ok: true,
      body: { resolucionExcedente: 2 },
    });
    expect(buildFinalizarBody({ resolviendo: true, resolucion: DEVOLVER, motivo: "a".repeat(250) }).ok).toBe(true);
    expect(buildFinalizarBody({ resolviendo: true, resolucion: DEVOLVER, motivo: "a".repeat(251) }).ok).toBe(false);
  });
});

describe("validatePago", () => {
  const ok = (monto) => validatePago({ monto, metodo: MetodoPago.EFECTIVO });
  it("46: montos válidos", () => {
    expect(ok("1500")).toMatchObject({ ok: true, body: { monto: 1500, metodo: 1 } });
    expect(ok("1500.5").body.monto).toBe(1500.5);
    expect(ok(" 99.99 ").body.monto).toBe(99.99);
    expect(ok("10000000").ok).toBe(true);
  });
  it("47: montos inválidos y método ausente", () => {
    for (const monto of ["", "0", "-1", "12.345", "abc", "10000000.01"]) {
      expect(ok(monto).errors.monto).toBeTruthy();
    }
    expect(validatePago({ monto: "10" }).errors.metodo).toBeTruthy();
    expect(validatePago({ monto: "10", metodo: 9 }).errors.metodo).toBeTruthy();
  });
  it("48: la referencia se recorta y se omite si está vacía; ocupacionId va en el cuerpo", () => {
    expect(validatePago({ ocupacionId: 7, monto: "10", metodo: 2, referencia: " x " }).body).toEqual({
      ocupacionId: 7,
      monto: 10,
      metodo: 2,
      referencia: "x",
    });
    expect(validatePago({ monto: "10", metodo: 2, referencia: "" }).body).not.toHaveProperty("referencia");
  });
});

describe("fieldErrorsFromApi", () => {
  it("49: el primer mensaje de cada campo conocido; el resto, a generales", () => {
    const r = fieldErrorsFromApi({
      errors: { Inicio: ["a"], Fin: ["b", "c"], MotivoRetroactivo: ["d"], Otro: ["e"] },
    });
    expect(r.fields).toEqual({ inicio: "a", fin: "b", motivoRetroactivo: "d" });
    expect(r.general).toEqual(["e"]);
  });
  it("sin errors, vacío", () => {
    expect(fieldErrorsFromApi({ errors: null })).toEqual({ fields: {}, general: [] });
    expect(fieldErrorsFromApi(undefined)).toEqual({ fields: {}, general: [] });
  });
  it("mapea los campos de precio, motivo y monto", () => {
    const r = fieldErrorsFromApi({
      errors: { PrecioUnitarioExcepcional: ["p"], MotivoTarifaExcepcional: ["m"], Motivo: ["x"], Monto: ["y"] },
    });
    expect(r.fields).toEqual({ precio: "p", motivoExcepcional: "m", motivo: "x", monto: "y" });
  });
});

describe("cuentaRotulos", () => {
  it("49b: el rótulo del tope según la ocupación", () => {
    expect(cuentaRotulos(activa({ fin: "2026-11-19T15:00:00.000Z" })).tope).toBe("Total del contrato");
    expect(cuentaRotulos(activa({ fin: null })).tope).toBe("Hasta ahora (unidad en curso)");
    expect(cuentaRotulos({ estado: 4, estadoCalculado: 4, fin: null }).tope).toBe("Total");
    expect(cuentaRotulos({ estado: 3, estadoCalculado: 3, fin: "2026-11-19T15:00:00.000Z" }).tope).toBeNull();
    expect(cuentaRotulos(activa()).pagado).toBe("Pagado");
    expect(cuentaRotulos(activa()).saldo).toBe("Saldo");
  });
  it("una ocupación VENCIDA con fin es del contrato", () => {
    expect(cuentaRotulos({ estado: 1, estadoCalculado: EstadoOcupacion.VENCIDA, fin: "x" }).tope).toBe("Total del contrato");
  });
});

describe("códigos de error", () => {
  it("50: campo del alta por código", () => {
    expect(altaErrorField("cochera_no_disponible", {})).toBe("cocheraId");
    expect(altaErrorField("cochera_bloqueada", {})).toBe("cocheraId");
    expect(altaErrorField("cliente_inactivo", {})).toBe("cliente");
    expect(altaErrorField("inicio_retroactivo_sin_permiso", {})).toBe("inicio");
    expect(altaErrorField("tarifa_no_configurada", {})).toBe("tipo");
    expect(altaErrorField("operacion_invalida", {})).toBeNull();
  });
  it("51: sin_permiso marca el interruptor si estaba activo, y si no el inicio", () => {
    expect(altaErrorField("sin_permiso", { excepcional: true })).toBe("excepcional");
    expect(altaErrorField("sin_permiso", { excepcional: false })).toBe("inicio");
  });
  it("52: shouldReloadAfter", () => {
    for (const c of [
      "ocupacion_no_encontrada",
      "ocupacion_no_activa",
      "ocupacion_cancelada",
      "ocupacion_finalizada",
      "ocupacion_ya_iniciada",
      "ocupacion_no_iniciada",
      "pago_supera_saldo",
      "cochera_no_disponible",
      "cochera_bloqueada",
    ]) {
      expect(shouldReloadAfter(c)).toBe(true);
    }
    for (const c of ["datos_invalidos", "operacion_invalida", "sin_permiso", "tarifa_no_configurada", "caja_cerrada", "raro", undefined]) {
      expect(shouldReloadAfter(c)).toBe(false);
    }
  });
  it("53: shouldCloseDetailAfter solo con ocupacion_no_encontrada", () => {
    expect(shouldCloseDetailAfter("ocupacion_no_encontrada")).toBe(true);
    expect(shouldCloseDetailAfter("ocupacion_finalizada")).toBe(false);
    expect(shouldCloseDetailAfter(undefined)).toBe(false);
  });
  it("shouldCloseActionAfter: el grupo ocupacion_* cierra el diálogo; pago_supera_saldo y caja_cerrada no", () => {
    for (const c of ["ocupacion_no_activa", "ocupacion_finalizada", "ocupacion_ya_iniciada", "ocupacion_no_iniciada", "ocupacion_cancelada", "ocupacion_no_encontrada"]) {
      expect(shouldCloseActionAfter(c)).toBe(true);
    }
    expect(shouldCloseActionAfter("pago_supera_saldo")).toBe(false);
    expect(shouldCloseActionAfter("caja_cerrada")).toBe(false);
  });
});
