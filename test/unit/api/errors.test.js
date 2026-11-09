import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

import toast from "react-hot-toast";
import { ApiError, describeError, normalizeError, showApiError } from "../../../src/api/errors.js";
import { GENERIC_ERROR_MESSAGE, TREATMENT } from "../../../src/constants/errorCodes.js";

// Error de axios con respuesta (axios.isAxiosError mira `isAxiosError: true`).
function httpError(status, data) {
  return { isAxiosError: true, response: { status, data } };
}

function problem(status, code, title, extra = {}) {
  return httpError(status, { status, code, title, traceId: "00-abc-01", ...extra });
}

describe("normalizeError y describeError: un Problem Details por cada code", () => {
  it.each([
    [401, "no_autenticado", TREATMENT.SESSION],
    [403, "usuario_no_registrado", TREATMENT.ACCOUNT_BLOCKED],
    [403, "usuario_inactivo", TREATMENT.ACCOUNT_BLOCKED],
    [403, "tenant_inactivo", TREATMENT.ACCOUNT_BLOCKED],
    [403, "sin_permiso", TREATMENT.NOTICE],
    [400, "operacion_invalida", TREATMENT.NOTICE],
    [503, "servidor_ocupado", TREATMENT.NOTICE],
    [500, "error_interno", TREATMENT.NOTICE],
  ])("%i %s → %s, con el title de la API", (status, code, treatment) => {
    const title = `Título de ${code}`;
    const result = describeError(problem(status, code, title));
    expect(result.treatment).toBe(treatment);
    expect(result.message).toBe(title);
    expect(result.error).toBeInstanceOf(ApiError);
    expect(result.error.status).toBe(status);
    expect(result.error.code).toBe(code);
    expect(result.error.traceId).toBe("00-abc-01");
  });

  it("datos_invalidos con errors → errores por campo", () => {
    const errors = { Nombre: ["El nombre es obligatorio."] };
    const result = describeError(problem(400, "datos_invalidos", "Datos inválidos", { errors }));
    expect(result.treatment).toBe(TREATMENT.FIELDS);
    expect(result.fieldErrors).toEqual(errors);
  });

  it("datos_invalidos sin errors → aviso con el title", () => {
    const result = describeError(problem(400, "datos_invalidos", "Datos inválidos"));
    expect(result.treatment).toBe(TREATMENT.NOTICE);
    expect(result.message).toBe("Datos inválidos");
    expect(result.fieldErrors).toBeNull();
  });

  it("errors solo se toma en datos_invalidos", () => {
    const result = describeError(problem(400, "operacion_invalida", "No se puede", { errors: { x: ["y"] } }));
    expect(result.fieldErrors).toBeNull();
  });

  it("un 403 sin_permiso y uno usuario_inactivo no reciben el mismo tratamiento", () => {
    const sinPermiso = describeError(problem(403, "sin_permiso", "No tenés permiso"));
    const inactivo = describeError(problem(403, "usuario_inactivo", "Tu usuario está inactivo"));
    expect(sinPermiso.treatment).not.toBe(inactivo.treatment);
  });

  it("un code desconocido se muestra con su title como aviso", () => {
    const result = describeError(problem(409, "codigo_nuevo", "Algo nuevo pasó"));
    expect(result.treatment).toBe(TREATMENT.NOTICE);
    expect(result.message).toBe("Algo nuevo pasó");
    expect(result.error.code).toBe("codigo_nuevo");
  });

  it("un code desconocido sin title usa el texto genérico", () => {
    const result = describeError(httpError(409, { code: "codigo_nuevo" }));
    expect(result.message).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("los códigos de usuario_ya_registrado y similares se tratan como desconocidos", () => {
    expect(describeError(problem(409, "usuario_ya_registrado", "Ya existe")).treatment).toBe(TREATMENT.NOTICE);
  });
});

describe("normalizeError: respuestas que no son Problem Details", () => {
  it("cuerpo HTML → respuesta_invalida", () => {
    const error = normalizeError(httpError(502, "<html><body>Bad Gateway</body></html>"));
    expect(error.code).toBe("respuesta_invalida");
    expect(error.status).toBe(502);
    expect(error.message).toMatch(/respuesta inesperada/);
  });

  it("cuerpo vacío → respuesta_invalida", () => {
    expect(normalizeError(httpError(404, "")).code).toBe("respuesta_invalida");
    expect(normalizeError(httpError(404, undefined)).code).toBe("respuesta_invalida");
  });

  it("JSON sin code → respuesta_invalida", () => {
    expect(normalizeError(httpError(400, { error: "viejo formato" })).code).toBe("respuesta_invalida");
  });

  it("conserva la respuesta original para las pantallas que no migran", () => {
    const original = httpError(400, { error: "viejo formato" });
    expect(normalizeError(original).response).toBe(original.response);
  });

  it("sin respuesta → sin_conexion", () => {
    const error = normalizeError({ isAxiosError: true, code: "ERR_NETWORK" });
    expect(error.code).toBe("sin_conexion");
    expect(error.message).toMatch(/^No pudimos conectarnos/);
  });

  it.each(["ECONNABORTED", "ETIMEDOUT"])("timeout (%s) → tiempo_agotado", (code) => {
    expect(normalizeError({ isAxiosError: true, code }).code).toBe("tiempo_agotado");
  });

  it("un ApiError se devuelve tal cual", () => {
    const apiError = new ApiError({ code: "no_autenticado", message: "x" });
    expect(normalizeError(apiError)).toBe(apiError);
  });

  it("un error que no es de axios → desconocido con texto genérico", () => {
    const error = normalizeError(new TypeError("boom"));
    expect(error.code).toBeNull();
    expect(error.message).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe("showApiError", () => {
  beforeEach(() => {
    toast.error.mockClear();
  });

  it("muestra un aviso con el title para sin_permiso", () => {
    showApiError(problem(403, "sin_permiso", "No tenés permiso para esta acción"));
    expect(toast.error).toHaveBeenCalledWith("No tenés permiso para esta acción");
  });

  it("no muestra aviso para cuenta bloqueada ni sesión", () => {
    showApiError(problem(403, "usuario_inactivo", "Inactivo"));
    showApiError(problem(401, "no_autenticado", "No autenticado"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("error_interno manda el traceId a la consola y no a la pantalla", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    showApiError(problem(500, "error_interno", "Error interno"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("00-abc-01"));
    expect(toast.error).toHaveBeenCalledWith("Error interno");
    log.mockRestore();
  });

  it("devuelve el ApiError normalizado", () => {
    expect(showApiError(problem(400, "operacion_invalida", "x"))).toBeInstanceOf(ApiError);
  });
});
