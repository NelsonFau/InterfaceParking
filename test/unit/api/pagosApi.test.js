import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import {
  anularPago,
  createDevolucion,
  createPago,
  getPago,
  listPagosByOcupacion,
  pagosApi,
} from "../../../src/api/pagosApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createPago", () => {
  it("hace POST /Pagos y devuelve data", async () => {
    const body = { ocupacionId: 7, monto: 1500, metodo: 1 };
    const data = { id: 99 };
    http.post.mockResolvedValue({ data });
    await expect(createPago(body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Pagos", body);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(createPago({})).rejects.toBe(boom);
  });
});

describe("listPagosByOcupacion", () => {
  it("hace GET /Pagos/ocupacion/{id} y devuelve el arreglo", async () => {
    const data = [{ id: 1 }, { id: 2 }];
    http.get.mockResolvedValue({ data });
    await expect(listPagosByOcupacion(7)).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Pagos/ocupacion/7");
  });

  it("acepta una lista vacía", async () => {
    http.get.mockResolvedValue({ data: [] });
    await expect(listPagosByOcupacion(7)).resolves.toEqual([]);
  });

  it("una respuesta que no es un arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: { id: 1 } });
    const error = await listPagosByOcupacion(7).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listPagosByOcupacion(7)).rejects.toBe(boom);
  });
});

describe("getPago", () => {
  it("hace GET /Pagos/{id} y devuelve data", async () => {
    const data = { id: 40, historial: [], devoluciones: [] };
    http.get.mockResolvedValue({ data });
    await expect(getPago(40)).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Pagos/40");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(getPago(40)).rejects.toBe(boom);
  });
});

describe("anularPago", () => {
  it("hace PATCH /Pagos/{id}/anular con { motivo } y devuelve undefined", async () => {
    http.patch.mockResolvedValue({ status: 204, data: "" });
    await expect(anularPago(40, { motivo: "Cobro duplicado" })).resolves.toBeUndefined();
    expect(http.patch).toHaveBeenCalledWith("/Pagos/40/anular", { motivo: "Cobro duplicado" });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.patch.mockRejectedValue(boom);
    await expect(anularPago(40, { motivo: "x" })).rejects.toBe(boom);
  });
});

describe("createDevolucion", () => {
  it("hace POST /Pagos/{id}/devoluciones con el cuerpo sin modificarlo y devuelve data", async () => {
    const body = { monto: 500, metodo: 1, motivo: "Devolución del mensual" };
    const data = { id: 3, pagoId: 40 };
    http.post.mockResolvedValue({ data });
    await expect(createDevolucion(40, body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Pagos/40/devoluciones", body);
    expect(body).toEqual({ monto: 500, metodo: 1, motivo: "Devolución del mensual" });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(createDevolucion(40, {})).rejects.toBe(boom);
  });
});

describe("pagosApi (export de compatibilidad @deprecated, se retira con la spec 09)", () => {
  it("solo exporta getCajaDiaria y anular (crear se retiró)", () => {
    expect(Object.keys(pagosApi).sort()).toEqual(["anular", "getCajaDiaria"]);
  });

  it("getCajaDiaria devuelve la respuesta de axios entera", async () => {
    const respuesta = { data: [], status: 200 };
    http.get.mockResolvedValue(respuesta);
    await expect(pagosApi.getCajaDiaria("2026-11-18")).resolves.toBe(respuesta);
    expect(http.get).toHaveBeenCalledWith("/Pagos/caja-diaria", { params: { fecha: "2026-11-18" } });
  });

  it("anular delega en anularPago", async () => {
    http.patch.mockResolvedValue({ status: 204 });
    await pagosApi.anular(40, "motivo");
    expect(http.patch).toHaveBeenCalledWith("/Pagos/40/anular", { motivo: "motivo" });
  });
});
