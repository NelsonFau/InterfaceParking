// Parámetros de query (D-FB15).

/**
 * Opciones de `paramsSerializer` de axios para la instancia `http`: un arreglo sale como
 * `fuente=PAGO&fuente=CAJA`. El valor por defecto de axios lo manda como `fuente[]=PAGO&fuente[]=CAJA`
 * y el backend (Trazabilidad, `fuente` repetible) no lo enlaza. Vive acá, y no en `http.js`, para
 * probarlo sin importar la instancia (que valida la configuración y carga Auth0).
 */
export const PARAMS_SERIALIZER = { indexes: null };

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
