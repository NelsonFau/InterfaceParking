import { readFileSync } from "node:fs";
import axios from "axios";
import { describe, expect, it } from "vitest";
import { PARAMS_SERIALIZER, cleanParams } from "../../../src/api/params.js";

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

// P-FB-L2. Se prueba con axios y las opciones exportadas, sin importar `http.js` (que valida la
// configuración y carga Auth0): así el test no depende de la velocidad de la máquina.
describe("PARAMS_SERIALIZER (P-FB-L2)", () => {
  const instancia = axios.create({ baseURL: "https://localhost:7076/api/v1", paramsSerializer: PARAMS_SERIALIZER });

  it("repite la clave de un arreglo, sin corchetes", () => {
    const uri = instancia.getUri({ url: "/Trazabilidad", params: { fuente: ["PAGO", "CAJA"] } });
    expect(uri).toContain("fuente=PAGO&fuente=CAJA");
    expect(uri).not.toContain("fuente[]");
    expect(uri).not.toContain("fuente%5B");
  });

  it("los valores simples no cambian", () => {
    const uri = instancia.getUri({ url: "/Cliente", params: { q: "ana", page: 2, activos: false } });
    expect(uri).toContain("q=ana");
    expect(uri).toContain("page=2");
    expect(uri).toContain("activos=false");
  });

  it("sin el serializador, axios usa corchetes (por eso existe)", () => {
    const uri = axios.getUri({ url: "/Trazabilidad", params: { fuente: ["PAGO", "CAJA"] } });
    expect(uri).toMatch(/fuente(\[\]|%5B%5D)=PAGO/);
  });

  it("http.js usa estas opciones", () => {
    const fuente = readFileSync(new URL("../../../src/api/http.js", import.meta.url), "utf8");
    expect(fuente).toContain("paramsSerializer: PARAMS_SERIALIZER");
  });
});
