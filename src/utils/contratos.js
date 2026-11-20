// Lógica pura de los contratos mensuales (spec 10, D-FJ14). Sin React ni estado: `now`, `can` y los
// convertidores de fecha son parámetros explícitos, así que ningún test depende de la hora ni de la zona.
// El cliente valida solo formato y largo (D-FJ11): las reglas de negocio y los topes de configuración
// (fecha posterior a hoy, fin posterior a ahora, 3 años, choques, precio en cero) son del backend.
import { addDays, isDateOnly } from "./fechas.js";
import { formatMoney } from "./formato.js";
import { FASE, ocupacionFase } from "./ocupaciones.js";
import { moneyToCents } from "./pagos.js";
import { EstadoOcupacion, TipoOcupacion } from "../constants/enums.js";

// ---------------------------------------------------------------------------
// Constantes y mensajes
// ---------------------------------------------------------------------------

export const MAX_MOTIVO_CONTRATO = 250;
/** Tope del DTO (`[Dinero]`), en centavos para no comparar con coma flotante. */
const MAX_PRECIO_CENTS = 10_000_000 * 100;

export const MSG_FECHA = "Elegí la fecha";
export const MSG_PRECIO_FORMATO = "Ingresá un monto con hasta 2 decimales";
export const MSG_PRECIO_CERO = "El precio debe ser mayor a 0";
export const MSG_PRECIO_MAX = "El precio no puede superar $ 10.000.000";
export const MSG_PORCENTAJE_FORMATO = "Ingresá un porcentaje con hasta 2 decimales";
export const MSG_PORCENTAJE_RANGO = "El porcentaje va de −50 a 100";
export const MSG_MOTIVO_VACIO = "Contanos el motivo";
export const MSG_MOTIVO_LARGO = `El motivo no puede superar ${MAX_MOTIVO_CONTRATO} caracteres`;
export const MSG_FIN_VACIO = "Elegí la fecha y la hora de fin";

const text = (v) => (typeof v === "string" ? v.trim() : "");

// ---------------------------------------------------------------------------
// Acciones (D-FJ9)
// ---------------------------------------------------------------------------

/**
 * Qué acciones se ofrecen sobre un contrato mensual (se ocultan, no se deshabilitan; decide el permiso).
 * Solo un MES con estado guardado ACTIVA: en pantalla, fase RESERVA, EN_CURSO o VENCIDA.
 * @param {{ tipo?: number, fin?: string | null, estado?: number, estadoCalculado?: number, inicio?: string }} o
 * @param {Date | number | string} now
 * @param {(permiso: string) => boolean} can
 * @returns {{ ajustarPrecio: boolean, programarBaja: boolean, cambiarFin: boolean, quitarBaja: boolean }}
 */
export function accionesDeContrato(o, now, can) {
  const fase = ocupacionFase(o, now);
  const vigente = o?.tipo === TipoOcupacion.MES && (fase === FASE.RESERVA || fase === FASE.EN_CURSO || fase === FASE.VENCIDA);
  const conFin = Boolean(o?.fin);
  const baja = vigente && can("ocupaciones.finalizar");
  return {
    ajustarPrecio: vigente && can("tarifas.editar"),
    programarBaja: baja && !conFin,
    cambiarFin: baja && conFin,
    quitarBaja: baja && conFin,
  };
}

// ---------------------------------------------------------------------------
// Formularios (D-FJ11)
// ---------------------------------------------------------------------------

/** Valor inicial de `vigenteDesde`: mañana, en la zona del tenant (`hoy` sale de `today()`). */
export function defaultVigenteDesde(hoy) {
  return addDays(hoy, 1);
}

function validateVigenteDesde(value, errors) {
  if (!isDateOnly(value)) errors.vigenteDesde = MSG_FECHA;
}

function validateMotivo(value, errors) {
  const m = text(value);
  if (m === "") errors.motivo = MSG_MOTIVO_VACIO;
  else if (m.length > MAX_MOTIVO_CONTRATO) errors.motivo = MSG_MOTIVO_LARGO;
  return m;
}

/**
 * @param {{ vigenteDesde?: string, precioUnitario?: string, motivo?: string }} form
 * @returns {{ ok: true, body: { vigenteDesde: string, precioUnitario: number, motivo: string } }
 *   | { ok: false, errors: Record<string, string> }}
 */
export function validateAjustePrecio(form) {
  const errors = {};
  validateVigenteDesde(form?.vigenteDesde, errors);

  const raw = text(form?.precioUnitario);
  let precio = Number.NaN;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) errors.precioUnitario = MSG_PRECIO_FORMATO;
  else {
    precio = Number(raw);
    const cents = moneyToCents(raw);
    if (cents <= 0) errors.precioUnitario = MSG_PRECIO_CERO;
    else if (cents > MAX_PRECIO_CENTS) errors.precioUnitario = MSG_PRECIO_MAX;
  }

  const motivo = validateMotivo(form?.motivo, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, body: { vigenteDesde: form.vigenteDesde, precioUnitario: precio, motivo } };
}

/**
 * @param {{ vigenteDesde?: string, porcentaje?: string, motivo?: string, excluir?: number[] }} form
 * @returns {{ ok: true, body: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateAjusteMasivo(form) {
  const errors = {};
  validateVigenteDesde(form?.vigenteDesde, errors);

  const raw = text(form?.porcentaje);
  let porcentaje = Number.NaN;
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) errors.porcentaje = MSG_PORCENTAJE_FORMATO;
  else {
    porcentaje = Number(raw);
    if (porcentaje < -50 || porcentaje > 100) errors.porcentaje = MSG_PORCENTAJE_RANGO;
  }

  const motivo = validateMotivo(form?.motivo, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const body = { vigenteDesde: form.vigenteDesde, porcentaje, motivo };
  if (Array.isArray(form.excluir) && form.excluir.length > 0) body.excluir = [...form.excluir];
  return { ok: true, body };
}

/**
 * @param {{ fin?: string }} form `fin` es un `LocalInput`
 * @param {{ localInputToInstant: (value: string) => { ok: boolean, instant?: string, message?: string } }} deps
 * @returns {{ ok: true, body: { fin: string } } | { ok: false, errors: { fin: string } }}
 */
export function validateFin(form, { localInputToInstant }) {
  const value = text(form?.fin);
  if (value === "") return { ok: false, errors: { fin: MSG_FIN_VACIO } };
  const r = localInputToInstant(value);
  if (!r?.ok) return { ok: false, errors: { fin: r?.message || MSG_FIN_VACIO } };
  return { ok: true, body: { fin: r.instant } };
}

/** Cuerpo de "Quitar baja": la clave `fin` va siempre, con `null`. */
export function buildQuitarBajaBody() {
  return { fin: null };
}

// ---------------------------------------------------------------------------
// Ajuste masivo (D-FJ8)
// ---------------------------------------------------------------------------

/**
 * De las ocupaciones activas, los mensuales con estado guardado ACTIVA, en el orden recibido.
 * (El backend no filtra por `tipo`: F2.) No muta el arreglo.
 * @param {{ tipo?: number, estado?: number }[] | null | undefined} lista
 */
export function candidatosMensuales(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((o) => o?.tipo === TipoOcupacion.MES && o?.estado === EstadoOcupacion.ACTIVA);
}

/**
 * Prepara la respuesta del lote para mostrarla: por `ocupacionId` ascendente. No calcula ni suma nada.
 * @param {{ cantidad: number, contratos: { ocupacionId: number }[] }} respuesta
 */
export function resultadoLote(respuesta) {
  const contratos = [...(respuesta?.contratos ?? [])].sort((a, b) => a.ocupacionId - b.ocupacionId);
  const cantidad = respuesta?.cantidad ?? 0;
  return { cantidad, vacio: cantidad === 0, contratos };
}

// ---------------------------------------------------------------------------
// Aviso de saldo a favor (D-FJ7)
// ---------------------------------------------------------------------------

/**
 * Aviso tras programar una baja: `null` si no quedó saldo a favor.
 * @param {number | null | undefined} saldoAFavor
 * @returns {string | null}
 */
export function bajaAviso(saldoAFavor) {
  const n = Number(saldoAFavor);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Quedó un saldo a favor de ${formatMoney(n)} por devolver (se creó una alerta de devolución pendiente). Registrá la devolución desde la sección Cuenta.`;
}

// ---------------------------------------------------------------------------
// Errores por `code` (D-FJ10)
// ---------------------------------------------------------------------------

const API_FIELDS = {
  VigenteDesde: "vigenteDesde",
  PrecioUnitario: "precioUnitario",
  Motivo: "motivo",
  Porcentaje: "porcentaje",
  Fin: "fin",
};

/**
 * Convierte `apiError.errors` (PascalCase) a los campos del formulario, con el primer mensaje de cada
 * uno. Lo que no es un campo conocido va a `general`.
 * @param {{ errors?: Record<string, string[] | string> | null } | null | undefined} apiError
 * @returns {{ fields: Record<string, string>, general: string[] }}
 */
export function contratoFieldErrors(apiError) {
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

/**
 * Motivo por el que "Aplicar ajuste" no se puede usar, o `null` (spec 14, D-FN4). `listaStatus` es el de la lista
 * de candidatos (`"loading" | "ok" | "error"`): mientras carga no hay motivo (el botón va en `ocupado`).
 * @param {{ listaStatus?: string | null, entiendo: boolean }} datos
 * @returns {string | null}
 */
export function motivoAplicarAjuste({ listaStatus, entiendo }) {
  if (listaStatus === "error") return "No se pudo cargar la lista; volvé al paso anterior";
  if (listaStatus === "ok" && !entiendo) return "Marcá «Entiendo que el ajuste no se puede deshacer»";
  return null;
}

const STALE_CODES = new Set(["ocupacion_no_encontrada", "ocupacion_no_mensual", "ocupacion_no_activa"]);

/** ¿Hay que recargar el detalle y el listado después de este error? */
export function shouldReloadAfterContrato(code) {
  return STALE_CODES.has(code);
}

/** ¿Se cierra el diálogo de la acción? Los mismos tres códigos. */
export function shouldCloseActionAfterContrato(code) {
  return STALE_CODES.has(code);
}
