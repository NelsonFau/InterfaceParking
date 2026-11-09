// Normalización de errores de la API y aviso al usuario (D-FA6).
import axios from "axios";
import toast from "react-hot-toast";
import { ERROR_CODES, GENERIC_ERROR_MESSAGE, TREATMENT, treatmentFor } from "../constants/errorCodes.js";

export class ApiError extends Error {
  constructor({ status = null, code = null, message, errors = null, traceId = null, response = null }) {
    super(message ?? GENERIC_ERROR_MESSAGE);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.traceId = traceId;
    // Respuesta original de axios, para las pantallas que todavía leen `e.response.data` (DV-FA2).
    this.response = response;
  }
}

function ownMessage(code) {
  return ERROR_CODES[code]?.message ?? null;
}

// Un Problem Details de la API siempre trae `code` (ARQ-9, D-AP15).
function isProblemDetails(data) {
  return data !== null && typeof data === "object" && !Array.isArray(data) && typeof data.code === "string";
}

function fromCode(code, extra = {}) {
  return new ApiError({ code, message: ownMessage(code), ...extra });
}

// Convierte cualquier error (de axios o no) en un ApiError. Si ya lo es, lo devuelve tal cual.
export function normalizeError(error) {
  if (error instanceof ApiError) return error;

  if (!axios.isAxiosError(error)) {
    // Error que no es HTTP (por ejemplo, un fallo de código): se trata como desconocido.
    return new ApiError({ message: GENERIC_ERROR_MESSAGE });
  }

  const response = error.response ?? null;

  if (!response) {
    // ECONNABORTED es el timeout de axios; ETIMEDOUT, el mismo con `clarifyTimeoutError`.
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return fromCode("tiempo_agotado");
    return fromCode("sin_conexion");
  }

  const data = response.data;
  if (!isProblemDetails(data)) {
    // Cuerpo vacío, HTML de un proxy u otro JSON que no es Problem Details.
    return fromCode("respuesta_invalida", { status: response.status, response });
  }

  const title = typeof data.title === "string" && data.title.trim() !== "" ? data.title : null;
  const errors =
    data.code === "datos_invalidos" && data.errors && typeof data.errors === "object" ? data.errors : null;

  return new ApiError({
    status: response.status,
    code: data.code,
    message: title ?? ownMessage(data.code) ?? GENERIC_ERROR_MESSAGE,
    errors,
    traceId: typeof data.traceId === "string" ? data.traceId : null,
    response,
  });
}

// Qué hacer con un error, sin efectos: el tratamiento según su `code` y el texto a mostrar.
export function describeError(error) {
  const apiError = normalizeError(error);
  let treatment = treatmentFor(apiError.code);
  // datos_invalidos sin errores por campo se muestra como un aviso común.
  if (treatment === TREATMENT.FIELDS && !apiError.errors) treatment = TREATMENT.NOTICE;
  return { treatment, message: apiError.message, fieldErrors: apiError.errors, error: apiError };
}

// Único lugar que arma el aviso de un error. Devuelve el ApiError normalizado.
// La sesión perdida y la cuenta bloqueada no generan aviso: las resuelve el cliente HTTP con su pantalla.
export function showApiError(error) {
  const { treatment, message, error: apiError } = describeError(error);

  if (ERROR_CODES[apiError.code]?.logTraceId && apiError.traceId) {
    console.error(`Error interno de la API (traceId ${apiError.traceId})`);
  }

  if (treatment === TREATMENT.NOTICE || treatment === TREATMENT.FIELDS) {
    // Los formularios todavía no muestran `errors` por campo (fuera de alcance): se avisa con el título.
    toast.error(message);
  }

  return apiError;
}
