// Parámetros de query (D-FB15).

/**
 * Quita las claves con `undefined`, `null` o `""`, para no mandar `q=` ni `hasta=`.
 * Conserva `false` y `0`. No modifica el objeto recibido.
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
export function cleanParams(obj) {
  return Object.fromEntries(
    Object.entries(obj ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}
