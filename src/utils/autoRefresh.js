// Lógica pura del refresco automático (spec 05, D-FE12). El efecto vive en useAutoRefresh.js.

/**
 * ¿Toca refrescar? `true` si nunca se cargó, o si pasó el intervalo (o más) desde la última carga.
 * @param {number | null | undefined} lastLoadedAt ms desde epoch de la última carga correcta
 * @param {number} now ms desde epoch
 * @param {number} intervalMs
 */
export function isStale(lastLoadedAt, now, intervalMs) {
  if (typeof lastLoadedAt !== "number" || !Number.isFinite(lastLoadedAt)) return true;
  return now - lastLoadedAt >= intervalMs;
}
