// Formato de moneda y números (D-FB12). Único lugar donde viven el locale y la moneda.
// La moneda por tenant queda pendiente (P-FB3): /me no la trae, así que se fija UYU.

const LOCALE = "es-UY";
const CURRENCY = "UYU";
const SIN_DATO = "—";

// null, undefined, "" y no numéricos → null. Un cero es un número válido.
function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Importe en pesos uruguayos. Sin dato (por ejemplo `precioTotal` antes de finalizar) → "—". */
export function formatMoney(value) {
  const n = toNumber(value);
  if (n === null) return SIN_DATO;
  try {
    return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(n);
  } catch {
    return `$ ${n}`;
  }
}

/** Número sin moneda, con separador de miles (conteos, porcentajes). Sin dato → "—". */
export function formatNumber(value) {
  const n = toNumber(value);
  if (n === null) return SIN_DATO;
  try {
    return new Intl.NumberFormat(LOCALE).format(n);
  } catch {
    return String(n);
  }
}
