import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/api/http.js", () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

import { ApiError } from "../../../src/api/errors.js";
import { http } from "../../../src/api/http.js";
import {
  adjustOcupacionPrecio,
  adjustPreciosMensuales,
  cancelOcupacion,
  createOcupacion,
  finalizeOcupacion,
  getOcupacion,
  listOcupaciones,
  setOcupacionFin,
} from "../../../src/api/ocupacionApi.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listOcupaciones", () => {
  it("hace GET /Ocupacion con los params, sin claves vacías", async () => {
    const data = [{ id: 1 }];
    http.get.mockResolvedValue({ data });
    await expect(listOcupaciones({ estado: 1, take: 200, cocheraId: undefined, desde: "", clienteId: null })).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Ocupacion", { params: { estado: 1, take: 200 } });
  });

  it("conserva el 0 de venceEnDias", async () => {
    http.get.mockResolvedValue({ data: [] });
    await listOcupaciones({ venceEnDias: 0 });
    expect(http.get).toHaveBeenCalledWith("/Ocupacion", { params: { venceEnDias: 0 } });
  });

  it("una respuesta que no es un arreglo lanza respuesta_invalida", async () => {
    http.get.mockResolvedValue({ data: { items: [] } });
    const err = await listOcupaciones({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("respuesta_invalida");
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.get.mockRejectedValue(boom);
    await expect(listOcupaciones({})).rejects.toBe(boom);
  });
});

describe("getOcupacion", () => {
  it("hace GET /Ocupacion/7 y devuelve data", async () => {
    const data = { id: 7 };
    http.get.mockResolvedValue({ data });
    await expect(getOcupacion(7)).resolves.toBe(data);
    expect(http.get).toHaveBeenCalledWith("/Ocupacion/7");
  });
});

describe("createOcupacion", () => {
  it("hace POST /Ocupacion con el cuerpo sin modificarlo y devuelve la respuesta", async () => {
    const body = { cocheraId: 5, clienteId: 9, tipo: 1, inicio: "2026-11-18T15:00:00.000Z", usarTarifaExcepcional: false };
    const copia = structuredClone(body);
    const data = { id: 30 };
    http.post.mockResolvedValue({ data });
    await expect(createOcupacion(body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Ocupacion", body);
    expect(body).toEqual(copia);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(createOcupacion({})).rejects.toBe(boom);
  });
});

describe("cancelOcupacion", () => {
  it("hace POST /Ocupacion/7/cancelar con { motivo } y devuelve undefined", async () => {
    http.post.mockResolvedValue({ data: "" });
    await expect(cancelOcupacion(7, { motivo: "avisó" })).resolves.toBeUndefined();
    expect(http.post).toHaveBeenCalledWith("/Ocupacion/7/cancelar", { motivo: "avisó" });
  });
});

describe("finalizeOcupacion", () => {
  it("sin cuerpo no manda cuerpo", async () => {
    http.post.mockResolvedValue({ data: "" });
    await expect(finalizeOcupacion(7)).resolves.toBeUndefined();
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post.mock.calls[0]).toEqual(["/Ocupacion/7/finalizar"]);
  });

  it("con cuerpo lo manda", async () => {
    http.post.mockResolvedValue({ data: "" });
    await finalizeOcupacion(7, { resolucionExcedente: 2 });
    expect(http.post).toHaveBeenCalledWith("/Ocupacion/7/finalizar", { resolucionExcedente: 2 });
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(finalizeOcupacion(7)).rejects.toBe(boom);
  });
});

describe("adjustOcupacionPrecio", () => {
  it("hace POST /Ocupacion/{id}/precio con el cuerpo sin tocar y devuelve data", async () => {
    const data = { id: 1, ocupacionId: 7, vigenteDesde: "2026-12-01", precioAnterior: 1000, precioNuevo: 1500 };
    http.post.mockResolvedValue({ data });
    const body = { vigenteDesde: "2026-12-01", precioUnitario: 1500, motivo: "x" };
    await expect(adjustOcupacionPrecio(7, body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Ocupacion/7/precio", body);
    expect(http.post.mock.calls[0][1]).toBe(body);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(adjustOcupacionPrecio(7, {})).rejects.toBe(boom);
  });
});

describe("setOcupacionFin", () => {
  it("hace PUT /Ocupacion/{id}/fin con el instante y devuelve data", async () => {
    const data = { ocupacionId: 7, fin: "2027-03-31T21:00:00.000Z" };
    http.put.mockResolvedValue({ data });
    await expect(setOcupacionFin(7, { fin: "2027-03-31T21:00:00.000Z" })).resolves.toBe(data);
    expect(http.put).toHaveBeenCalledWith("/Ocupacion/7/fin", { fin: "2027-03-31T21:00:00.000Z" });
  });

  it("manda la clave fin con null para quitar la baja", async () => {
    http.put.mockResolvedValue({ data: { ocupacionId: 7, fin: null } });
    await setOcupacionFin(7, { fin: null });
    const sent = http.put.mock.calls[0][1];
    expect(sent).toEqual({ fin: null });
    expect("fin" in sent).toBe(true);
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.put.mockRejectedValue(boom);
    await expect(setOcupacionFin(7, { fin: null })).rejects.toBe(boom);
  });
});

describe("adjustPreciosMensuales", () => {
  it("hace POST /Ocupacion/ajuste-precio y devuelve { cantidad, contratos }", async () => {
    const data = { cantidad: 1, contratos: [{ id: 0, ocupacionId: 5, vigenteDesde: "2026-12-01", precioAnterior: 1000, precioNuevo: 1100 }] };
    http.post.mockResolvedValue({ data });
    const body = { vigenteDesde: "2026-12-01", porcentaje: 10, motivo: "x", excluir: [3] };
    await expect(adjustPreciosMensuales(body)).resolves.toBe(data);
    expect(http.post).toHaveBeenCalledWith("/Ocupacion/ajuste-precio", body);
  });

  it("una respuesta sin cantidad numérico o sin contratos arreglo lanza respuesta_invalida", async () => {
    for (const data of [{ contratos: [] }, { cantidad: "1", contratos: [] }, { cantidad: 0 }, { cantidad: 0, contratos: {} }, null]) {
      http.post.mockResolvedValue({ data });
      const err = await adjustPreciosMensuales({}).catch((e) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe("respuesta_invalida");
    }
  });

  it("no captura errores", async () => {
    const boom = new Error("boom");
    http.post.mockRejectedValue(boom);
    await expect(adjustPreciosMensuales({})).rejects.toBe(boom);
  });
});
