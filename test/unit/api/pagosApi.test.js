import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import { http } from "../../../src/api/http.js";
import { createPago, pagosApi } from "../../../src/api/pagosApi.js";

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

describe("pagosApi (objeto de la spec anterior, intacto)", () => {
  it("sigue exportando crear, getCajaDiaria y anular", () => {
    expect(Object.keys(pagosApi).sort()).toEqual(["anular", "crear", "getCajaDiaria"]);
  });

  it("conserva sus llamadas", () => {
    pagosApi.crear({ a: 1 });
    expect(http.post).toHaveBeenCalledWith("/Pagos", { a: 1 });
    pagosApi.getCajaDiaria("2026-11-18");
    expect(http.get).toHaveBeenCalledWith("/Pagos/caja-diaria", { params: { fecha: "2026-11-18" } });
    pagosApi.anular(5, "error");
    expect(http.patch).toHaveBeenCalledWith("/Pagos/5/anular", { motivo: "error" });
  });
});
