// Zonas horarias que acepta el backend (spec 11, D-FK4). Fuente: docs/inventario/backend.md, sección 5
// (ZonasHorarias.cs:14-28, comparación exacta). No hay endpoint que devuelva la lista.
// `value` es el IANA exacto; el orden es el del inventario.

export const ZONAS_HORARIAS = [
  { value: "America/Montevideo", label: "Montevideo (Uruguay)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (Argentina)" },
  { value: "America/Argentina/Cordoba", label: "Córdoba (Argentina)" },
  { value: "America/Argentina/Mendoza", label: "Mendoza (Argentina)" },
  { value: "America/Sao_Paulo", label: "São Paulo (Brasil)" },
  { value: "America/Bahia", label: "Bahía (Brasil)" },
  { value: "America/Fortaleza", label: "Fortaleza (Brasil)" },
  { value: "America/Belem", label: "Belém (Brasil)" },
  { value: "America/Manaus", label: "Manaos (Brasil)" },
  { value: "America/Cuiaba", label: "Cuiabá (Brasil)" },
  { value: "America/Campo_Grande", label: "Campo Grande (Brasil)" },
  { value: "America/Rio_Branco", label: "Rio Branco (Brasil)" },
];

/** Etiqueta de una zona; si no está en la lista, el IANA tal cual (no esconde un dato raro). */
export function labelOfZona(value) {
  return ZONAS_HORARIAS.find((z) => z.value === value)?.label ?? String(value ?? "");
}
