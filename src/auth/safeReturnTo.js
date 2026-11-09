// Ruta de retorno segura después del login (D-FA9; en la spec, `rutaDeRetornoSegura`).
// Solo acepta rutas internas: empiezan con "/" y no con "//" ni "/\" (que el navegador trata como "//").
// Evita un open redirect con un `returnTo` manipulado. Devuelve la ruta o null.

export function safeReturnTo(value) {
  if (typeof value !== "string" || value === "") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  // Caracteres de control (por ejemplo, un tab o salto de línea que el navegador descarta).
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
