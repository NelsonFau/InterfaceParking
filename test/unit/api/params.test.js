import { beforeAll, describe, expect, it, vi } from "vitest";
import { cleanParams } from "../../../src/api/params.js";

describe("cleanParams", () => {
  it("quita undefined, null y vacío", () => {
    expect(cleanParams({ q: "", a: undefined, b: null, c: "x" })).toEqual({ c: "x" });
  });

  it("conserva false y 0", () => {
    expect(cleanParams({ activos: false, page: 0, q: "" })).toEqual({ activos: false, page: 0 });
  });

  it("conserva los arreglos", () => {
    expect(cleanParams({ fuente: ["PAGO", "CAJA"] })).toEqual({ fuente: ["PAGO", "CAJA"] });
  });

  it("no modifica el objeto recibido", () => {
    const original = { q: "", page: 1 };
    cleanParams(original);
    expect(original).toEqual({ q: "", page: 1 });
  });

  it("acepta undefined y null", () => {
    expect(cleanParams(undefined)).toEqual({});
    expect(cleanParams(null)).toEqual({});
  });
});

describe("paramsSerializer de http (P-FB-L2)", () => {
  let http;

  beforeAll(async () => {
    // http.js valida la configuración al crearse: se fijan variables de prueba, sin leer el .env.
    vi.stubEnv("VITE_API_BASE_URL", "https://localhost:7076/api/v1");
    vi.stubEnv("VITE_AUTH0_DOMAIN", "test.example.com");
    vi.stubEnv("VITE_AUTH0_CLIENT_ID", "client");
    vi.stubEnv("VITE_AUTH0_AUDIENCE", "audience");
    ({ http } = await import("../../../src/api/http.js"));
  });

  it("repite la clave de un arreglo, sin corchetes", () => {
    const uri = http.getUri({ url: "/Trazabilidad", params: { fuente: ["PAGO", "CAJA"] } });
    expect(uri).toContain("fuente=PAGO&fuente=CAJA");
    expect(uri).not.toContain("fuente[]");
    expect(uri).not.toContain("fuente%5B");
  });

  it("los valores simples no cambian", () => {
    const uri = http.getUri({ url: "/Cliente", params: { q: "ana", page: 2, activos: false } });
    expect(uri).toContain("q=ana");
    expect(uri).toContain("page=2");
    expect(uri).toContain("activos=false");
  });
});
