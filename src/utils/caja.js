// Lógica pura de Caja con sesiones (spec 09, D-FI19). Sin React ni estado: `can` es un parámetro explícito y
// nada depende de la hora ni de la zona del sistema (el "hoy" y los días entran como `DateOnly`). Cubre el
// estado según el modo (D-FI5), las acciones por permiso (D-FI14), los formularios (D-FI6, D-FI7, D-FI8, D-FI9),
// el detalle (D-FI10) y qué hacer con cada error por `code` (D-FI15). El cliente NO valida reglas del backend
// (observación obligatoria, fondo siguiente <= contado, "última cerrada", tope de 366 días): las valida el backend.
import { EstadoCajaSesion, ModoCaja, TipoEventoCaja } from "../constants/enums.js";
import { addDays, formatDateOnly, isDateOnly } from "./fechas.js";
import { MAX_MONTO, MAX_MOTIVO, MSG_MOTIVO_LARGO, MSG_RANGO_INVERTIDO } from "./ocupaciones.js";
import { centsToMoney, moneyToCents } from "./pagos.js";

// ---------------------------------------------------------------------------
// Mensajes y límites
// ---------------------------------------------------------------------------

export const MAX_OBSERVACION = 500;

export const MSG_MONTO_FORMATO_CAJA = "Ingresá un monto con hasta 2 decimales";
export const MSG_MONTO_MAX_CAJA = "El monto no puede superar $ 10.000.000";
export const MSG_OBSERVACION_LARGA = `La observación no puede superar ${MAX_OBSERVACION} caracteres`;
export const MSG_MOTIVO_REABRIR = "Contanos el motivo";
export const MSG_ELEGIR_FECHA = "Elegí la fecha";
export const MSG_FECHA_NO_VALIDA = "La fecha no es válida.";

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

/** Estados de la vista de la caja actual. */
export const CAJA_ESTADO = Object.freeze({
  SIN_CAJA: "SIN_CAJA",
  ABIERTA: "ABIERTA",
  ABIERTA_DIA_ANTERIOR: "ABIERTA_DIA_ANTERIOR",
});

/** Aviso de una caja de DIARIA que quedó abierta de un día anterior (`dia` es un `DateOnly`). */
export function avisoDiaAnterior(dia) {
  return `La caja del día ${formatDateOnly(dia)} sigue abierta. Hasta que la cierres no se puede cobrar, anular ni devolver`;
}

// ---------------------------------------------------------------------------
// Vista de la caja actual (D-FI5)
// ---------------------------------------------------------------------------

/**
 * Qué se muestra de la caja actual. `hoy` y `aperturaDia` son `DateOnly` en la zona del tenant (los calcula la
 * pantalla). Con respuesta inválida da `null` (la pantalla ya muestra el error de carga). En TURNO el aviso de
 * día anterior no existe: el turno puede cruzar la medianoche.
 * @param {{ modo?: number, sesion?: object | null, fondoPropuesto?: number | null } | null | undefined} actual
 * @param {{ hoy?: string, aperturaDia?: string }} [fechas]
 * @returns {{ estado: string, modo: number, sesion: object | null, fondoPropuesto: number | null, diaAnterior: string | null } | null}
 */
export function cajaVista(actual, { hoy, aperturaDia } = {}) {
  if (actual === null || typeof actual !== "object" || actual.modo === undefined || actual.modo === null) return null;
  const modo = actual.modo;
  const sesion = actual.sesion ?? null;
  const fondoPropuesto = actual.fondoPropuesto ?? null;
  if (sesion === null) {
    return { estado: CAJA_ESTADO.SIN_CAJA, modo, sesion: null, fondoPropuesto, diaAnterior: null };
  }
  const diaAnterior =
    modo === ModoCaja.DIARIA && isDateOnly(hoy) && isDateOnly(aperturaDia) && aperturaDia < hoy ? aperturaDia : null;
  return {
    estado: diaAnterior ? CAJA_ESTADO.ABIERTA_DIA_ANTERIOR : CAJA_ESTADO.ABIERTA,
    modo,
    sesion,
    fondoPropuesto: null,
    diaAnterior,
  };
}

const estadoDeVista = (vista) => (typeof vista === "string" ? vista : vista?.estado);

/**
 * Acciones de la caja actual por permiso (se ocultan, no se deshabilitan; ARQ-4). `vista` es lo que devuelve
 * `cajaVista` (o solo su `estado`). `verEsperado` es del permiso, no del estado.
 * @param {{ estado?: string } | string | null | undefined} vista
 * @param {(permiso: string) => boolean} can
 * @returns {{ abrir: boolean, cerrar: boolean, verEsperado: boolean }}
 */
export function accionesDeCaja(vista, can) {
  const estado = estadoDeVista(vista);
  const abierta = estado === CAJA_ESTADO.ABIERTA || estado === CAJA_ESTADO.ABIERTA_DIA_ANTERIOR;
  return {
    abrir: estado === CAJA_ESTADO.SIN_CAJA && can("caja.abrir"),
    cerrar: abierta && can("caja.cerrar"),
    verEsperado: can("caja.ver_esperado"),
  };
}

/**
 * Acciones del detalle de una sesión. "Reabrir" exige CERRADA, `caja.reabrir` y que no haya otra abierta; que
 * sea "la última cerrada" lo decide el backend (`caja_no_es_la_ultima`).
 * @param {{ estado?: number } | number | null | undefined} sesion la sesión o su `estado`
 * @param {{ hayAbierta?: boolean }} contexto
 * @param {(permiso: string) => boolean} can
 * @returns {{ cerrar: boolean, reabrir: boolean, verEsperado: boolean, trazabilidad: boolean }}
 */
export function accionesDeSesion(sesion, { hayAbierta = false } = {}, can) {
  const estado = typeof sesion === "number" ? sesion : sesion?.estado;
  const abierta = estado === EstadoCajaSesion.ABIERTA;
  const cerrada = estado === EstadoCajaSesion.CERRADA;
  return {
    cerrar: abierta && can("caja.cerrar"),
    reabrir: cerrada && !hayAbierta && can("caja.reabrir"),
    verEsperado: abierta && can("caja.ver_esperado"),
    trazabilidad: can("auditoria.ver"),
  };
}

// ---------------------------------------------------------------------------
// Dinero (solo comparaciones y vista previa: en centavos, sin coma flotante)
// ---------------------------------------------------------------------------

/**
 * ¿El fondo que se declara difiere del propuesto (el que quedó)? Solo para rotular la observación: no bloquea.
 * Un propuesto `null` es 0; un fondo inválido da `false` (lo marca `validateAbrir`).
 * @param {string | number} fondo
 * @param {number | string | null | undefined} propuesto
 * @returns {boolean}
 */
export function fondoDifiere(fondo, propuesto) {
  const raw = String(fondo ?? "").trim();
  if (!MONEY_RE.test(raw)) return false;
  return moneyToCents(raw) !== moneyToCents(propuesto ?? 0);
}

/**
 * Diferencia informativa del arqueo: contado − esperado, en centavos. `null` si falta alguno o no es válido.
 * La que vale es la del backend, que calcula el esperado con el candado de la caja.
 * @param {string | number} contado
 * @param {number | string | null | undefined} esperado
 * @returns {number | null}
 */
export function diferenciaVista(contado, esperado) {
  const raw = String(contado ?? "").trim();
  if (!MONEY_RE.test(raw)) return null;
  if (esperado === null || esperado === undefined || esperado === "" || !Number.isFinite(Number(esperado))) return null;
  return centsToMoney(moneyToCents(raw) - moneyToCents(esperado));
}

/**
 * Cómo se muestra una diferencia de arqueo (contado − esperado): "sobra", "falta" o "sin diferencia", con el
 * color del texto. Solo presentación: no decide nada. `null` si no es un número.
 * @param {number | string | null | undefined} diferencia
 * @returns {{ tipo: "sobra" | "falta" | "cero", label: string, color: string } | null}
 */
export function diferenciaInfo(diferencia) {
  if (diferencia === null || diferencia === undefined || diferencia === "" || !Number.isFinite(Number(diferencia))) {
    return null;
  }
  const cents = moneyToCents(diferencia);
  if (cents > 0) return { tipo: "sobra", label: "sobra", color: "warning.main" };
  if (cents < 0) return { tipo: "falta", label: "falta", color: "error.main" };
  return { tipo: "cero", label: "sin diferencia", color: "text.primary" };
}

/** Color del tema para una diferencia ya clasificada por `diferenciaInfo`. */
export function difColor(info) {
  return info.tipo === "cero" ? "success.main" : info.color;
}

function validateMonto(value) {
  const raw = String(value ?? "").trim();
  if (!MONEY_RE.test(raw)) return { message: MSG_MONTO_FORMATO_CAJA };
  const n = Number(raw);
  if (n > MAX_MONTO) return { message: MSG_MONTO_MAX_CAJA };
  return { n };
}

function validateObservacion(value) {
  const t = typeof value === "string" ? value.trim() : "";
  return { texto: t, tooLong: t.length > MAX_OBSERVACION };
}

// ---------------------------------------------------------------------------
// Formularios (D-FI6, D-FI7, D-FI8, D-FI16)
// ---------------------------------------------------------------------------

/**
 * Valida abrir caja y arma `{ fondoInicial, observacion? }`. Valida formato y largo, nunca contra el fondo que
 * quedó (eso es `errors.Observacion` del backend). El 0 es válido; una observación vacía no se manda.
 * @param {{ fondoInicial?: string | number, observacion?: string }} form
 * @returns {{ ok: true, body: { fondoInicial: number, observacion?: string } }
 *   | { ok: false, errors: { fondoInicial?: string, observacion?: string } }}
 */
export function validateAbrir(form) {
  const errors = {};
  const fondo = validateMonto(form?.fondoInicial);
  if (fondo.message) errors.fondoInicial = fondo.message;
  const obs = validateObservacion(form?.observacion);
  if (obs.tooLong) errors.observacion = MSG_OBSERVACION_LARGA;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const body = { fondoInicial: fondo.n };
  if (obs.texto !== "") body.observacion = obs.texto;
  return { ok: true, body };
}

/**
 * Valida el cierre y arma `{ efectivoContado, fondoSiguiente, observacion? }`. No valida que el fondo siguiente
 * no supere lo contado ni que haya observación con diferencia: son reglas del backend.
 * @param {{ efectivoContado?: string | number, fondoSiguiente?: string | number, observacion?: string }} form
 * @returns {{ ok: true, body: { efectivoContado: number, fondoSiguiente: number, observacion?: string } }
 *   | { ok: false, errors: { efectivoContado?: string, fondoSiguiente?: string, observacion?: string } }}
 */
export function validateCerrar(form) {
  const errors = {};
  const contado = validateMonto(form?.efectivoContado);
  if (contado.message) errors.efectivoContado = contado.message;
  const siguiente = validateMonto(form?.fondoSiguiente);
  if (siguiente.message) errors.fondoSiguiente = siguiente.message;
  const obs = validateObservacion(form?.observacion);
  if (obs.tooLong) errors.observacion = MSG_OBSERVACION_LARGA;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const body = { efectivoContado: contado.n, fondoSiguiente: siguiente.n };
  if (obs.texto !== "") body.observacion = obs.texto;
  return { ok: true, body };
}

/**
 * Cuerpo de reabrir: solo el motivo (obligatorio con `trim`, 250 como máximo).
 * @param {string} motivo
 * @returns {{ ok: true, body: { motivo: string } } | { ok: false, message: string }}
 */
export function buildReabrirBody(motivo) {
  const t = typeof motivo === "string" ? motivo.trim() : "";
  if (t === "") return { ok: false, message: MSG_MOTIVO_REABRIR };
  if (t.length > MAX_MOTIVO) return { ok: false, message: MSG_MOTIVO_LARGO };
  return { ok: true, body: { motivo: t } };
}

// ---------------------------------------------------------------------------
// Historial (D-FI9)
// ---------------------------------------------------------------------------

/**
 * Rango por defecto: los últimos 30 días, contando hoy. `hoy` es un `DateOnly`.
 * @param {string} hoy
 * @returns {{ desde: string, hasta: string }}
 */
export function rangoPorDefecto(hoy) {
  return { desde: addDays(hoy, -29), hasta: hoy };
}

/**
 * Valida el filtro del historial. Los dos son obligatorios y `desde` no puede ser posterior a `hasta`. No
 * valida el tope de 366 días: es del backend (400 `errors.Hasta`).
 * @param {{ desde?: string, hasta?: string }} rango `DateOnly` (`yyyy-MM-dd`)
 * @returns {{ ok: true, desde: string, hasta: string } | { ok: false, errors: { desde?: string, hasta?: string } }}
 */
export function validateRango({ desde, hasta } = {}) {
  const errors = {};
  const check = (campo, valor) => {
    if (valor === undefined || valor === null || String(valor).trim() === "") errors[campo] = MSG_ELEGIR_FECHA;
    else if (!isDateOnly(valor)) errors[campo] = MSG_FECHA_NO_VALIDA;
  };
  check("desde", desde);
  check("hasta", hasta);
  if (Object.keys(errors).length === 0 && desde > hasta) errors.desde = MSG_RANGO_INVERTIDO;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, desde, hasta };
}

// ---------------------------------------------------------------------------
// Detalle de una sesión (D-FI10)
// ---------------------------------------------------------------------------

/**
 * El último CIERRE del historial (en el orden recibido, que es cronológico ascendente), o `null`.
 * @param {{ tipo?: number }[] | null | undefined} historial
 * @returns {object | null}
 */
export function cierreVigente(historial) {
  if (!Array.isArray(historial)) return null;
  for (let i = historial.length - 1; i >= 0; i--) {
    if (historial[i]?.tipo === TipoEventoCaja.CIERRE) return historial[i];
  }
  return null;
}

const tiene = (v) => v !== null && v !== undefined;

/**
 * Campos que se muestran de un evento del historial, según su tipo. `money` indica si el valor es un importe.
 * `distinto` es solo de APERTURA: el fondo declarado difiere del que quedó (centavos) y no es automática.
 * @param {object} h fila de `historial`
 * @returns {{ campos: { key: string, label: string, value: number | string, money: boolean }[],
 *   distinto: boolean, observacion: string | null }}
 */
export function eventoCampos(h) {
  const campos = [];
  let distinto = false;
  const money = (key, label, value) => {
    if (tiene(value)) campos.push({ key, label, value, money: true });
  };
  switch (h?.tipo) {
    case TipoEventoCaja.APERTURA:
      money("fondoDeclarado", "Fondo declarado", h.fondoDeclarado);
      money("fondoQueQuedo", "Fondo que quedó", h.fondoQueQuedo);
      distinto =
        !h.automatica &&
        tiene(h.fondoDeclarado) &&
        tiene(h.fondoQueQuedo) &&
        moneyToCents(h.fondoDeclarado) !== moneyToCents(h.fondoQueQuedo);
      break;
    case TipoEventoCaja.CIERRE:
      money("efectivoContado", "Efectivo contado", h.efectivoContado);
      money("efectivoEsperado", "Efectivo esperado", h.efectivoEsperado);
      money("diferencia", "Diferencia", h.diferencia);
      money("fondoSiguiente", "Fondo siguiente", h.fondoSiguiente);
      break;
    case TipoEventoCaja.REAPERTURA:
      if (typeof h.motivo === "string" && h.motivo.trim() !== "") {
        campos.push({ key: "motivo", label: "Motivo", value: h.motivo.trim(), money: false });
      }
      break;
    default:
      break;
  }
  const obs = typeof h?.observacion === "string" ? h.observacion.trim() : "";
  return { campos, distinto, observacion: obs === "" ? null : obs };
}

// ---------------------------------------------------------------------------
// Errores por `code` (D-FI15)
// ---------------------------------------------------------------------------

// Claves PascalCase del backend -> campos de los formularios de caja.
const API_FIELDS = {
  FondoInicial: "fondoInicial",
  EfectivoContado: "efectivoContado",
  FondoSiguiente: "fondoSiguiente",
  Observacion: "observacion",
  Motivo: "motivo",
  Desde: "desde",
  Hasta: "hasta",
};

/**
 * Convierte `apiError.errors` (PascalCase, solo con `datos_invalidos`) a los campos del formulario con el
 * primer mensaje de cada uno. Lo que no es un campo conocido va a `general`.
 * @param {{ errors?: Record<string, string[] | string> | null } | null | undefined} apiError
 * @returns {{ fields: Record<string, string>, general: string[] }}
 */
export function cajaFieldErrors(apiError) {
  const fields = {};
  const general = [];
  const errors = apiError?.errors;
  if (errors && typeof errors === "object") {
    for (const [key, value] of Object.entries(errors)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first !== "string" || first === "") continue;
      const field = API_FIELDS[key];
      if (field) fields[field] = first;
      else general.push(first);
    }
  }
  return { fields, general };
}

const CODES_ESTADO_VIEJO = new Set([
  "caja_ya_abierta",
  "caja_cerrada",
  "caja_no_es_la_ultima",
  "caja_sesion_no_encontrada",
]);

/** ¿Hay que recargar la pantalla después de este error? (estado viejo de la caja). */
export function shouldReloadAfterCaja(code) {
  return CODES_ESTADO_VIEJO.has(code);
}

/** ¿Un diálogo de acción (abrir, cerrar, reabrir) se cierra porque el estado quedó viejo? */
export function shouldCloseActionAfterCaja(code) {
  return CODES_ESTADO_VIEJO.has(code);
}

/** ¿Se cierra también el detalle de la sesión? Solo si la sesión no existe. */
export function shouldCloseDetailAfterCaja(code) {
  return code === "caja_sesion_no_encontrada";
}
