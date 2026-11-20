// Lógica pura que sostiene la corrección visual de la spec 13 (guía visual): paginación en texto, situación de la
// cochera en el mosaico, hora del mosaico, iniciales y estados de tarifa.
import { describe, expect, it } from "vitest";
import { EstadoCochera, EstadoTarifa, SituacionCochera, TipoOcupacion, colorOf, labelOf } from "../../../src/constants/enums.js";
import {
  contarSituaciones,
  lineaHorario,
  ocupacionesConDeuda,
  situacionCochera,
  tarjetaInfo,
} from "../../../src/utils/cocheras.js";
import { buildCocheraPath, parseCocheraId } from "../../../src/utils/cocheraLink.js";
import { formatInstantTime } from "../../../src/utils/fechas.js";
import { iniciales } from "../../../src/utils/iniciales.js";
import { rangoPagina } from "../../../src/utils/paginacion.js";
import {
  REGISTRO,
  buildFormRegistro,
  datosCompletos,
  joinFechaHora,
  motivoConfirmarIngreso,
  reglaDeCobro,
  splitInicio,
  tipoDeRegistro,
} from "../../../src/utils/registrarIngreso.js";

const NOW = new Date("2026-11-18T15:00:00.000Z");

describe("rangoPagina", () => {
  it("da el rango de la página y lo recorta al total", () => {
    expect(rangoPagina({ page: 1, pageSize: 20, total: 3, count: 3 })).toEqual({ from: 1, to: 3 });
    expect(rangoPagina({ page: 2, pageSize: 20, total: 25, count: 5 })).toEqual({ from: 21, to: 25 });
  });
  it("sin filas o sin total da 0–0", () => {
    expect(rangoPagina({ page: 1, pageSize: 20, total: 0, count: 0 })).toEqual({ from: 0, to: 0 });
    expect(rangoPagina({ page: 1, pageSize: 20, total: Number.NaN, count: 2 })).toEqual({ from: 0, to: 0 });
  });
});

describe("situacionCochera", () => {
  const ocupa = (tipo, extra = {}) => ({ ocupacionId: 7, clienteNombre: "Ana", tipo, inicio: "2026-11-18T10:00:00.000Z", ...extra });
  it("libre, bloqueada y reservada", () => {
    expect(situacionCochera({ estado: EstadoCochera.DISPONIBLE }, NOW)).toBe(SituacionCochera.LIBRE);
    expect(situacionCochera({ estado: EstadoCochera.BLOQUEADA }, NOW)).toBe(SituacionCochera.BLOQUEADA);
    expect(
      situacionCochera({ estado: EstadoCochera.RESERVADA, ocupacionActiva: ocupa(TipoOcupacion.DIA, { inicio: "2026-11-19T10:00:00.000Z" }) }, NOW),
    ).toBe(SituacionCochera.RESERVADA);
  });
  it("ocupada por mes, por hora y por día", () => {
    const c = (tipo) => ({ estado: EstadoCochera.OCUPADA, ocupacionActiva: ocupa(tipo) });
    expect(situacionCochera(c(TipoOcupacion.MES), NOW)).toBe(SituacionCochera.POR_MES);
    expect(situacionCochera(c(TipoOcupacion.HORA), NOW)).toBe(SituacionCochera.POR_HORA);
    expect(situacionCochera(c(TipoOcupacion.DIA), NOW)).toBe(SituacionCochera.POR_DIA);
  });
  it("con deuda solo si el id está en el conjunto; sin conjunto (null) no se adivina", () => {
    const c = { estado: EstadoCochera.OCUPADA, ocupacionActiva: ocupa(TipoOcupacion.MES) };
    expect(situacionCochera(c, NOW, new Set([7]))).toBe(SituacionCochera.CON_DEUDA);
    expect(situacionCochera(c, NOW, new Set([8]))).toBe(SituacionCochera.POR_MES);
    expect(situacionCochera(c, NOW, null)).toBe(SituacionCochera.POR_MES);
  });
  it("cada situación tiene etiqueta y color de enums", () => {
    expect(labelOf(SituacionCochera, SituacionCochera.RESERVADA)).toBe("Reservado");
    expect(colorOf(SituacionCochera, SituacionCochera.CON_DEUDA)).toBe("error");
    expect(colorOf(SituacionCochera, SituacionCochera.POR_MES)).toBe("oc");
  });
});

describe("ocupacionesConDeuda", () => {
  it("marca mensuales con saldo y vencidas con saldo, no las de hora o día en curso", () => {
    const ids = ocupacionesConDeuda([
      { id: 1, tipo: TipoOcupacion.MES, estado: 1, saldo: 100 },
      { id: 2, tipo: TipoOcupacion.HORA, estado: 1, estadoCalculado: 1, saldo: 180 },
      { id: 3, tipo: TipoOcupacion.HORA, estado: 1, estadoCalculado: 2, saldo: 180 },
      { id: 4, tipo: TipoOcupacion.MES, estado: 1, saldo: 0 },
    ]);
    expect([...ids].sort()).toEqual([1, 3]);
  });
  it("contarSituaciones cuenta por situación", () => {
    const m = contarSituaciones([1, 1, 2]);
    expect(m.get(1)).toBe(2);
    expect(m.get(2)).toBe(1);
  });
});

describe("lineaHorario y formatInstantTime", () => {
  it("hora en la zona del tenant", () => {
    expect(formatInstantTime("2026-11-18T15:30:00.000Z", "America/Montevideo")).toBe("12:30");
    expect(formatInstantTime("", "America/Montevideo")).toBe("");
  });
  it("Desde HH:mm, con Hasta en una reserva, o null", () => {
    const f = () => "09:50";
    const ocupada = tarjetaInfo(
      { estado: EstadoCochera.OCUPADA, ocupacionActiva: { clienteNombre: "A", inicio: "2026-11-18T10:00:00.000Z" } },
      NOW,
    );
    expect(lineaHorario(ocupada, f)).toBe("Desde 09:50");
    const reserva = tarjetaInfo(
      {
        estado: EstadoCochera.RESERVADA,
        ocupacionActiva: { clienteNombre: "A", inicio: "2026-11-19T10:00:00.000Z", fin: "2026-11-19T12:00:00.000Z" },
      },
      NOW,
    );
    expect(lineaHorario(reserva, f)).toBe("Desde 09:50 · Hasta 09:50");
    expect(lineaHorario(tarjetaInfo({ estado: EstadoCochera.DISPONIBLE }, NOW), f)).toBeNull();
  });
});

describe("cocheraLink, iniciales y EstadoTarifa", () => {
  it("buildCocheraPath y parseCocheraId", () => {
    expect(buildCocheraPath(12)).toBe("/cocheras?cochera=12");
    expect(buildCocheraPath("x")).toBe("/cocheras");
    expect(parseCocheraId("?cochera=12")).toBe(12);
    expect(parseCocheraId("?cochera=0")).toBeNull();
    expect(parseCocheraId("")).toBeNull();
  });
  it("iniciales", () => {
    expect(iniciales("Valentina Pérez")).toBe("VP");
    expect(iniciales("Pablo")).toBe("P");
    expect(iniciales("Ana María de la Paz")).toBe("AP");
    expect(iniciales("")).toBe("?");
    expect(iniciales(null)).toBe("?");
  });
  it("EstadoTarifa tiene las etiquetas y colores de los chips", () => {
    expect(labelOf(EstadoTarifa, "programada")).toBe("Programada");
    expect(colorOf(EstadoTarifa, "vigente")).toBe("success");
    expect(colorOf(EstadoTarifa, "finalizada")).toBe("default");
  });
});

describe("registrarIngreso", () => {
  it("el abono es Mes; el ingreso rápido, Hora o Día", () => {
    expect(tipoDeRegistro(REGISTRO.ABONO, TipoOcupacion.DIA)).toBe(TipoOcupacion.MES);
    expect(tipoDeRegistro(REGISTRO.RAPIDO, TipoOcupacion.DIA)).toBe(TipoOcupacion.DIA);
    expect(tipoDeRegistro(REGISTRO.RAPIDO, 99)).toBe(TipoOcupacion.HORA);
  });
  it("regla de cobro", () => {
    expect(reglaDeCobro(REGISTRO.ABONO)).toBe("se cobra por adelantado");
    expect(reglaDeCobro(REGISTRO.RAPIDO)).toBe("se cobra al salir");
  });
  it("fecha y hora se unen y se separan", () => {
    expect(joinFechaHora("2026-11-19", "10:05")).toBe("2026-11-19T10:05");
    expect(joinFechaHora("", "10:05")).toBe("");
    expect(splitInicio("2026-11-19T10:05")).toEqual({ fecha: "2026-11-19", hora: "10:05" });
    expect(splitInicio("")).toEqual({ fecha: "", hora: "" });
  });
  it("el formulario es abierto, sin excepcional, y se completa con cliente, cochera e inicio", () => {
    const form = buildFormRegistro({
      registro: REGISTRO.ABONO,
      tipoRapido: TipoOcupacion.HORA,
      cliente: { id: 3 },
      cocheraId: "5",
      inicio: "2026-11-19T10:05",
    });
    expect(form).toMatchObject({ tipo: TipoOcupacion.MES, sinFin: true, excepcional: false, cocheraId: "5" });
    expect(datosCompletos({ cliente: { id: 3 }, cocheraId: "5", inicio: "2026-11-19T10:05" })).toBe(true);
    expect(datosCompletos({ cliente: null, cocheraId: "5", inicio: "x" })).toBe(false);
    expect(datosCompletos({ cliente: { id: 3 }, cocheraId: "", inicio: "x" })).toBe(false);
  });
});

describe("motivoConfirmarIngreso", () => {
  it("con todos los datos da null", () => {
    expect(motivoConfirmarIngreso({ cliente: { id: 3 }, cocheraId: "5", inicio: "2026-11-19T10:05" })).toBeNull();
  });
  it("si falta uno, da su nombre", () => {
    expect(motivoConfirmarIngreso({ cliente: null, cocheraId: "5", inicio: "x" })).toBe("Falta elegir: cliente");
    expect(motivoConfirmarIngreso({ cliente: { id: 3 }, cocheraId: "", inicio: "x" })).toBe("Falta elegir: cochera");
    expect(motivoConfirmarIngreso({ cliente: { id: 3 }, cocheraId: "5", inicio: "" })).toBe("Falta elegir: inicio");
  });
  it("si faltan varios, los lista en orden", () => {
    expect(motivoConfirmarIngreso({ cliente: null, cocheraId: "", inicio: "" })).toBe("Falta elegir: cliente, cochera, inicio");
    expect(motivoConfirmarIngreso({ cliente: { id: 3 }, cocheraId: null, inicio: "" })).toBe("Falta elegir: cochera, inicio");
  });
  it("cocheraId 0 cuenta como elegido", () => {
    expect(motivoConfirmarIngreso({ cliente: { id: 3 }, cocheraId: 0, inicio: "x" })).toBeNull();
  });
});
