// Lógica pura de Ocupaciones (spec 07, D-FG7 a D-FG20). Sin React ni estado: `now`, la zona del tenant y
// `can` son parámetros explícitos, así que ningún test depende de la hora ni de la zona del sistema.
// Cubre la fase de una ocupación (D-FG10), las acciones por permiso (D-FG8), los pedidos del listado
// (D-FG11), el alta (D-FG16), cancelar (D-FG17), finalizar con excedente (D-FG18), el pago (D-FG19) y el
// tratamiento de los errores por `code` (D-FG7). El cliente NO valida la configuración del tenant
// (tolerancia, topes, techos, duración máxima): el backend es la autoridad (D-FG9).
import { EstadoOcupacion, MetodoPago, ResolucionExcedente, TipoOcupacion, colorOf, labelOf } from "../constants/enums.js";
import { dateRangeToInstants, inputToDateOnly, instantToInput, localInputToInstant } from "./fechas.js";
import { isPositiveId } from "./trazabilidadLink.js";

// ---------------------------------------------------------------------------
// Constantes y mensajes
// ---------------------------------------------------------------------------

/** Horizonte de una ocupación abierta para pedir las cocheras disponibles: el backend usa [inicio, ∞) (B6). */
export const OPEN_HORIZON_DAYS = 3650;

/** Tope de los motivos. El backend limita la columna a 250 (el DTO de la tarifa excepcional y el de cancelar no lo dicen: PB-8, PB-9). */
export const MAX_MOTIVO = 250;

/** Límites de un importe (`[Dinero]` del backend): mayor que 0, 2 decimales, hasta 10.000.000. */
export const MAX_MONTO = 10_000_000;

/** Opciones de "Cantidad máxima" del listado. El backend recorta en silencio a 500 (B5). */
export const TAKE_OPTIONS = [50, 100, 200, 500];
export const DEFAULT_TAKE = 200;

export const MSG_RANGO_INVERTIDO = "La fecha 'Desde' no puede ser posterior a 'Hasta'";
export const MSG_FECHA_INVALIDA = "La fecha no es válida.";
export const MSG_VENCE_INVALIDO = "Ingresá un número entero de 0 o más.";
export const MSG_MOTIVO_LARGO = `El motivo no puede superar ${MAX_MOTIVO} caracteres`;
export const MSG_MOTIVO_CANCELAR = "Contanos el motivo de la cancelación";
export const MSG_ELEGIR_RESOLUCION = "Elegí cómo resolver el excedente";
export const MSG_MOTIVO_COBRAR = "Contanos el motivo de cobrar el contrato completo";

const MSG_COCHERA = "Elegí una cochera";
const MSG_CLIENTE = "Elegí un cliente";
const MSG_INICIO = "Ingresá el inicio";
const MSG_FIN_FALTA = "Ingresá el fin o marcá «Sin hora de fin»";
const MSG_FIN_ORDEN = "El fin debe ser posterior al inicio";
const MSG_PRECIO_FORMATO = "Ingresá un precio con hasta 2 decimales";
const MSG_PRECIO_CERO = "El precio debe ser mayor a 0";
const MSG_PRECIO_MAX = "El precio no puede superar $ 10.000.000";
const MSG_MOTIVO_EXCEP = "Contanos el motivo de la tarifa excepcional";
const MSG_MONTO_FORMATO = "Ingresá un monto con hasta 2 decimales";
const MSG_MONTO_CERO = "El monto debe ser mayor a 0";
const MSG_MONTO_MAX = "El monto no puede superar $ 10.000.000";
const MSG_METODO = "Elegí un método de pago";

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// `now` llega como `Date`, milisegundos o texto ISO (con zona). Siempre se pasa de afuera.
function nowMs(now) {
  if (now instanceof Date) return now.getTime();
  if (typeof now === "number") return now;
  return Date.parse(now);
}

// Instante con `Z` desde milisegundos. `toJSON` es el ISO en UTC: no toca la zona del sistema.
const msToInstant = (ms) => new Date(ms).toJSON();

const instantMs = (instant) => (typeof instant === "string" ? Date.parse(instant) : NaN);

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const text = (v) => (typeof v === "string" ? v.trim() : "");

// ---------------------------------------------------------------------------
// Fase (D-FG10)
// ---------------------------------------------------------------------------

export const FASE = Object.freeze({
  RESERVA: "reserva",
  EN_CURSO: "en_curso",
  VENCIDA: "vencida",
  FINALIZADA: "finalizada",
  CANCELADA: "cancelada",
});

/**
 * Fase de una ocupación, derivada en el cliente. El backend tiene `estado` y `estadoCalculado` pero ninguno
 * distingue una reserva de una ocupación en curso. El límite es estricto: `inicio > now` es reserva.
 * @param {{ estado?: number, estadoCalculado?: number, inicio?: string }} o
 * @param {Date | number | string} now
 * @returns {"reserva" | "en_curso" | "vencida" | "finalizada" | "cancelada"}
 */
export function ocupacionFase(o, now) {
  const e = o?.estadoCalculado ?? o?.estado;
  if (e === EstadoOcupacion.CANCELADA) return FASE.CANCELADA;
  if (e === EstadoOcupacion.FINALIZADA) return FASE.FINALIZADA;
  if (e === EstadoOcupacion.VENCIDA) return FASE.VENCIDA;
  return instantMs(o?.inicio) > nowMs(now) ? FASE.RESERVA : FASE.EN_CURSO;
}

/**
 * Etiqueta y color del chip de una fase. "Reserva" no existe en el enum del backend: color propio.
 * @returns {{ label: string, color: string }}
 */
export function faseChip(fase) {
  switch (fase) {
    case FASE.RESERVA:
      return { label: "Reserva", color: "secondary" };
    case FASE.EN_CURSO:
      return { label: "En curso", color: colorOf(EstadoOcupacion, EstadoOcupacion.ACTIVA) };
    case FASE.VENCIDA:
      return {
        label: labelOf(EstadoOcupacion, EstadoOcupacion.VENCIDA),
        color: colorOf(EstadoOcupacion, EstadoOcupacion.VENCIDA),
      };
    case FASE.FINALIZADA:
      return {
        label: labelOf(EstadoOcupacion, EstadoOcupacion.FINALIZADA),
        color: colorOf(EstadoOcupacion, EstadoOcupacion.FINALIZADA),
      };
    case FASE.CANCELADA:
      return {
        label: labelOf(EstadoOcupacion, EstadoOcupacion.CANCELADA),
        color: colorOf(EstadoOcupacion, EstadoOcupacion.CANCELADA),
      };
    default:
      return { label: String(fase ?? ""), color: "default" };
  }
}

/**
 * Rótulos de la cuenta (B4, D-FG12). El tope depende de lo que sea: el contrato entero si hay fin, la unidad
 * en curso si es abierta, `precioTotal` si está finalizada; en una cancelada no se muestra (`tope: null`).
 * El front no calcula ninguna cifra.
 * @returns {{ tope: string | null, pagado: string, saldo: string }}
 */
export function cuentaRotulos(o) {
  const e = o?.estadoCalculado ?? o?.estado;
  let tope;
  if (e === EstadoOcupacion.CANCELADA) tope = null;
  else if (e === EstadoOcupacion.FINALIZADA) tope = "Total";
  else if (!isBlank(o?.fin)) tope = "Total del contrato";
  else tope = "Hasta ahora (unidad en curso)";
  return { tope, pagado: "Pagado", saldo: "Saldo" };
}

// ---------------------------------------------------------------------------
// Acciones por permiso (D-FG8)
// ---------------------------------------------------------------------------

/**
 * Qué acciones se ofrecen sobre una ocupación (se ocultan, no se deshabilitan; decide el permiso, ARQ-4).
 * @param {object} o fila o detalle (`estado`, `estadoCalculado`, `inicio`, `saldo`)
 * @param {Date | number | string} now
 * @param {(permiso: string) => boolean} can
 * @returns {{ finalizar: boolean, cancelarReserva: boolean, registrarPago: boolean }}
 */
export function accionesDeOcupacion(o, now, can) {
  const fase = ocupacionFase(o, now);
  const saldo = typeof o?.saldo === "number" ? o.saldo : Number.NaN;
  return {
    finalizar: can("ocupaciones.finalizar") && (fase === FASE.EN_CURSO || fase === FASE.VENCIDA),
    cancelarReserva: can("ocupaciones.cancelar") && fase === FASE.RESERVA,
    registrarPago: can("pagos.registrar") && saldo > 0 && fase !== FASE.CANCELADA,
  };
}

// ---------------------------------------------------------------------------
// Listado (D-FG11)
// ---------------------------------------------------------------------------

/** Valores del selector "Estado". */
export const ESTADO_FILTRO = Object.freeze({
  ACTIVAS: "activas",
  RESERVAS: "reservas",
  VENCIDAS: "vencidas",
  FINALIZADAS: "finalizadas",
  CANCELADAS: "canceladas",
  TODAS: "todas",
});

export const ESTADO_FILTRO_OPTIONS = [
  { value: ESTADO_FILTRO.ACTIVAS, label: "Activas" },
  { value: ESTADO_FILTRO.RESERVAS, label: "Reservas" },
  { value: ESTADO_FILTRO.VENCIDAS, label: "Vencidas" },
  { value: ESTADO_FILTRO.FINALIZADAS, label: "Finalizadas" },
  { value: ESTADO_FILTRO.CANCELADAS, label: "Canceladas" },
  { value: ESTADO_FILTRO.TODAS, label: "Todas" },
];

/** Filtros del formulario, con los valores de los `<select>` y los `<input>` (texto). */
export const DEFAULT_OCUPACION_FILTERS = Object.freeze({
  estado: ESTADO_FILTRO.ACTIVAS,
  cocheraId: "",
  clienteId: "",
  desde: "",
  hasta: "",
  venceEnDias: "",
  take: DEFAULT_TAKE,
});

/**
 * Cantidad pedida: la del filtro si es un entero positivo, y si no, 200.
 * @param {unknown} take
 */
export function takeOf(take) {
  const n = typeof take === "number" ? take : Number(String(take ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_TAKE;
}

/**
 * Arma los pedidos de `GET /Ocupacion` desde los filtros. "Activas" son DOS pedidos (el backend no incluye
 * las vencidas en `estado=ACTIVA`, B5) salvo con "Vence en (días)", que ya las excluye. "Reservas" manda
 * `estado = ACTIVA` y `desde` = el más tardío entre ahora y "Inicio desde" (el backend filtra `Inicio >= desde`).
 * `desde` y `hasta` son `DateOnly` en la zona del tenant: salen como instantes, con `hasta` inclusivo.
 * @param {Partial<typeof DEFAULT_OCUPACION_FILTERS>} filters
 * @param {{ timeZone: string, now: Date | number | string }} context
 * @returns {{ ok: true, queries: Record<string, unknown>[] } | { ok: false, field: string, message: string }}
 */
export function buildListQueries(filters, { timeZone, now }) {
  const f = { ...DEFAULT_OCUPACION_FILTERS, ...filters };

  const desdeDay = isBlank(f.desde) ? null : inputToDateOnly(String(f.desde).trim());
  const hastaDay = isBlank(f.hasta) ? null : inputToDateOnly(String(f.hasta).trim());
  if (!isBlank(f.desde) && desdeDay === null) return { ok: false, field: "desde", message: MSG_FECHA_INVALIDA };
  if (!isBlank(f.hasta) && hastaDay === null) return { ok: false, field: "hasta", message: MSG_FECHA_INVALIDA };
  // Los DateOnly ordenan como texto.
  if (desdeDay !== null && hastaDay !== null && desdeDay > hastaDay) {
    return { ok: false, field: "desde", message: MSG_RANGO_INVERTIDO };
  }
  const range = dateRangeToInstants(desdeDay, hastaDay, timeZone);

  let venceEnDias;
  if (!isBlank(f.venceEnDias)) {
    const raw = String(f.venceEnDias).trim();
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
      return { ok: false, field: "venceEnDias", message: MSG_VENCE_INVALIDO };
    }
    venceEnDias = Number(raw);
  }

  const base = { take: takeOf(f.take) };
  if (isPositiveId(f.cocheraId)) base.cocheraId = Number(String(f.cocheraId).trim());
  if (isPositiveId(f.clienteId)) base.clienteId = Number(String(f.clienteId).trim());
  if (range.hasta !== null) base.hasta = range.hasta;
  if (venceEnDias !== undefined) base.venceEnDias = venceEnDias;

  let desde = range.desde;
  let estados;
  switch (f.estado) {
    case ESTADO_FILTRO.TODAS:
      estados = [undefined];
      break;
    case ESTADO_FILTRO.VENCIDAS:
      estados = [EstadoOcupacion.VENCIDA];
      break;
    case ESTADO_FILTRO.FINALIZADAS:
      estados = [EstadoOcupacion.FINALIZADA];
      break;
    case ESTADO_FILTRO.CANCELADAS:
      estados = [EstadoOcupacion.CANCELADA];
      break;
    case ESTADO_FILTRO.RESERVAS: {
      estados = [EstadoOcupacion.ACTIVA];
      const ahora = nowMs(now);
      desde = desde !== null && Date.parse(desde) > ahora ? desde : msToInstant(ahora);
      break;
    }
    default:
      // Activas: en curso y reservas (ACTIVA) y vencidas (VENCIDA), en paralelo. Con "Vence en" las
      // vencidas no entran (B5): un solo pedido.
      estados = venceEnDias === undefined ? [EstadoOcupacion.ACTIVA, EstadoOcupacion.VENCIDA] : [EstadoOcupacion.ACTIVA];
  }

  const queries = estados.map((estado) => {
    const q = { ...base };
    if (estado !== undefined) q.estado = estado;
    if (desde !== null) q.desde = desde;
    return q;
  });
  return { ok: true, queries };
}

/**
 * Une las listas de los pedidos de "Activas": `inicio` descendente, a igual `inicio` `id` descendente,
 * sin repetidos (una ocupación que pasó de activa a vencida entre los dos pedidos podría venir en ambos),
 * cortada a la cantidad pedida.
 * @param {{ id: number, inicio: string }[][]} lists
 * @param {number} take
 */
export function mergeOcupaciones(lists, take) {
  const byId = new Map();
  for (const list of lists) for (const o of list) if (!byId.has(o.id)) byId.set(o.id, o);
  return [...byId.values()]
    .sort((a, b) => {
      const d = instantMs(b.inicio) - instantMs(a.inicio);
      return d !== 0 ? d : b.id - a.id;
    })
    .slice(0, take);
}

/**
 * ¿Algún pedido trajo tantas filas como las pedidas? El backend no pagina ni da el total: puede haber más.
 * @param {unknown[][]} lists
 * @param {number} take
 */
export function isTruncated(lists, take) {
  return lists.some((l) => Array.isArray(l) && l.length >= take);
}

// ---------------------------------------------------------------------------
// Alta (D-FG16)
// ---------------------------------------------------------------------------

/** Por defecto, en Hora y Mes la ocupación es abierta; en Día lleva fin. */
export function defaultSinFin(tipo) {
  return tipo !== TipoOcupacion.DIA;
}

/**
 * Formulario inicial del alta. El inicio por defecto es el minuto actual en la zona del local.
 * @param {{ timeZone: string, now: Date | number | string }} context
 */
export function defaultAltaForm({ timeZone, now }) {
  return {
    tipo: TipoOcupacion.HORA,
    cliente: null,
    inicio: instantToInput(msToInstant(nowMs(now)), timeZone),
    sinFin: defaultSinFin(TipoOcupacion.HORA),
    sinFinTocado: false,
    fin: "",
    cocheraId: "",
    excepcional: false,
    precio: "",
    motivoExcepcional: "",
    motivoRetroactivo: "",
  };
}

/**
 * Modo derivado de lo cargado: `reserva` (inicio futuro), `abierta` (sin fin) o `cerrada`; `null` si el
 * inicio no está o no es una hora real.
 * @returns {"reserva" | "abierta" | "cerrada" | null}
 */
export function altaModo(form, { timeZone, now }) {
  const inicio = localInputToInstant(form?.inicio, timeZone);
  if (!inicio.ok || inicio.instant === null) return null;
  if (Date.parse(inicio.instant) > nowMs(now)) return "reserva";
  return form.sinFin ? "abierta" : "cerrada";
}

/**
 * Rango para pedir las cocheras disponibles: `desde` es el inicio y `hasta` el fin o, en una abierta, el
 * inicio más `OPEN_HORIZON_DAYS` días (B6). `null` si falta el inicio, es una hora inexistente, o el fin
 * no es posterior al inicio.
 * @returns {{ desde: string, hasta: string } | null}
 */
export function disponiblesRange(form, timeZone) {
  const inicio = localInputToInstant(form?.inicio, timeZone);
  if (!inicio.ok || inicio.instant === null) return null;
  const desdeMs = Date.parse(inicio.instant);
  if (form.sinFin) return { desde: inicio.instant, hasta: msToInstant(desdeMs + OPEN_HORIZON_DAYS * DAY_MS) };
  const fin = localInputToInstant(form?.fin, timeZone);
  if (!fin.ok || fin.instant === null) return null;
  if (Date.parse(fin.instant) <= desdeMs) return null;
  return { desde: inicio.instant, hasta: fin.instant };
}

/**
 * ¿Se muestra el campo "Motivo del inicio retroactivo"? Con `ocupaciones.crear_retroactiva` y un inicio
 * anterior al minuto actual, o cuando el backend ya marcó ese campo. El front no conoce la tolerancia.
 * @param {object} form
 * @param {{ timeZone: string, now: Date | number | string, can: (p: string) => boolean,
 *   fieldErrors?: Record<string, string> }} context
 */
export function showMotivoRetroactivo(form, { timeZone, now, can, fieldErrors }) {
  if (!can("ocupaciones.crear_retroactiva")) return false;
  if (fieldErrors?.motivoRetroactivo) return true;
  const inicio = localInputToInstant(form?.inicio, timeZone);
  if (!inicio.ok || inicio.instant === null) return false;
  const minutoActual = Math.floor(nowMs(now) / MINUTE_MS) * MINUTE_MS;
  return Date.parse(inicio.instant) < minutoActual;
}

/**
 * Valida el alta y arma el cuerpo. NO valida tolerancia, tope de pasado, techo de futuro ni duración
 * máxima (D-FG9): eso lo dice el backend, con su `title` y el campo marcado.
 * @param {object} form
 * @param {{ timeZone: string, can: (p: string) => boolean }} context
 * @returns {{ ok: true, body: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateAltaForm(form, { timeZone, can }) {
  const errors = {};

  const cocheraId = Number(form?.cocheraId);
  if (isBlank(form?.cocheraId) || !Number.isInteger(cocheraId) || cocheraId <= 0) errors.cocheraId = MSG_COCHERA;

  const clienteId = form?.cliente?.id;
  if (!isPositiveId(clienteId)) errors.cliente = MSG_CLIENTE;

  let inicioMs = null;
  let inicioInstant = null;
  if (isBlank(form?.inicio)) {
    errors.inicio = MSG_INICIO;
  } else {
    const r = localInputToInstant(form.inicio, timeZone);
    if (!r.ok) errors.inicio = r.message;
    else {
      inicioInstant = r.instant;
      inicioMs = Date.parse(r.instant);
    }
  }

  let finInstant = null;
  if (!form?.sinFin) {
    if (isBlank(form?.fin)) {
      errors.fin = MSG_FIN_FALTA;
    } else {
      const r = localInputToInstant(form.fin, timeZone);
      if (!r.ok) errors.fin = r.message;
      else if (inicioMs !== null && Date.parse(r.instant) <= inicioMs) errors.fin = MSG_FIN_ORDEN;
      else finInstant = r.instant;
    }
  }

  const conExcepcional = Boolean(form?.excepcional) && can("ocupaciones.tarifa_excepcional");
  let precio = null;
  let motivoExcepcional = "";
  if (conExcepcional) {
    const raw = String(form.precio ?? "").trim();
    if (!MONEY_RE.test(raw)) errors.precio = MSG_PRECIO_FORMATO;
    else if (Number(raw) <= 0) errors.precio = MSG_PRECIO_CERO;
    else if (Number(raw) > MAX_MONTO) errors.precio = MSG_PRECIO_MAX;
    else precio = Number(raw);

    motivoExcepcional = text(form.motivoExcepcional);
    if (motivoExcepcional === "") errors.motivoExcepcional = MSG_MOTIVO_EXCEP;
    else if (motivoExcepcional.length > MAX_MOTIVO) errors.motivoExcepcional = MSG_MOTIVO_LARGO;
  }

  const conRetroactiva = can("ocupaciones.crear_retroactiva");
  const motivoRetroactivo = conRetroactiva ? text(form?.motivoRetroactivo) : "";
  if (motivoRetroactivo.length > MAX_MOTIVO) errors.motivoRetroactivo = MSG_MOTIVO_LARGO;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const body = {
    cocheraId,
    clienteId: Number(clienteId),
    tipo: Number(form.tipo),
    inicio: inicioInstant,
    usarTarifaExcepcional: conExcepcional,
  };
  if (finInstant !== null) body.fin = finInstant;
  if (conExcepcional) {
    body.precioUnitarioExcepcional = precio;
    body.motivoTarifaExcepcional = motivoExcepcional;
  }
  if (motivoRetroactivo !== "") body.motivoRetroactivo = motivoRetroactivo;
  return { ok: true, body };
}

// ---------------------------------------------------------------------------
// Cancelar reserva (D-FG17) y finalizar (D-FG18)
// ---------------------------------------------------------------------------

/**
 * Cuerpo de cancelar: solo el motivo (obligatorio, 250 como máximo). `finReal` no se manda: el backend lo ignora (B2).
 * @param {string} motivo
 * @returns {{ ok: true, body: { motivo: string } } | { ok: false, message: string }}
 */
export function buildCancelBody(motivo) {
  const t = text(motivo);
  if (t === "") return { ok: false, message: MSG_MOTIVO_CANCELAR };
  if (t.length > MAX_MOTIVO) return { ok: false, message: MSG_MOTIVO_LARGO };
  return { ok: true, body: { motivo: t } };
}

/**
 * ¿Es el 400 de "finalizar un mensual con excedente"? (`datos_invalidos` con `errors.ResolucionExcedente`, B3.)
 * No usa `saldoAFavor`: el excedente no se conoce antes de finalizar.
 * @param {{ status?: number, code?: string, errors?: Record<string, unknown> } | null | undefined} apiError
 */
export function needsResolutionError(apiError) {
  return (
    apiError?.status === 400 &&
    apiError.code === "datos_invalidos" &&
    apiError.errors !== null &&
    typeof apiError.errors === "object" &&
    Object.hasOwn(apiError.errors, "ResolucionExcedente")
  );
}

/**
 * Texto del backend para el paso "Resolver el excedente", con los montos. El backend lo manda en
 * `errors.ResolucionExcedente[0]` (el `title` de un 400 de campo es genérico). No se parsea.
 * @param {{ message?: string, errors?: Record<string, unknown> } | null | undefined} apiError
 * @returns {string}
 */
export function resolutionMessage(apiError) {
  const list = apiError?.errors?.ResolucionExcedente;
  const first = Array.isArray(list) ? list[0] : list;
  return typeof first === "string" && first.trim() !== "" ? first : String(apiError?.message ?? "");
}

/**
 * Cuerpo de finalizar. Sin el paso de resolución el cuerpo no existe (`undefined`). Con el paso abierto
 * hay que elegir una opción: `COBRAR_COMPLETO` exige motivo; `DEVOLVER` lo admite opcional. 250 como máximo.
 * @param {{ resolviendo?: boolean, resolucion?: number | null, motivo?: string }} state
 * @returns {{ ok: true, body: { resolucionExcedente: number, motivo?: string } | undefined }
 *   | { ok: false, field: "resolucion" | "motivo", message: string }}
 */
export function buildFinalizarBody({ resolviendo = false, resolucion = null, motivo = "" } = {}) {
  if (!resolviendo) return { ok: true, body: undefined };
  const valida = Object.values(ResolucionExcedente).includes(resolucion);
  if (!valida) return { ok: false, field: "resolucion", message: MSG_ELEGIR_RESOLUCION };
  const t = text(motivo);
  if (t.length > MAX_MOTIVO) return { ok: false, field: "motivo", message: MSG_MOTIVO_LARGO };
  if (resolucion === ResolucionExcedente.COBRAR_COMPLETO && t === "") {
    return { ok: false, field: "motivo", message: MSG_MOTIVO_COBRAR };
  }
  const body = { resolucionExcedente: resolucion };
  if (t !== "") body.motivo = t;
  return { ok: true, body };
}

// ---------------------------------------------------------------------------
// Pago (D-FG19)
// ---------------------------------------------------------------------------

/**
 * Valida el pago y arma el cuerpo. NO compara el monto con el saldo: si se pasa, el backend da
 * `pago_supera_saldo`. La referencia se omite si está vacía.
 * @param {{ ocupacionId?: number, monto?: string | number, metodo?: number, referencia?: string }} form
 * @returns {{ ok: true, body: { ocupacionId?: number, monto: number, metodo: number, referencia?: string } }
 *   | { ok: false, errors: { monto?: string, metodo?: string } }}
 */
export function validatePago(form) {
  const errors = {};
  const raw = String(form?.monto ?? "").trim();
  if (!MONEY_RE.test(raw)) errors.monto = MSG_MONTO_FORMATO;
  else if (Number(raw) <= 0) errors.monto = MSG_MONTO_CERO;
  else if (Number(raw) > MAX_MONTO) errors.monto = MSG_MONTO_MAX;

  const metodo = typeof form?.metodo === "number" ? form.metodo : Number(form?.metodo);
  if (isBlank(form?.metodo) || !Object.values(MetodoPago).includes(metodo)) errors.metodo = MSG_METODO;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const body = {};
  if (form.ocupacionId !== undefined) body.ocupacionId = form.ocupacionId;
  body.monto = Number(raw);
  body.metodo = metodo;
  const referencia = text(form.referencia);
  if (referencia !== "") body.referencia = referencia;
  return { ok: true, body };
}

// ---------------------------------------------------------------------------
// Errores por `code` (D-FG7)
// ---------------------------------------------------------------------------

// Clave de `errors` de la API (PascalCase) -> campo del formulario.
const API_FIELDS = {
  Inicio: "inicio",
  Fin: "fin",
  MotivoRetroactivo: "motivoRetroactivo",
  PrecioUnitarioExcepcional: "precio",
  MotivoTarifaExcepcional: "motivoExcepcional",
  Motivo: "motivo",
  Monto: "monto",
  ResolucionExcedente: "resolucion",
  CocheraId: "cocheraId",
  ClienteId: "cliente",
  Tipo: "tipo",
};

/**
 * Convierte `apiError.errors` (claves en PascalCase, solo con `datos_invalidos`) a los campos del
 * formulario con el primer mensaje de cada uno. Lo que no es un campo conocido va a `general`.
 * @param {{ errors?: Record<string, string[] | string> | null } | null | undefined} apiError
 * @returns {{ fields: Record<string, string>, general: string[] }}
 */
export function fieldErrorsFromApi(apiError) {
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
 * Campo del alta que se marca con un código que no trae `errors`.
 * @param {string | null | undefined} code
 * @param {{ excepcional?: boolean }} form
 * @returns {string | null}
 */
export function altaErrorField(code, form) {
  switch (code) {
    case "cochera_no_disponible":
    case "cochera_bloqueada":
      return "cocheraId";
    case "cliente_inactivo":
      return "cliente";
    case "inicio_retroactivo_sin_permiso":
      return "inicio";
    case "tarifa_no_configurada":
      return "tipo";
    case "sin_permiso":
      return form?.excepcional ? "excepcional" : "inicio";
    default:
      return null;
  }
}

const RELOAD_CODES = new Set([
  "ocupacion_no_encontrada",
  "ocupacion_no_activa",
  "ocupacion_cancelada",
  "ocupacion_finalizada",
  "ocupacion_ya_iniciada",
  "ocupacion_no_iniciada",
  "pago_supera_saldo",
  "cochera_no_disponible",
  "cochera_bloqueada",
]);

/** ¿Hay que recargar el listado (y el detalle abierto) después de este error? */
export function shouldReloadAfter(code) {
  return RELOAD_CODES.has(code);
}

/** ¿Hay que cerrar el detalle abierto? Solo si la ocupación ya no existe. */
export function shouldCloseDetailAfter(code) {
  return code === "ocupacion_no_encontrada";
}

/**
 * ¿Un diálogo de acción (finalizar, cancelar) se cierra porque el estado quedó viejo? Es el grupo de
 * `ocupacion_*` de la tabla de D-FG7 (el 404 también: la ocupación ya no existe).
 */
export function shouldCloseActionAfter(code) {
  return (
    code === "ocupacion_no_encontrada" ||
    code === "ocupacion_no_activa" ||
    code === "ocupacion_cancelada" ||
    code === "ocupacion_finalizada" ||
    code === "ocupacion_ya_iniciada" ||
    code === "ocupacion_no_iniciada"
  );
}
