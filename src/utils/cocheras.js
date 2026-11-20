// Lógica pura de la pantalla de Cocheras (spec 06, D-FF3 y D-FF13). Sin React ni estado:
// el reloj (`now`) y la lista de números existentes entran siempre como parámetros.
import { EstadoCochera, EstadoOcupacion, SituacionCochera, TipoOcupacion } from "../constants/enums.js";

export const MIN_NUMERO = 1;
export const MAX_NUMERO = 999;
export const MAX_NOTA = 300;
/** Tope de cocheras por alta: el del backend (inventario, `POST /Cochera`). */
export const MAX_ALTA_RANGO = 100;
/** Cuántos números en choque se listan en la vista previa (el backend lista hasta 10). */
export const MAX_CHOQUES_LISTADOS = 10;

export const MSG_FALTA_DESDE = "Ingresá el número de la primera cochera";
export const MSG_FUERA_DE_RANGO = `Los números van del ${MIN_NUMERO} al ${MAX_NUMERO}`;
export const MSG_HASTA_MENOR = 'El "Hasta" no puede ser menor que el "Desde"';
export const MSG_TOPE_ALTA = `Podés crear hasta ${MAX_ALTA_RANGO} cocheras por vez`;
export const MSG_MOTIVO_OBLIGATORIO = "Contanos el motivo del bloqueo";
export const MSG_MOTIVO_LARGO = `El motivo no puede superar ${MAX_NOTA} caracteres`;
export const MSG_NOTA_LARGA = `La nota no puede superar ${MAX_NOTA} caracteres`;
export const MSG_SIN_FIN = "Sin hora de fin";

const ENTERO_RE = /^\d+$/;

// Texto de dígitos → número, o null si no es un entero sin signo ni decimales.
function toInt(value) {
  const t = String(value ?? "").trim();
  return ENTERO_RE.test(t) ? Number(t) : null;
}

function enRango(n) {
  return n >= MIN_NUMERO && n <= MAX_NUMERO;
}

/**
 * Lee y valida el rango de un alta (D-FF7). "Hasta" vacío equivale a "Desde".
 * @param {string|number} desde
 * @param {string|number} [hasta]
 * @returns {{ ok: true, desde: number, hasta: number, cantidad: number }
 *   | { ok: false, error: string }}
 */
export function parseRango(desde, hasta) {
  const d = toInt(desde);
  if (d === null) return { ok: false, error: MSG_FALTA_DESDE };
  const hastaTexto = String(hasta ?? "").trim();
  const h = hastaTexto === "" ? d : toInt(hastaTexto);
  if (h === null || !enRango(d) || !enRango(h)) return { ok: false, error: MSG_FUERA_DE_RANGO };
  if (h < d) return { ok: false, error: MSG_HASTA_MENOR };
  const cantidad = h - d + 1;
  if (cantidad > MAX_ALTA_RANGO) return { ok: false, error: MSG_TOPE_ALTA };
  return { ok: true, desde: d, hasta: h, cantidad };
}

/**
 * Vista previa del alta (D-FF7): qué se va a crear, o por qué no se puede.
 * `ok` es verdadero solo si el rango es válido y no choca con ninguna cochera cargada.
 * @param {string|number} desde
 * @param {string|number} [hasta]
 * @param {number[]} existentes números de las cocheras de la lista cargada
 * @returns {{ ok: boolean, error: string|null, choques: number[], cantidad: number, texto: string,
 *   desde?: number, hasta?: number }}
 */
export function previewRango(desde, hasta, existentes) {
  const r = parseRango(desde, hasta);
  if (!r.ok) return { ok: false, error: r.error, choques: [], cantidad: 0, texto: r.error };

  const usados = new Set(existentes ?? []);
  const choques = [];
  for (let n = r.desde; n <= r.hasta; n++) if (usados.has(n)) choques.push(n);

  if (choques.length > 0) {
    const lista = choques.slice(0, MAX_CHOQUES_LISTADOS).join(", ");
    const resto = choques.length - MAX_CHOQUES_LISTADOS;
    const sufijo = resto > 0 ? ` y ${resto} más` : "";
    const texto =
      choques.length === 1 ? `Ya existe la cochera: ${lista}` : `Ya existen las cocheras: ${lista}${sufijo}`;
    return { ok: false, error: null, choques, cantidad: r.cantidad, texto, desde: r.desde, hasta: r.hasta };
  }

  const texto =
    r.cantidad === 1
      ? `Se va a crear la cochera #${r.desde}`
      : `Se van a crear ${r.cantidad} cocheras: del ${r.desde} al ${r.hasta}`;
  return { ok: true, error: null, choques: [], cantidad: r.cantidad, texto, desde: r.desde, hasta: r.hasta };
}

/**
 * Motivo por el que "Crear" no se puede usar, o `null` si la vista previa es válida (spec 14, D-FN4).
 * Sin nada escrito pide el número; si no, repite el texto que muestra el aviso.
 * @param {{ pristine: boolean, preview: { ok: boolean, texto: string } }} datos
 * @returns {string | null}
 */
export function motivoCrearCocheras({ pristine, preview }) {
  if (pristine) return "Ingresá el número de la cochera";
  return preview.ok ? null : preview.texto;
}

/**
 * Cuerpo de `POST /Cochera`. Sin `hasta` (o igual a `desde`) manda solo `{ desde }`:
 * así no se depende de cómo trate el backend un rango de un número.
 * @param {number} desde
 * @param {number} [hasta]
 * @returns {{ desde: number, hasta?: number }}
 */
export function buildCreateBody(desde, hasta) {
  if (hasta === undefined || hasta === null || hasta === "" || Number(hasta) === Number(desde)) {
    return { desde: Number(desde) };
  }
  return { desde: Number(desde), hasta: Number(hasta) };
}

/**
 * Valida el formulario de edición (D-FF8). El número de la propia cochera no cuenta como choque.
 * @param {{ numero: string|number, nota?: string }} form
 * @param {{ actual: number, existentes: number[] }} ctx `actual` es el número vigente de la cochera editada
 * @returns {{ ok: true, numero: number, nota: string|null }
 *   | { ok: false, errors: { numero?: string, nota?: string } }}
 */
export function validateEditCochera({ numero, nota }, { actual, existentes }) {
  const errors = {};
  const n = toInt(numero);
  if (n === null) errors.numero = MSG_FUERA_DE_RANGO;
  else if (!enRango(n)) errors.numero = MSG_FUERA_DE_RANGO;
  else if (n !== actual && (existentes ?? []).includes(n)) errors.numero = `Ya existe la cochera #${n}`;

  const texto = String(nota ?? "").trim();
  if (texto.length > MAX_NOTA) errors.nota = MSG_NOTA_LARGA;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, numero: n, nota: texto === "" ? null : texto };
}

/**
 * Cuerpo de `PUT /Cochera/{id}`. La nota va recortada, o `null` si queda vacía (el backend borra con
 * `null` y guardaría `""` como cadena vacía).
 * @param {number|string} numero
 * @param {string} [nota]
 * @returns {{ numero: number, nota: string|null }}
 */
export function buildUpdateBody(numero, nota) {
  const texto = String(nota ?? "").trim();
  return { numero: Number(numero), nota: texto === "" ? null : texto };
}

/**
 * Valida el motivo de un bloqueo (D-FF9): obligatorio y de hasta 300 caracteres (el backend no valida
 * el largo en `PUT /estado`).
 * @param {string} nota
 * @returns {{ ok: true, nota: string } | { ok: false, error: string }}
 */
export function validateBloqueo(nota) {
  const texto = String(nota ?? "").trim();
  if (texto === "") return { ok: false, error: MSG_MOTIVO_OBLIGATORIO };
  if (texto.length > MAX_NOTA) return { ok: false, error: MSG_MOTIVO_LARGO };
  return { ok: true, nota: texto };
}

/**
 * Cuerpo de `PUT /Cochera/{id}/estado`. Solo `DISPONIBLE` o `BLOQUEADA` (el backend rechaza el resto).
 * La nota va recortada, o `null` si queda vacía: nunca `""`.
 * @param {number} estado EstadoCochera.DISPONIBLE o EstadoCochera.BLOQUEADA
 * @param {string} [nota]
 * @returns {{ estado: number, nota: string|null }}
 */
export function buildEstadoBody(estado, nota) {
  const texto = String(nota ?? "").trim();
  return { estado, nota: texto === "" ? null : texto };
}

/**
 * Qué acciones de estado se ofrecen (D-FF9). "Bloquear" solo desde `DISPONIBLE`; "Desbloquear" solo
 * desde `BLOQUEADA`. `OCUPADA` y `RESERVADA` son calculados y no se tocan desde acá.
 * @param {number} estado
 * @returns {{ bloquear: boolean, desbloquear: boolean }}
 */
export function accionesDeEstado(estado) {
  return {
    bloquear: estado === EstadoCochera.DISPONIBLE,
    desbloquear: estado === EstadoCochera.BLOQUEADA,
  };
}

function toMs(value) {
  if (value instanceof Date) return value.getTime();
  if (value === null || value === undefined || value === "") return null;
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Texto de vencimiento: "vence en 2h 30m" / "venció hace 45m". Sin `fin` devuelve `""`.
 * @param {string|null|undefined} fin UtcInstant
 * @param {Date|string|number} now
 * @returns {string}
 */
export function vencimientoTexto(fin, now) {
  const finMs = toMs(fin);
  const nowMs = toMs(now);
  if (finMs === null || nowMs === null) return "";
  const diff = finMs - nowMs;
  const mins = Math.floor(Math.abs(diff) / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const texto = days > 0 ? `${days}d ${hrs % 24}h` : hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  return diff >= 0 ? `vence en ${texto}` : `venció hace ${texto}`;
}

/**
 * Qué muestra la tarjeta (D-FF5). Decide por `estado`; solo en una `BLOQUEADA` con `ocupacionActiva`
 * decide por el `inicio` (en curso u en el futuro). `ocupacionActiva` no implica `OCUPADA`.
 * @param {{ estado: number, ocupacionActiva?: { clienteNombre?: string, inicio?: string, fin?: string|null } | null }} cochera
 * @param {Date|string|number} now
 * @returns {{ cliente: string, modo: "ocupada"|"reservada"|"ninguno", inicio: string|null, fin: string|null,
 *   vence: string, bloqueada: boolean }}
 */
export function tarjetaInfo(cochera, now) {
  const ocupa = cochera?.ocupacionActiva ?? null;
  const estado = cochera?.estado;
  const bloqueada = estado === EstadoCochera.BLOQUEADA;
  const vacio = { cliente: "", modo: "ninguno", inicio: null, fin: null, vence: "", bloqueada };
  if (!ocupa) return vacio;

  let modo = "ninguno";
  if (estado === EstadoCochera.OCUPADA) modo = "ocupada";
  else if (estado === EstadoCochera.RESERVADA) modo = "reservada";
  else if (bloqueada) {
    const inicioMs = toMs(ocupa.inicio);
    const nowMs = toMs(now);
    modo = inicioMs !== null && nowMs !== null && inicioMs > nowMs ? "reservada" : "ocupada";
  }
  if (modo === "ninguno") return vacio;

  const fin = ocupa.fin ?? null;
  const vence = modo === "ocupada" ? (fin ? vencimientoTexto(fin, now) : MSG_SIN_FIN) : "";
  return { cliente: ocupa.clienteNombre ?? "", modo, inicio: ocupa.inicio ?? null, fin, vence, bloqueada };
}

const RECARGAN = new Set([
  "cochera_no_encontrada",
  "cochera_numero_repetido",
  "cochera_bloqueada",
  "cochera_con_ocupacion_activa",
  "cochera_no_disponible",
]);

/**
 * ¿Hay que recargar la lista (y el detalle) después del aviso? (D-FF11) Verdadero cuando el estado que
 * veía el usuario quedó viejo.
 * @param {string|undefined} code
 * @returns {boolean}
 */
export function shouldReloadAfter(code) {
  return RECARGAN.has(code);
}

/**
 * ¿Hay que cerrar el detalle después del aviso? Solo si la cochera ya no existe (D-FF11).
 * @param {string|undefined} code
 * @returns {boolean}
 */
export function shouldCloseDetailAfter(code) {
  return code === "cochera_no_encontrada";
}

/**
 * Ids de las ocupaciones que se marcan "con deuda" en el mosaico (P-FM10 de la spec 13): solo las de tipo Mes con
 * saldo y las Vencidas con saldo. En una de hora o de día en curso el saldo "hasta ahora" es normal, no deuda.
 * El front no calcula el saldo: compara el `saldo` que manda `GET /Ocupacion` con cero.
 * @param {{ id: number, tipo: number, estado?: number, estadoCalculado?: number, saldo?: number }[]} ocupaciones
 * @returns {Set<number>}
 */
export function ocupacionesConDeuda(ocupaciones) {
  const ids = new Set();
  for (const o of ocupaciones ?? []) {
    const saldo = typeof o?.saldo === "number" ? o.saldo : 0;
    if (saldo <= 0) continue;
    const vencida = (o.estadoCalculado ?? o.estado) === EstadoOcupacion.VENCIDA;
    if (o.tipo === TipoOcupacion.MES || vencida) ids.add(o.id);
  }
  return ids;
}

/**
 * Situación de una cochera para el mosaico. `deudaIds` es el resultado de `ocupacionesConDeuda`, o `null` si no
 * se pudo saber (sin permiso para ver ocupaciones, la lista llegó al tope o falló): entonces nunca se marca deuda.
 * @param {Parameters<typeof tarjetaInfo>[0]} cochera
 * @param {Date | string | number} now
 * @param {Set<number> | null} [deudaIds]
 * @returns {number} un valor de `SituacionCochera`
 */
export function situacionCochera(cochera, now, deudaIds = null) {
  const info = tarjetaInfo(cochera, now);
  if (info.bloqueada) return SituacionCochera.BLOQUEADA;
  if (info.modo === "ninguno") return SituacionCochera.LIBRE;
  if (info.modo === "reservada") return SituacionCochera.RESERVADA;
  const ocupa = cochera?.ocupacionActiva;
  if (deudaIds && deudaIds.has(ocupa?.ocupacionId)) return SituacionCochera.CON_DEUDA;
  if (ocupa?.tipo === TipoOcupacion.MES) return SituacionCochera.POR_MES;
  if (ocupa?.tipo === TipoOcupacion.DIA) return SituacionCochera.POR_DIA;
  return SituacionCochera.POR_HORA;
}

// Clave de `palette.pc.cochera` (colores del plano y la leyenda) de cada situación. Por día se pinta como por hora.
const CLAVE_COCHERA = {
  [SituacionCochera.LIBRE]: "libre",
  [SituacionCochera.POR_MES]: "porMes",
  [SituacionCochera.POR_HORA]: "porHora",
  [SituacionCochera.POR_DIA]: "porHora",
  [SituacionCochera.RESERVADA]: "reservado",
  [SituacionCochera.CON_DEUDA]: "deuda",
  [SituacionCochera.BLOQUEADA]: "bloqueado",
};

/**
 * Clave de `palette.pc.cochera` de una situación.
 * @param {number} situacion un valor de `SituacionCochera`
 * @returns {string}
 */
export function claveCochera(situacion) {
  return CLAVE_COCHERA[situacion] ?? "bloqueado";
}

/**
 * Cantidad de cocheras por situación, para la leyenda-filtro del Panel.
 * @param {number[]} situaciones una situación por cochera
 * @returns {Map<number, number>}
 */
export function contarSituaciones(situaciones) {
  const cuenta = new Map();
  for (const s of situaciones) cuenta.set(s, (cuenta.get(s) ?? 0) + 1);
  return cuenta;
}

/**
 * Segunda y tercera línea del mosaico (guía visual 2, Cocheras): "Desde HH:mm" (inicio), "Desde HH:mm · Hasta HH:mm"
 * en una reserva, o `null`. El formato de la hora lo pone quien llama (`formatHora`, zona del tenant).
 * @param {ReturnType<typeof tarjetaInfo>} info
 * @param {(instant: string) => string} formatHora
 * @returns {string | null}
 */
export function lineaHorario(info, formatHora) {
  if (info.modo === "ninguno" || !info.inicio) return null;
  const desde = `Desde ${formatHora(info.inicio)}`;
  return info.modo === "reservada" && info.fin ? `${desde} · Hasta ${formatHora(info.fin)}` : desde;
}
