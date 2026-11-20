// Iniciales de un nombre para los círculos de usuario y de cliente. Módulo puro.

/**
 * "Ana Pérez" -> "AP"; un solo nombre -> su inicial; con más de dos palabras, la primera y la última; sin nombre -> "?".
 * @param {string | null | undefined} nombre
 * @returns {string}
 */
export function iniciales(nombre) {
  const parts = String(nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
