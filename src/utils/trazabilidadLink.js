// Contrato de enlace profundo a Trazabilidad (spec 04, D-FD5). Módulo puro, sin React.
// Los parámetros llevan los nombres de la API. `desde` y `hasta` son DateOnly (`yyyy-MM-dd`) en la zona
// del tenant, no instantes. Quien enlace usa `buildTrazabilidadPath`, nunca arma el texto a mano, y
// muestra el enlace solo si `usePermissions().can("auditoria.ver")`.
import { TRAZABILIDAD_PATH } from "../auth/routes.js";
import { Fuente } from "../constants/enums.js";
import { isDateOnly } from "./fechas.js";

export { TRAZABILIDAD_PATH };

/** Ids de objeto, en el orden fijo del query. */
export const ID_KEYS = ["ocupacionId", "pagoId", "cajaSesionId", "usuarioId"];

const FUENTES = Object.values(Fuente);
const ID_RE = /^[1-9]\d*$/;

/** Entero positivo, como número o como texto de dígitos. */
export function isPositiveId(value) {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0;
  return typeof value === "string" && ID_RE.test(value.trim()) && Number.isSafeInteger(Number(value.trim()));
}

/** Texto en mayúsculas y sin espacios en los bordes: ` pago ` → `PAGO`. */
function canonical(s) {
  return String(s).trim().toUpperCase();
}

/** Lista de fuentes válidas, normalizadas y sin repetidos, en el orden en que llegan. */
function normalizeFuentes(fuente) {
  const lista = Array.isArray(fuente) ? fuente : fuente == null ? [] : [fuente];
  const out = [];
  for (const f of lista) {
    if (typeof f !== "string") continue;
    const c = canonical(f);
    if (FUENTES.includes(c) && !out.includes(c)) out.push(c);
  }
  return out;
}

// El rango es un par: los dos DateOnly válidos y desde <= hasta (los DateOnly ordenan como texto).
function validRange(desde, hasta) {
  return isDateOnly(desde) && isDateOnly(hasta) && desde <= hasta;
}

/**
 * Ruta con el query en orden fijo (`ocupacionId`, `pagoId`, `cajaSesionId`, `usuarioId`, `fuente`,
 * `desde`, `hasta`). Omite lo vacío y lo inválido; no lanza.
 * @param {{ ocupacionId?: number|string, pagoId?: number|string, cajaSesionId?: number|string,
 *   usuarioId?: number|string, fuente?: string[]|string, desde?: string, hasta?: string }} [filtros]
 * @returns {string} por ejemplo `/trazabilidad?ocupacionId=12`
 */
export function buildTrazabilidadPath(filtros) {
  const f = filtros && typeof filtros === "object" ? filtros : {};
  const query = new URLSearchParams();
  for (const key of ID_KEYS) {
    if (isPositiveId(f[key])) query.append(key, String(Number(String(f[key]).trim())));
  }
  for (const fuente of normalizeFuentes(f.fuente)) query.append("fuente", fuente);
  if (validRange(f.desde, f.hasta)) {
    query.append("desde", f.desde);
    query.append("hasta", f.hasta);
  }
  const texto = query.toString();
  return texto ? `${TRAZABILIDAD_PATH}?${texto}` : TRAZABILIDAD_PATH;
}

/**
 * Lee el query de la URL (con o sin `?`, o un `URLSearchParams`). Lo inválido se ignora y se informa
 * en `ignorados` (nombres de parámetro, sin repetir): un id que no es entero positivo, una `fuente`
 * desconocida, y el par `desde`/`hasta` completo si falta uno, tiene fecha mal formada o está invertido.
 * Un parámetro presente pero vacío (`ocupacionId=`) se trata como ausente.
 * @param {string | URLSearchParams} search
 * @returns {{ filtros: { ocupacionId?: number, pagoId?: number, cajaSesionId?: number, usuarioId?: number,
 *   fuente?: string[], desde?: string, hasta?: string }, ignorados: string[] }}
 */
export function parseTrazabilidadQuery(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search ?? "");
  const filtros = {};
  const ignorados = [];

  for (const key of ID_KEYS) {
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") continue;
    if (isPositiveId(raw)) filtros[key] = Number(raw.trim());
    else ignorados.push(key);
  }

  const crudas = params.getAll("fuente").filter((v) => v.trim() !== "");
  if (crudas.length > 0) {
    const validas = normalizeFuentes(crudas);
    if (validas.length > 0) filtros.fuente = validas;
    if (validas.length === 0 || crudas.some((v) => !FUENTES.includes(canonical(v)))) ignorados.push("fuente");
  }

  const desde = (params.get("desde") ?? "").trim();
  const hasta = (params.get("hasta") ?? "").trim();
  if (desde !== "" || hasta !== "") {
    if (validRange(desde, hasta)) {
      filtros.desde = desde;
      filtros.hasta = hasta;
    } else {
      ignorados.push("desde", "hasta");
    }
  }

  return { filtros, ignorados };
}
