// Catálogo de códigos de error y su tratamiento (D-FA6, ARQ-9).
// Se decide por `code`; el texto que ve el usuario es el `title` de la API tal cual.
// Los tres códigos marcados como propios los genera el frontend; si el backend adoptara alguno, gana el backend.

export const TREATMENT = {
  // 401: un reintento con token nuevo; si falla, sesión perdida (lo maneja http.js).
  SESSION: "sesion",
  // 403 de cuenta: pantalla completa de cuenta bloqueada (lo maneja http.js / MeProvider).
  ACCOUNT_BLOCKED: "cuenta_bloqueada",
  // 400 de validación: errores por campo si vienen; si no, aviso.
  FIELDS: "campos",
  // Aviso (toast) con el mensaje. La pantalla sigue.
  NOTICE: "aviso",
};

export const ERROR_CODES = {
  no_autenticado: { treatment: TREATMENT.SESSION },
  usuario_no_registrado: { treatment: TREATMENT.ACCOUNT_BLOCKED },
  usuario_inactivo: { treatment: TREATMENT.ACCOUNT_BLOCKED },
  tenant_inactivo: { treatment: TREATMENT.ACCOUNT_BLOCKED },
  sin_permiso: { treatment: TREATMENT.NOTICE },
  datos_invalidos: { treatment: TREATMENT.FIELDS },
  operacion_invalida: { treatment: TREATMENT.NOTICE },
  // Reintento manual, nunca automático (ARQ-12).
  servidor_ocupado: { treatment: TREATMENT.NOTICE },
  // El traceId va a la consola, no a la pantalla.
  error_interno: { treatment: TREATMENT.NOTICE, logTraceId: true },

  // Propios del frontend.
  sin_conexion: {
    treatment: TREATMENT.NOTICE,
    message: "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.",
  },
  tiempo_agotado: {
    treatment: TREATMENT.NOTICE,
    message: "El servidor tardó demasiado en responder. Intentá de nuevo.",
  },
  respuesta_invalida: {
    treatment: TREATMENT.NOTICE,
    message: "El servidor devolvió una respuesta inesperada. Intentá de nuevo más tarde.",
  },
};

// Texto propio para un error sin `title` y sin mensaje propio (código desconocido o error no HTTP).
export const GENERIC_ERROR_MESSAGE = "Ocurrió un error inesperado. Intentá de nuevo.";

// Un código desconocido (ARQ-9 permite que el backend agregue códigos sin avisar) se trata como aviso.
export function treatmentFor(code) {
  return ERROR_CODES[code]?.treatment ?? TREATMENT.NOTICE;
}

// Motivo por el que se llega a /login, para mostrar el aviso (D-FA9). Viaja en el state de la navegación.
export const LOGIN_REASON = {
  AUTH0_ERROR: "auth0_error",
  SESSION_EXPIRED: "sesion_vencida",
};
