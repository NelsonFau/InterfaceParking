import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import { listClientes } from "../../../src/api/clienteApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listClientes", () => {
  it("hace GET /Cliente con los params y devuelve la página", async () => {
    const data = { items: [{ id: 1 }], total: 1, page: 1, pageSize: 20 };
    http.get.mockResolvedValue({ data });
    await expect(listClientes({ q: "ana", activos: true, page: 1, pageSize: 20 })).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Cliente", {
      params: { q: "ana", activos: true, page: 1, pageSize: 20 },
    });
  });

  it("omite lo vacío y conserva false", async () => {
    http.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20 } });
    await listClientes({ q: "", activos: false });
    expect(http.get).toHaveBeenCalledWith("/Cliente", { params: { activos: false } });
  });

  it("una respuesta que no es paginada lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: [] });
    const err = await listClientes({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listClientes({})).rejects.toBe(boom);
  });
});
