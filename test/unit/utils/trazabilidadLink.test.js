import { describe, expect, it } from "vitest";
import {
  TRAZABILIDAD_PATH,
  buildTrazabilidadPath,
  parseTrazabilidadQuery,
} from "../../../src/utils/trazabilidadLink.js";

describe("buildTrazabilidadPath", () => {
  it("1: un id y sin filtros", () => {
    expect(buildTrazabilidadPath({ ocupacionId: 12 })).toBe("/trazabilidad?ocupacionId=12");
    expect(buildTrazabilidadPath({})).toBe("/trazabilidad");
    expect(buildTrazabilidadPath()).toBe("/trazabilidad");
    expect(TRAZABILIDAD_PATH).toBe("/trazabilidad");
  });

  it("2: orden fijo, y omite vacíos, null, undefined e ids inválidos sin lanzar", () => {
    expect(buildTrazabilidadPath({ fuente: ["PAGO", "DEVOLUCION"], pagoId: 40 })).toBe(
      "/trazabilidad?pagoId=40&fuente=PAGO&fuente=DEVOLUCION",
    );
    expect(
      buildTrazabilidadPath({ ocupacionId: "", pagoId: null, cajaSesionId: undefined, usuarioId: 0 }),
    ).toBe("/trazabilidad");
    expect(buildTrazabilidadPath({ ocupacionId: -1, pagoId: 1.5, cajaSesionId: "abc" })).toBe("/trazabilidad");
    expect(buildTrazabilidadPath({ ocupacionId: "7" })).toBe("/trazabilidad?ocupacionId=7");
  });

  it("orden completo: ids, fuente, desde y hasta", () => {
    expect(
      buildTrazabilidadPath({
        hasta: "2026-11-15",
        desde: "2026-11-01",
        fuente: ["CAJA"],
        usuarioId: 3,
        cajaSesionId: 7,
        pagoId: 40,
        ocupacionId: 12,
      }),
    ).toBe(
      "/trazabilidad?ocupacionId=12&pagoId=40&cajaSesionId=7&usuarioId=3&fuente=CAJA&desde=2026-11-01&hasta=2026-11-15",
    );
  });

  it("omite fuentes desconocidas y un rango incompleto o invertido", () => {
    expect(buildTrazabilidadPath({ fuente: ["XYZ", "pago", "PAGO"] })).toBe("/trazabilidad?fuente=PAGO");
    expect(buildTrazabilidadPath({ desde: "2026-11-01" })).toBe("/trazabilidad");
    expect(buildTrazabilidadPath({ desde: "2026-11-10", hasta: "2026-11-01" })).toBe("/trazabilidad");
    expect(buildTrazabilidadPath({ desde: "2026-02-30", hasta: "2026-03-01" })).toBe("/trazabilidad");
  });
});

describe("parseTrazabilidadQuery", () => {
  it("3: normaliza las fuentes y quita repetidos", () => {
    const r = parseTrazabilidadQuery("?fuente=pago&fuente=CAJA&fuente=PAGO");
    expect(r.filtros.fuente).toEqual(["PAGO", "CAJA"]);
    expect(r.ignorados).toEqual([]);
  });

  it("4: ignora ids, fuente y fechas inválidos y los informa", () => {
    const r = parseTrazabilidadQuery("?ocupacionId=abc&fuente=XYZ&desde=2026-02-30&hasta=2026-03-01");
    expect(r.filtros).toEqual({});
    expect(r.ignorados).toEqual(["ocupacionId", "fuente", "desde", "hasta"]);
  });

  it("una fuente válida y otra desconocida: conserva la válida e informa", () => {
    const r = parseTrazabilidadQuery("?fuente=PAGO&fuente=XYZ");
    expect(r.filtros.fuente).toEqual(["PAGO"]);
    expect(r.ignorados).toEqual(["fuente"]);
  });

  it("5: solo desde, y desde mayor que hasta, ignoran los dos extremos", () => {
    const soloDesde = parseTrazabilidadQuery("?desde=2026-11-01");
    expect(soloDesde.filtros).toEqual({});
    expect(soloDesde.ignorados).toEqual(["desde", "hasta"]);
    const invertido = parseTrazabilidadQuery("?desde=2026-11-10&hasta=2026-11-01");
    expect(invertido.filtros).toEqual({});
    expect(invertido.ignorados).toEqual(["desde", "hasta"]);
  });

  it("lee ids válidos como números y trata lo vacío como ausente", () => {
    const r = parseTrazabilidadQuery("ocupacionId=12&pagoId=&usuarioId=3");
    expect(r.filtros).toEqual({ ocupacionId: 12, usuarioId: 3 });
    expect(r.ignorados).toEqual([]);
    expect(parseTrazabilidadQuery("").filtros).toEqual({});
    expect(parseTrazabilidadQuery(new URLSearchParams("cajaSesionId=7")).filtros).toEqual({ cajaSesionId: 7 });
  });

  it("ids inválidos: cero, negativo, decimal", () => {
    const r = parseTrazabilidadQuery("?ocupacionId=0&pagoId=-1&cajaSesionId=1.5");
    expect(r.filtros).toEqual({});
    expect(r.ignorados).toEqual(["ocupacionId", "pagoId", "cajaSesionId"]);
  });

  it("6: ida y vuelta con todos los campos", () => {
    const f = {
      ocupacionId: 12,
      pagoId: 40,
      cajaSesionId: 7,
      usuarioId: 3,
      fuente: ["PAGO", "CAJA"],
      desde: "2026-11-01",
      hasta: "2026-11-15",
    };
    const path = buildTrazabilidadPath(f);
    const r = parseTrazabilidadQuery(path.slice(path.indexOf("?")));
    expect(r.filtros).toEqual(f);
    expect(r.ignorados).toEqual([]);
  });
});
