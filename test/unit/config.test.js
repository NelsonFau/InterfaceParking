import { describe, expect, it } from "vitest";
import { validateConfig } from "../../src/config.js";

const valid = {
  VITE_API_BASE_URL: "https://localhost:7076/api/v1",
  VITE_AUTH0_DOMAIN: "parkingcontrol-dev.us.auth0.com",
  VITE_AUTH0_CLIENT_ID: "client-id",
  VITE_AUTH0_AUDIENCE: "https://api.parkingcontrol.dev",
};

describe("validateConfig", () => {
  it("devuelve la configuración cuando las cuatro variables son válidas", () => {
    expect(validateConfig(valid)).toEqual({
      apiBaseUrl: "https://localhost:7076/api/v1",
      auth0: {
        domain: "parkingcontrol-dev.us.auth0.com",
        clientId: "client-id",
        audience: "https://api.parkingcontrol.dev",
      },
    });
  });

  it.each(Object.keys(valid))("si falta %s, el mensaje nombra la variable", (name) => {
    const env = { ...valid };
    delete env[name];
    expect(() => validateConfig(env)).toThrow(name);
  });

  it.each(Object.keys(valid))("si %s está vacía, el mensaje nombra la variable", (name) => {
    expect(() => validateConfig({ ...valid, [name]: "  " })).toThrow(name);
  });

  it("falla si el dominio trae https://", () => {
    expect(() =>
      validateConfig({ ...valid, VITE_AUTH0_DOMAIN: "https://parkingcontrol-dev.us.auth0.com" })
    ).toThrow("VITE_AUTH0_DOMAIN");
  });

  it("falla si la base de la API no termina en /api/v1", () => {
    expect(() =>
      validateConfig({ ...valid, VITE_API_BASE_URL: "https://localhost:7076/api" })
    ).toThrow("VITE_API_BASE_URL");
  });

  it("acepta la base de la API con barra final y la normaliza", () => {
    expect(validateConfig({ ...valid, VITE_API_BASE_URL: "https://localhost:7076/api/v1/" }).apiBaseUrl).toBe(
      "https://localhost:7076/api/v1"
    );
  });
});
