// Lógica pura de la pantalla de Tarifas (spec 03, D-FC13). Sin React ni estado:
// "hoy" entra siempre como parámetro (un DateOnly en la zona del tenant).
import { isDateOnly } from "./fechas.js";

/** Tope de `nuevoPrecio` del backend (inclusivo). */
export const MAX_PRECIO = 10_000_000;

export const MSG_PRECIO_FORMATO = "Ingresá un precio con hasta 2 decimales";
export const MSG_PRECIO_POSITIVO = "El precio debe ser mayor a 0";
export const MSG_PRECIO_TOPE = "El precio no puede superar $ 10.000.000";
export const MSG_FECHA_INVALIDA = "La fecha no es válida";
export const MSG_FECHA_PASADA = "La fecha no puede ser anterior a hoy";

const PRECIO_RE = /^\d+(\.\d{1,2})?$/;

// Comparación de texto `yyyy-MM-dd`: válida porque los dos lados pasaron antes por `isDateOnly`.
function isAfter(a, b) {
  return a > b;
}

/**
 * Estado de una tarifa (D-FC4). Usa el booleano `vigente` del servidor y la fecha solo para
 * distinguir lo que todavía no rige (`>` estricto).
 * @param {{ vigente: boolean, vigenteDesde: string }} tarifa
 * @param {string} today DateOnly
 * @returns {"vigente" | "programada" | "finalizada"}
 */
export function tarifaEstado(tarifa, today) {
  if (tarifa.vigente === true) return "vigente";
  if (isAfter(tarifa.vigenteDesde, today)) return "programada";
  return "finalizada";
}

/**
 * Valida el formulario de cambio de precio con los límites del backend (D-FC7).
 * @param {{ precio: string, fecha: string }} form `fecha` vacía = rige desde hoy
 * @param {string} today DateOnly
 * @returns {{ ok: true, nuevoPrecio: number, vigenteDesde: string | null }
 *   | { ok: false, errors: { precio?: string, fecha?: string } }}
 */
export function validateTarifaForm({ precio, fecha }, today) {
  const errors = {};

  const texto = String(precio ?? "").trim();
  let nuevoPrecio = null;
  if (!PRECIO_RE.test(texto)) {
    errors.precio = MSG_PRECIO_FORMATO;
  } else {
    nuevoPrecio = Number(texto);
    if (!(nuevoPrecio > 0)) errors.precio = MSG_PRECIO_POSITIVO;
    else if (nuevoPrecio > MAX_PRECIO) errors.precio = MSG_PRECIO_TOPE;
  }

  const fechaTexto = String(fecha ?? "").trim();
  let vigenteDesde = null;
  if (fechaTexto !== "") {
    if (!isDateOnly(fechaTexto)) errors.fecha = MSG_FECHA_INVALIDA;
    else if (fechaTexto < today) errors.fecha = MSG_FECHA_PASADA;
    else vigenteDesde = fechaTexto;
  }

  if (errors.precio || errors.fecha) return { ok: false, errors };
  return { ok: true, nuevoPrecio, vigenteDesde };
}

/**
 * Cuerpo del `PUT /Tarifa`. Sin fecha **omite** `vigenteDesde` (no manda `null`): el backend
 * resuelve "hoy" en la zona del tenant.
 * @param {number} tipo
 * @param {{ nuevoPrecio: number, vigenteDesde: string | null }} valores
 */
export function buildUpdateBody(tipo, { nuevoPrecio, vigenteDesde }) {
  const body = { tipo, nuevoPrecio };
  if (vigenteDesde) body.vigenteDesde = vigenteDesde;
  return body;
}

/**
 * Datos del resumen de confirmación (D-FC8). El componente los formatea.
 * `reemplaza` es la tarifa programada del historial con la misma `vigenteDesde`, solo si la fecha
 * efectiva es futura (con hoy, el backend responde `tarifa_ya_vigente` y no reemplaza).
 * @param {{ vigente: object | null, nuevoPrecio: number, vigenteDesde: string | null,
 *   historial: object[], today: string }} datos
 * @returns {{ precioActual: number | null, precioNuevo: number, fechaEfectiva: string,
 *   reemplaza: object | null }}
 */
export function summarizeChange({ vigente, nuevoPrecio, vigenteDesde, historial, today }) {
  const fechaEfectiva = vigenteDesde || today;
  const reemplaza =
    (historial ?? []).find(
      (t) => tarifaEstado(t, today) === "programada" && t.vigenteDesde === fechaEfectiva,
    ) ?? null;
  return {
    precioActual: vigente?.precio ?? null,
    precioNuevo: nuevoPrecio,
    fechaEfectiva,
    reemplaza,
  };
}

const RELOAD_CODES = new Set(["tarifa_ya_vigente", "tarifa_no_encontrada", "tarifa_modificada"]);

/**
 * ¿La pantalla debe recargar después del aviso de este error? (D-FC11). En estos tres códigos el
 * estado que ve el usuario quedó viejo.
 * @param {string | null | undefined} code
 */
export function shouldReloadAfter(code) {
  return RELOAD_CODES.has(code);
}
