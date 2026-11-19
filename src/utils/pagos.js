// Lógica pura de Pagos (spec 08, D-FH14). Sin React ni estado: `can` es un parámetro explícito y nada
// depende de la hora ni de la zona del sistema. Cubre qué pagos se pueden devolver y cuál se propone
// (D-FH6), las acciones por permiso (D-FH9), la anulación (D-FH7), los formularios (D-FH11) y qué hacer
// con cada error por `code` (D-FH10). El cliente NO valida reglas del backend (que el devolvible alcance,
// que el saldo a favor alcance, que el pago esté anulado, quién puede anular): las valida el backend.
import { EstadoOcupacion, EstadoPago, MetodoPago, colorOf, labelOf } from "../constants/enums.js";
import { MAX_MONTO, MAX_MOTIVO, MSG_MOTIVO_LARGO } from "./ocupaciones.js";
import { isPositiveId } from "./trazabilidadLink.js";

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------

export const MSG_MOTIVO_PAGO = "Contanos el motivo";
export const MSG_MONTO_FORMATO = "Ingresá un monto con hasta 2 decimales";
export const MSG_MONTO_CERO = "El monto debe ser mayor a 0";
export const MSG_MONTO_MAX = "El monto no puede superar $ 10.000.000";
export const MSG_METODO = "Elegí un método";
export const MSG_ELEGIR_PAGO = "Elegí el pago a devolver";

/** Aviso de anular un pago de una ocupación finalizada (C4): sin calcular ningún monto. */
export const AVISO_ANULAR_FINALIZADA = "La ocupación está finalizada: al anular va a quedar saldo pendiente de cobro";

/**
 * Nota fija de anular: el cliente no sabe de antemano si el pago es de otra sesión de caja (PB-11), y el
 * backend cuenta como "otra sesión" a todo pago cuando no hay caja abierta (C3).
 */
export const NOTA_OTRA_SESION = "Si el pago es de otra sesión de caja (o no hay caja abierta), solo puede anularlo un dueño";

/** Aviso de devolver sin saldo a favor o por encima de él (C2, C4). */
export const AVISO_DEVOLVER_DEBIENDO =
  "No hay saldo a favor (o el monto lo supera): al devolver, la ocupación va a quedar debiendo";

const MONEY_RE = /^\d+(\.\d{1,2})?$/;

// ---------------------------------------------------------------------------
// Dinero sin coma flotante (solo para la precarga y las comparaciones)
// ---------------------------------------------------------------------------

/**
 * Importe en centavos enteros. Redondea, así que `0.1 + 0.2` da 30. Lo no numérico da 0.
 * @param {number | string | null | undefined} value
 * @returns {number}
 */
export function moneyToCents(value) {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Centavos enteros a importe (`1050` -> `10.5`).
 * @param {number} cents
 * @returns {number}
 */
export function centsToMoney(cents) {
  return cents / 100;
}

// ---------------------------------------------------------------------------
// Qué se puede devolver (D-FH6)
// ---------------------------------------------------------------------------

/**
 * Lo que queda por devolver de un pago: `monto - montoDevuelto`. Un pago que no está PAGADO no se
 * devuelve (0); un dato inconsistente (`montoDevuelto` mayor que `monto`) da 0, sin lanzar.
 * @param {{ monto?: number, montoDevuelto?: number, estado?: number }} pago
 * @returns {number}
 */
export function devolvible(pago) {
  if (pago?.estado !== EstadoPago.PAGADO) return 0;
  const cents = moneyToCents(pago.monto) - moneyToCents(pago.montoDevuelto);
  return cents > 0 ? centsToMoney(cents) : 0;
}

const instantMs = (instant) => {
  const ms = typeof instant === "string" ? Date.parse(instant) : Number.NaN;
  return Number.isFinite(ms) ? ms : 0;
};

/**
 * Orden de la lista de pagos: `fechaPago` descendente y, a igual fecha, `id` descendente (el backend
 * ordena solo por fecha, C8). No muta lo recibido.
 * @template {{ id: number, fechaPago?: string }} T
 * @param {T[]} pagos
 * @returns {T[]}
 */
export function sortPagos(pagos) {
  return [...(Array.isArray(pagos) ? pagos : [])].sort((a, b) => {
    const d = instantMs(b.fechaPago) - instantMs(a.fechaPago);
    return d !== 0 ? d : b.id - a.id;
  });
}

/**
 * Pagos PAGADOS con algo por devolver, del más reciente al más viejo.
 * @template {{ id: number, fechaPago?: string, monto?: number, montoDevuelto?: number, estado?: number }} T
 * @param {T[]} pagos
 * @returns {T[]}
 */
export function pagosDevolvibles(pagos) {
  return sortPagos((Array.isArray(pagos) ? pagos : []).filter((p) => devolvible(p) > 0));
}

/**
 * Pago que se propone devolver: el más reciente cuyo devolvible cubre el saldo a favor; si ninguno lo
 * cubre (o no hay saldo a favor), el más reciente. `null` si no hay ninguno devolvible.
 * @param {object[]} pagos
 * @param {number | string | null | undefined} saldoAFavor
 * @returns {object | null}
 */
export function elegirPagoParaDevolver(pagos, saldoAFavor) {
  const lista = pagosDevolvibles(pagos);
  if (lista.length === 0) return null;
  const saldo = moneyToCents(saldoAFavor);
  if (saldo <= 0) return lista[0];
  return lista.find((p) => moneyToCents(devolvible(p)) >= saldo) ?? lista[0];
}

/**
 * Monto propuesto, solo como precarga: el menor entre el saldo a favor y lo devolvible del pago (sin saldo
 * a favor, lo devolvible), con 2 decimales. El límite lo pone el backend contra el pago (C2).
 * @param {object | null | undefined} pago
 * @param {number | string | null | undefined} saldoAFavor
 * @returns {string}
 */
export function montoInicialDevolucion(pago, saldoAFavor) {
  if (!pago) return "";
  const dev = moneyToCents(devolvible(pago));
  const saldo = moneyToCents(saldoAFavor);
  const cents = saldo > 0 ? Math.min(saldo, dev) : dev;
  return centsToMoney(cents).toFixed(2);
}

// ---------------------------------------------------------------------------
// Acciones y filas (D-FH9, D-FH4)
// ---------------------------------------------------------------------------

/**
 * Qué acciones se ofrecen sobre un pago (se ocultan, no se deshabilitan; decide el permiso, ARQ-4).
 * `anular` exige PAGADO y sin devoluciones (C7); `devolver`, PAGADO con algo por devolver.
 * `anularBloqueadoPorDevoluciones` es para explicarlo en el detalle.
 * @param {{ monto?: number, montoDevuelto?: number, estado?: number }} pago
 * @param {(permiso: string) => boolean} can
 * @returns {{ anular: boolean, devolver: boolean, anularBloqueadoPorDevoluciones: boolean }}
 */
export function accionesDePago(pago, can) {
  const pagado = pago?.estado === EstadoPago.PAGADO;
  const conDevoluciones = moneyToCents(pago?.montoDevuelto) > 0;
  return {
    anular: can("pagos.anular") && pagado && !conDevoluciones,
    devolver: can("pagos.devolver") && devolvible(pago) > 0,
    anularBloqueadoPorDevoluciones: can("pagos.anular") && pagado && conDevoluciones,
  };
}

/**
 * Datos de una fila de la lista de pagos: chip de estado, importe devuelto (solo si es mayor que 0) y si
 * se ve atenuada (anulada). No suma nada: los totales son del backend.
 * @param {{ monto?: number, montoDevuelto?: number, estado?: number }} pago
 * @returns {{ label: string, color: string, devuelto: number | null, atenuado: boolean }}
 */
export function pagoFilaInfo(pago) {
  const devuelto = Number(pago?.montoDevuelto);
  return {
    label: labelOf(EstadoPago, pago?.estado),
    color: colorOf(EstadoPago, pago?.estado),
    devuelto: Number.isFinite(devuelto) && devuelto > 0 ? devuelto : null,
    atenuado: pago?.estado === EstadoPago.ANULADO,
  };
}

/**
 * Cómo se muestra un usuario: el backend manda solo el id (C6). "Vos" si es el de la sesión, "Usuario #id"
 * si no, "—" sin id.
 * @param {number | null | undefined} usuarioId
 * @param {number | null | undefined} meUsuarioId
 * @returns {string}
 */
export function usuarioLabel(usuarioId, meUsuarioId) {
  if (usuarioId === null || usuarioId === undefined || usuarioId === "") return "—";
  if (meUsuarioId !== null && meUsuarioId !== undefined && Number(usuarioId) === Number(meUsuarioId)) return "Vos";
  return `Usuario #${usuarioId}`;
}

// ---------------------------------------------------------------------------
// Avisos antes de confirmar (D-FH6, D-FH7): sin bloquear y sin calcular ningún monto
// ---------------------------------------------------------------------------

/**
 * Aviso de anular un pago: si la ocupación está FINALIZADA, va a quedar saldo pendiente (C4).
 * @param {{ estado?: number, estadoCalculado?: number } | null | undefined} ocupacion
 * @returns {string | null}
 */
export function anulacionAviso(ocupacion) {
  const e = ocupacion?.estadoCalculado ?? ocupacion?.estado;
  return e === EstadoOcupacion.FINALIZADA ? AVISO_ANULAR_FINALIZADA : null;
}

/**
 * Aviso de devolver: sin saldo a favor, o con un monto que lo supera, la ocupación queda debiendo. Compara en
 * centavos. Un monto que no es válido da `null` (lo marca `validateDevolucion`).
 * @param {string | number} monto
 * @param {number | string | null | undefined} saldoAFavor
 * @returns {string | null}
 */
export function devolucionAviso(monto, saldoAFavor) {
  const raw = String(monto ?? "").trim();
  if (!MONEY_RE.test(raw)) return null;
  const saldo = moneyToCents(saldoAFavor);
  if (saldo <= 0 || moneyToCents(raw) > saldo) return AVISO_DEVOLVER_DEBIENDO;
  return null;
}

// ---------------------------------------------------------------------------
// Formularios (D-FH11)
// ---------------------------------------------------------------------------

/**
 * Cuerpo de anular: solo el motivo (obligatorio con `trim`, 250 como máximo).
 * @param {string} motivo
 * @returns {{ ok: true, body: { motivo: string } } | { ok: false, message: string }}
 */
export function buildAnularBody(motivo) {
  const t = typeof motivo === "string" ? motivo.trim() : "";
  if (t === "") return { ok: false, message: MSG_MOTIVO_PAGO };
  if (t.length > MAX_MOTIVO) return { ok: false, message: MSG_MOTIVO_LARGO };
  return { ok: true, body: { motivo: t } };
}

/**
 * Valida una devolución y arma el cuerpo `{ monto, metodo, motivo }`. Valida formato y largo, nunca contra
 * el pago ni el saldo a favor (eso lo dice el backend con `devolucion_supera_pago`). `pagoId` no va en el
 * cuerpo: se devuelve aparte, para armar la URL.
 * @param {{ monto?: string | number, metodo?: number | string, motivo?: string, pagoId?: number | string }} form
 * @param {{ requirePago?: boolean }} [options] con `requirePago` el `pagoId` es obligatorio
 * @returns {{ ok: true, pagoId: number | null, body: { monto: number, metodo: number, motivo: string } }
 *   | { ok: false, errors: { monto?: string, metodo?: string, motivo?: string, pagoId?: string } }}
 */
export function validateDevolucion(form, { requirePago = false } = {}) {
  const errors = {};

  const raw = String(form?.monto ?? "").trim();
  if (!MONEY_RE.test(raw)) errors.monto = MSG_MONTO_FORMATO;
  else if (Number(raw) <= 0) errors.monto = MSG_MONTO_CERO;
  else if (Number(raw) > MAX_MONTO) errors.monto = MSG_MONTO_MAX;

  const blankMetodo = form?.metodo === undefined || form?.metodo === null || form?.metodo === "";
  const metodo = Number(form?.metodo);
  if (blankMetodo || !Object.values(MetodoPago).includes(metodo)) errors.metodo = MSG_METODO;

  const motivo = typeof form?.motivo === "string" ? form.motivo.trim() : "";
  if (motivo === "") errors.motivo = MSG_MOTIVO_PAGO;
  else if (motivo.length > MAX_MOTIVO) errors.motivo = MSG_MOTIVO_LARGO;

  if (requirePago && !isPositiveId(form?.pagoId)) errors.pagoId = MSG_ELEGIR_PAGO;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    pagoId: isPositiveId(form?.pagoId) ? Number(form.pagoId) : null,
    body: { monto: Number(raw), metodo, motivo },
  };
}

// ---------------------------------------------------------------------------
// Errores por `code` (D-FH10)
// ---------------------------------------------------------------------------

const RELOAD_CODES = new Set(["pago_no_encontrado", "pago_anulado", "pago_con_devoluciones", "devolucion_supera_pago"]);
const CLOSE_ACTION_CODES = new Set(["pago_no_encontrado", "pago_anulado", "pago_con_devoluciones"]);

/** ¿Hay que recargar lista y detalle después de este error? (estado viejo.) */
export function shouldReloadAfterPago(code) {
  return RELOAD_CODES.has(code);
}

/** ¿Se cierra el diálogo de la acción (anular, devolver)? `devolucion_supera_pago` lo deja abierto. */
export function shouldCloseActionAfterPago(code) {
  return CLOSE_ACTION_CODES.has(code);
}

/** ¿Se cierra también el detalle del pago? Solo si el pago ya no existe. */
export function shouldCloseDetailAfterPago(code) {
  return code === "pago_no_encontrado";
}

/**
 * Campo del formulario de devolución que se marca con un código que no trae `errors`.
 * @param {string | null | undefined} code
 * @returns {string | null}
 */
export function pagoErrorField(code) {
  return code === "devolucion_supera_pago" ? "monto" : null;
}
