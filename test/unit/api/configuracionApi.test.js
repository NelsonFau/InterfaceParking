import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), put: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import { getConfiguracion, updateConfiguracion } from "../../../src/api/configuracionApi.js";

const config = { zonaHoraria: "America/Montevideo", modoCaja: 1, version: "AAAAAAAB=" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getConfiguracion", () => {
  it("hace GET /Configuracion y devuelve el objeto", async () => {
    http.get.mockResolvedValue({ data: config });
    await expect(getConfiguracion()).resolves.toBe(config);
    expect(http.get).toHaveBeenCalledWith("/Configuracion");
  });

  it.each([
    ["no es un objeto", ""],
    ["falta la zona", { modoCaja: 1, version: "x" }],
    ["modoCaja no es número", { zonaHoraria: "A", modoCaja: "1", version: "x" }],
    ["falta la version", { zonaHoraria: "A", modoCaja: 1 }],
  ])("una respuesta que %s lanza respuesta_invalida", async (_t, data) => {
    http.get.mockResolvedValue({ data });
    const err = await getConfiguracion().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(getConfiguracion()).rejects.toBe(boom);
  });
});

describe("updateConfiguracion", () => {
  it("hace PUT /Configuracion con el cuerpo tal cual y devuelve la configuración", async () => {
    const body = { zonaHoraria: "America/Montevideo", modoCaja: 1, version: "AAAAAAAB=", topePasadoDias: 60 };
    const copia = { ...body };
    http.put.mockResolvedValue({ data: config });
    await expect(updateConfiguracion(body)).resolves.toBe(config);
    expect(http.put).toHaveBeenCalledWith("/Configuracion", body);
    expect(body).toEqual(copia);
  });

  it("una respuesta inválida lanza respuesta_invalida", async () => {
    http.put.mockResolvedValue({ data: {} });
    const err = await updateConfiguracion({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.put.mockRejectedValue(boom);
    await expect(updateConfiguracion({})).rejects.toBe(boom);
  });
});
