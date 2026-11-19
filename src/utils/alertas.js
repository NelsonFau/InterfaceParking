// Lógica pura de las pantallas de alertas (spec 05). Sin React ni zona del sistema: la zona del tenant
// se pasa explícita. Cubre el query del listado (D-FE5), los filtros de la URL (D-FE6), la regla de
// resolución (D-FE8), el resumen de resolución (D-FE9) y los enlaces de cada fila (D-FE10).
import { SeveridadAlerta, TipoAlertaOperativa } from "../constants/enums.js";
import { dateRangeToInstants, inputToDateOnly } from "./fechas.js";
import { ALERTAS_PATH } from "../auth/routes.js";
import { buildOcupacionPath } from "./ocupacionLink.js";
import { buildTrazabilidadPath, isPositiveId } from "./trazabilidadLink.js";

/** Cada cuánto se recarga sola una pantalla de alertas: coincide con la frecuencia del job del servidor (D-FE12). */
export const ALERTS_REFRESH_MS = 300000;

/** Tope del comentario de resolución; el backend rechaza más de 500. */
export const MAX_COMENTARIO = 500;

export { ALERTAS_PATH };

export const MSG_RANGO_INVERTIDO = "La fecha 'Desde' no puede ser posterior a 'Hasta'";
export const MSG_FECHA_INVALIDA = "La fecha no es válida.";
export const MSG_COMENTARIO_OBLIGATORIO = "Obligatorio en alertas de dinero";
export const MSG_COMENTARIO_LARGO = `El comentario no puede tener más de ${MAX_COMENTARIO} caracteres.`;
export const MSG_SIN_PERMISO_DINERO = "Tu usuario no tiene permiso para resolver alertas de dinero.";

/** Grupos de tipos que usa el Monitor para sus indicadores (D-FE11). El backend filtra de a un tipo. */
export const TIPOS_PAGOS_SOSPECHOSOS = [
  TipoAlertaOperativa.OCUPACION_FINALIZADA_SIN_PAGO,
  TipoAlertaOperativa.PAGO_MENOR_AL_ESPERADO,
  TipoAlertaOperativa.PAGO_REGISTRADO_TARDE,
];
export const TIPOS_OCUPACIONES_VENCIDAS = [
  TipoAlertaOperativa.OCUPACION_VENCIDA_SIN_PAGO,
  TipoAlertaOperativa.OCUPACION_VENCIDA_SIN_CIERRE,
];

/**
 * Filtros del formulario, con los valores que usan los `<select>` y los `<input>` (texto).
 * `estado`: `"false"` abiertas, `"true"` resueltas, `""` todas.
 */
export const DEFAULT_ALERT_FILTERS = Object.freeze({
  estado: "false",
  severidad: "",
  tipo: "",
  desde: "",
  hasta: "",
  ocupacionId: null,
  cajaSesionId: null,
});

const isEmpty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// Entero de un select (texto) o de la URL; vacío → undefined.
const toInt = (v) => (isEmpty(v) ? undefined : Number(v));

/**
 * Arma los parámetros de `listAlertas` desde los filtros del formulario. Omite lo vacío.
 * `desde` y `hasta` son `DateOnly` en la zona del tenant y salen como instantes sobre `fechaCreacion`,
 * con `hasta` inclusivo. Si `desde > hasta` o una fecha no es válida, no devuelve parámetros.
 * @param {Partial<typeof DEFAULT_ALERT_FILTERS> & { page?: number, pageSize?: number }} [filters]
 * @param {string} timeZone IANA, la del tenant
 * @returns {{ ok: true, params: Record<string, unknown> } | { ok: false, field: "desde" | "hasta", message: string }}
 */
export function buildAlertQuery(filters, timeZone) {
  const f = { ...DEFAULT_ALERT_FILTERS, ...filters };

  const desde = isEmpty(f.desde) ? null : inputToDateOnly(f.desde);
  const hasta = isEmpty(f.hasta) ? null : inputToDateOnly(f.hasta);
  if (!isEmpty(f.desde) && desde === null) return { ok: false, field: "desde", message: MSG_FECHA_INVALIDA };
  if (!isEmpty(f.hasta) && hasta === null) return { ok: false, field: "hasta", message: MSG_FECHA_INVALIDA };
  // Los DateOnly ordenan como texto.
  if (desde !== null && hasta !== null && desde > hasta) {
    return { ok: false, field: "desde", message: MSG_RANGO_INVERTIDO };
  }
  const instants = dateRangeToInstants(desde, hasta, timeZone);

  const params = {};
  if (f.estado === "true" || f.estado === "false") params.resuelta = f.estado === "true";
  const severidad = toInt(f.severidad);
  if (severidad !== undefined) params.severidad = severidad;
  const tipo = toInt(f.tipo);
  if (tipo !== undefined) params.tipo = tipo;
  if (isPositiveId(f.ocupacionId)) params.ocupacionId = Number(f.ocupacionId);
  if (isPositiveId(f.cajaSesionId)) params.cajaSesionId = Number(f.cajaSesionId);
  if (instants.desde !== null) params.desde = instants.desde;
  if (instants.hasta !== null) params.hasta = instants.hasta;
  if (f.page !== undefined) params.page = f.page;
  if (f.pageSize !== undefined) params.pageSize = f.pageSize;
  return { ok: true, params };
}

/**
 * Filtros iniciales desde la URL (se leen una vez, al montar). Lo que no existe en su enum o no es un
 * entero positivo se ignora. `estado` acepta `true`, `false` o vacío (todas).
 * @param {string | URLSearchParams} search
 * @returns {{ estado?: string, severidad?: number, tipo?: number, ocupacionId?: number, cajaSesionId?: number }}
 */
export function parseAlertFiltersFromSearch(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? "");
  const out = {};

  const estado = params.get("estado");
  if (estado !== null && ["true", "false", ""].includes(estado.trim())) out.estado = estado.trim();

  const enumValue = (name, E) => {
    const raw = params.get(name);
    if (raw === null || !isPositiveId(raw)) return;
    const n = Number(raw.trim());
    if (Object.values(E).includes(n)) out[name] = n;
  };
  enumValue("severidad", SeveridadAlerta);
  enumValue("tipo", TipoAlertaOperativa);

  for (const name of ["ocupacionId", "cajaSesionId"]) {
    const raw = params.get(name);
    if (raw !== null && isPositiveId(raw)) out[name] = Number(raw.trim());
  }
  return out;
}

/**
 * Suma los conteos de un grupo de pedidos (`Promise.allSettled`). Si alguno falló, el total no es
 * exacto: devuelve `null` (la tarjeta muestra "—") en vez de un número parcial.
 * @param {PromiseSettledResult<number>[]} results
 * @returns {number | null}
 */
export function sumCounts(results) {
  let sum = 0;
  for (const r of results) {
    if (r.status !== "fulfilled" || typeof r.value !== "number") return null;
    sum += r.value;
  }
  return sum;
}

/**
 * Ruta de Alertas con una severidad ya aplicada (la usa el Monitor). Sin severidad, la ruta sola.
 * @param {{ severidad?: number }} [filters]
 */
export function buildAlertasPath({ severidad } = {}) {
  return severidad === undefined ? ALERTAS_PATH : `${ALERTAS_PATH}?severidad=${severidad}`;
}

/**
 * Estado del botón "Resolver alerta" de una fila, según permisos (nunca por rol: ARQ-4).
 * `esDeDinero` es el de la respuesta de la API, no la marca `dinero` de `enums.js`.
 * @param {{ resuelta?: boolean, esDeDinero?: boolean }} alerta
 * @param {(permiso: string) => boolean} can
 * @returns {{ visible: boolean, enabled: boolean, reason: string }}
 */
export function getResolveState(alerta, can) {
  if (alerta?.resuelta) return { visible: false, enabled: false, reason: "" };
  if (!can("alertas.resolver")) return { visible: false, enabled: false, reason: "" };
  if (alerta?.esDeDinero && !can("alertas.resolver_dinero")) {
    return { visible: true, enabled: false, reason: MSG_SIN_PERMISO_DINERO };
  }
  return { visible: true, enabled: true, reason: "" };
}

/**
 * Cuerpo del PATCH de resolución. Recorta el comentario; obligatorio en alertas de dinero; tope de 500.
 * Si queda vacío en una alerta que no es de dinero, el cuerpo es `{}` (no se manda `comentario: ""`).
 * @param {{ esDeDinero?: boolean }} alerta
 * @param {string} comentario
 * @returns {{ ok: true, body: { comentario?: string } } | { ok: false, message: string }}
 */
export function buildResolveBody(alerta, comentario) {
  const texto = typeof comentario === "string" ? comentario.trim() : "";
  if (texto === "") {
    if (alerta?.esDeDinero) return { ok: false, message: MSG_COMENTARIO_OBLIGATORIO };
    return { ok: true, body: {} };
  }
  if (texto.length > MAX_COMENTARIO) return { ok: false, message: MSG_COMENTARIO_LARGO };
  return { ok: true, body: { comentario: texto } };
}

/**
 * Cómo se resolvió una alerta, para mostrar en su fila. `null` si está abierta.
 * @param {object} alerta
 * @param {(instant: string) => string} [formatDate] por ejemplo `formatInstant` de `useTenantDates`
 * @returns {{ text: string, comentario: string | null } | null}
 */
export function resolutionSummary(alerta, formatDate = String) {
  if (!alerta?.resuelta) return null;
  let text = "Resuelta";
  if (alerta.fechaResolucion) text += ` el ${formatDate(alerta.fechaResolucion)}`;
  if (alerta.resolucionAutomatica) {
    text += " automáticamente";
  } else if (alerta.resueltaPorNombre) {
    text += ` por ${alerta.resueltaPorNombre}`;
  } else if (alerta.resueltaPorUsuarioId != null) {
    text += ` por el usuario #${alerta.resueltaPorUsuarioId}`;
  }
  const comentario = typeof alerta.comentarioResolucion === "string" ? alerta.comentarioResolucion.trim() : "";
  return { text, comentario: comentario === "" ? null : comentario };
}

/**
 * Enlaces de una fila: el único lugar que los decide (D-FE10). La 07 sumó el de Ocupación (D-FG14);
 * la 09 suma acá el suyo (P-FE1).
 * @param {{ ocupacionId?: number | null, cajaSesionId?: number | null }} alerta
 * @param {{ canTrazabilidad?: boolean, canOcupaciones?: boolean }} [permisos]
 * @returns {{ key: string, label: string, to: string }[]}
 */
export function getAlertLinks(alerta, { canTrazabilidad = false, canOcupaciones = false } = {}) {
  const links = [];
  const ocupacionId = alerta?.ocupacionId ?? undefined;
  const cajaSesionId = alerta?.cajaSesionId ?? undefined;
  if (canOcupaciones && isPositiveId(ocupacionId)) {
    links.push({ key: "ocupacion", label: "Ver ocupación", to: buildOcupacionPath(ocupacionId) });
  }
  if (canTrazabilidad && (isPositiveId(ocupacionId) || isPositiveId(cajaSesionId))) {
    links.push({
      key: "trazabilidad",
      label: "Ver trazabilidad",
      to: buildTrazabilidadPath({ ocupacionId, cajaSesionId }),
    });
  }
  return links;
}
