import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import {
  createCocheras,
  getCochera,
  listCocheras,
  listCocherasDisponibles,
  setEstadoCochera,
  updateCochera,
} from "../../../src/api/cocheraApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listCocheras", () => {
  it("hace GET /Cochera y devuelve data", async () => {
    const data = [{ id: 1, numero: 1, estado: 1 }];
    http.get.mockResolvedValue({ data });
    await expect(listCocheras()).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Cochera");
  });

  it("una respuesta que no es un arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: { items: [] } });
    const err = await listCocheras().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listCocheras()).rejects.toBe(boom);
  });
});

describe("getCochera", () => {
  it("con historialTake lo manda en params", async () => {
    const data = { id: 5, historial: [] };
    http.get.mockResolvedValue({ data });
    await expect(getCochera(5, { historialTake: 20 })).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Cochera/5", { params: { historialTake: 20 } });
  });

  it("sin opciones no manda params", async () => {
    http.get.mockResolvedValue({ data: { id: 5 } });
    await getCochera(5);
    expect(http.get).toHaveBeenCalledWith("/Cochera/5");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(getCochera(5)).rejects.toBe(boom);
  });
});

describe("createCocheras", () => {
  it("hace POST /Cochera con el cuerpo sin modificarlo y devuelve el arreglo", async () => {
    const body = { desde: 1, hasta: 3 };
    const data = [{ id: 1, numero: 1, estado: 1 }];
    http.post.mockResolvedValue({ data });
    await expect(createCocheras(body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Cochera", body);
    expect(http.post.mock.calls[0][1]).toBe(body);
    expect(body).toEqual({ desde: 1, hasta: 3 });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(createCocheras({ desde: 1 })).rejects.toBe(boom);
  });
});

describe("updateCochera", () => {
  it("hace PUT /Cochera/5 y devuelve undefined", async () => {
    const body = { numero: 7, nota: null };
    http.put.mockResolvedValue({ data: "" });
    await expect(updateCochera(5, body)).resolves.toBeUndefined();
    expect(http.put).toHaveBeenCalledWith("/Cochera/5", body);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.put.mockRejectedValue(boom);
    await expect(updateCochera(5, {})).rejects.toBe(boom);
  });
});

describe("setEstadoCochera", () => {
  it("hace PUT /Cochera/5/estado y devuelve undefined", async () => {
    const body = { estado: 2, nota: "en reparación" };
    http.put.mockResolvedValue({ data: "" });
    await expect(setEstadoCochera(5, body)).resolves.toBeUndefined();
    expect(http.put).toHaveBeenCalledWith("/Cochera/5/estado", body);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.put.mockRejectedValue(boom);
    await expect(setEstadoCochera(5, {})).rejects.toBe(boom);
  });
});

describe("listCocherasDisponibles", () => {
  it("hace GET /Cochera/disponibles con desde y hasta", async () => {
    const data = [{ id: 1, numero: 1 }];
    http.get.mockResolvedValue({ data });
    const desde = "2026-11-18T15:00:00.000Z";
    const hasta = "2026-11-18T18:00:00.000Z";
    await expect(listCocherasDisponibles({ desde, hasta })).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Cochera/disponibles", { params: { desde, hasta } });
  });

  it("una respuesta que no es un arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: null });
    const err = await listCocherasDisponibles({ desde: "a", hasta: "b" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listCocherasDisponibles({ desde: "a", hasta: "b" })).rejects.toBe(boom);
  });
});
