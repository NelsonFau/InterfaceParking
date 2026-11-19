import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import {
  closeCaja,
  getCajaActual,
  getCajaEsperado,
  getCajaSesion,
  listCajaSesiones,
  openCaja,
  reopenCaja,
} from "../../../src/api/cajaApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getCajaActual", () => {
  it("hace GET /Caja/actual y devuelve data", async () => {
    const data = { modo: 1, sesion: null, fondoPropuesto: 500 };
    http.get.mockResolvedValue({ data });
    await expect(getCajaActual()).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Caja/actual");
  });

  it("una respuesta sin modo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: {} });
    await expect(getCajaActual()).rejects.toMatchObject({ code: "respuesta_invalida" });
    http.get.mockResolvedValue({ data: null });
    await expect(getCajaActual()).rejects.toBeInstanceOf(ApiError);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(getCajaActual()).rejects.toBe(boom);
  });
});

describe("listCajaSesiones", () => {
  it("pasa los DateOnly sin convertir, filtra vacíos y devuelve la página", async () => {
    const data = { items: [{ id: 1 }], total: 1, page: 1, pageSize: 20 };
    http.get.mockResolvedValue({ data });
    const r = await listCajaSesiones({ desde: "2026-11-01", hasta: "2026-11-19", page: 1, pageSize: 20, extra: "", otro: undefined });
    expect(r).toEqual({ items: [{ id: 1 }], total: 1, page: 1, pageSize: 20 });
    expect(http.get).toHaveBeenCalledWith("/Caja/sesiones", {
      params: { desde: "2026-11-01", hasta: "2026-11-19", page: 1, pageSize: 20 },
    });
  });

  it("una respuesta que no es paginada lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: [] });
    await expect(listCajaSesiones({ desde: "a", hasta: "b" })).rejects.toMatchObject({ code: "respuesta_invalida" });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listCajaSesiones({})).rejects.toBe(boom);
  });
});

describe("getCajaSesion", () => {
  it("hace GET /Caja/sesiones/{id} y acepta movimientos null", async () => {
    const data = { sesion: { id: 12 }, historial: [], movimientos: null };
    http.get.mockResolvedValue({ data });
    await expect(getCajaSesion(12)).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Caja/sesiones/12");
  });

  it("acepta movimientos como arreglo", async () => {
    const data = { sesion: { id: 12 }, historial: [{ tipo: 1 }], movimientos: [] };
    http.get.mockResolvedValue({ data });
    await expect(getCajaSesion(12)).resolves.toBe(data);
  });

  it("sin historial arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: { sesion: { id: 12 }, movimientos: null } });
    await expect(getCajaSesion(12)).rejects.toMatchObject({ code: "respuesta_invalida" });
    http.get.mockResolvedValue({ data: { historial: [] } });
    await expect(getCajaSesion(12)).rejects.toMatchObject({ code: "respuesta_invalida" });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(getCajaSesion(1)).rejects.toBe(boom);
  });
});

describe("getCajaEsperado", () => {
  it("hace GET /Caja/sesiones/{id}/esperado y devuelve data", async () => {
    const data = { sesionId: 12, efectivoEsperado: 1500 };
    http.get.mockResolvedValue({ data });
    await expect(getCajaEsperado(12)).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Caja/sesiones/12/esperado");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(getCajaEsperado(1)).rejects.toBe(boom);
  });
});

describe("openCaja, closeCaja y reopenCaja", () => {
  it("openCaja hace POST /Caja/abrir con el cuerpo sin modificarlo", async () => {
    const body = { fondoInicial: 500, observacion: "x" };
    const data = { id: 3 };
    http.post.mockResolvedValue({ data });
    await expect(openCaja(body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Caja/abrir", body);
    expect(body).toEqual({ fondoInicial: 500, observacion: "x" });
  });

  it("closeCaja hace POST /Caja/sesiones/{id}/cerrar", async () => {
    const body = { efectivoContado: 1050.5, fondoSiguiente: 500 };
    const data = { diferencia: 0 };
    http.post.mockResolvedValue({ data });
    await expect(closeCaja(12, body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Caja/sesiones/12/cerrar", body);
  });

  it("reopenCaja hace POST /Caja/sesiones/{id}/reabrir", async () => {
    const data = { id: 12 };
    http.post.mockResolvedValue({ data });
    await expect(reopenCaja(12, { motivo: "Error de conteo" })).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Caja/sesiones/12/reabrir", { motivo: "Error de conteo" });
  });

  it("ninguna captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(openCaja({})).rejects.toBe(boom);
    await expect(closeCaja(1, {})).rejects.toBe(boom);
    await expect(reopenCaja(1, {})).rejects.toBe(boom);
  });
});
