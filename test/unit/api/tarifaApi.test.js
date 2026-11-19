import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import {
  listTarifaHistorial,
  listTarifasVigentes,
  removeTarifa,
  updateTarifa,
} from "../../../src/api/tarifaApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listTarifasVigentes", () => {
  it("hace GET /Tarifa/vigentes y devuelve data", async () => {
    const data = [{ tipo: 1, vigente: null, proxima: null }];
    http.get.mockResolvedValue({ data });
    await expect(listTarifasVigentes()).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Tarifa/vigentes");
  });

  it("una respuesta que no es un arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: { items: [] } });
    const err = await listTarifasVigentes().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores: un rechazo de http se propaga", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listTarifasVigentes()).rejects.toBe(boom);
  });
});

describe("listTarifaHistorial", () => {
  it("hace GET /Tarifa/historial con params { tipo }", async () => {
    const data = [{ id: 1 }];
    http.get.mockResolvedValue({ data });
    await expect(listTarifaHistorial(2)).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Tarifa/historial", { params: { tipo: 2 } });
  });

  it("una respuesta que no es un arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: null });
    const err = await listTarifaHistorial(1).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listTarifaHistorial(1)).rejects.toBe(boom);
  });
});

describe("updateTarifa", () => {
  it("hace PUT /Tarifa con el cuerpo recibido, sin modificarlo", async () => {
    const body = { tipo: 1, nuevoPrecio: 120 };
    const data = { id: 5, tipo: 1, precio: 120 };
    http.put.mockResolvedValue({ data });
    await expect(updateTarifa(body)).resolves.toBe(data);
    expect(http.put).toHaveBeenCalledWith("/Tarifa", body);
    expect(http.put.mock.calls[0][1]).toBe(body);
    expect(body).toEqual({ tipo: 1, nuevoPrecio: 120 });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.put.mockRejectedValue(boom);
    await expect(updateTarifa({ tipo: 1, nuevoPrecio: 1 })).rejects.toBe(boom);
  });
});

describe("removeTarifa", () => {
  it("hace DELETE /Tarifa/7 y devuelve undefined", async () => {
    http.delete.mockResolvedValue({ data: "" });
    await expect(removeTarifa(7)).resolves.toBeUndefined();
    expect(http.delete).toHaveBeenCalledWith("/Tarifa/7");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.delete.mockRejectedValue(boom);
    await expect(removeTarifa(7)).rejects.toBe(boom);
  });
});
