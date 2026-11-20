// Paginación en texto (guía visual 1.7): "1–3 de 3 ‹ Anterior · Siguiente ›". "Anterior" y "Siguiente" son enlaces y
// quedan grises cuando no aplican. `page` es la del backend (de 1 en 1).
import { Box, Link, Typography } from "@mui/material";
import { lastPage, rangoPagina } from "../../utils/paginacion.js";

/**
 * @param {{ page: number, pageSize: number, total: number, count: number, onPageChange: (page: number) => void }} props
 * `count` es la cantidad de filas que trae la página actual.
 */
export default function PaginacionTexto({ page, pageSize, total, count, onPageChange }) {
  const { from, to } = rangoPagina({ page, pageSize, total, count });
  const hayAnterior = page > 1;
  const haySiguiente = page < lastPage(total, pageSize);

  const enlace = (activo, texto, destino) => (
    <Link
      component="button"
      type="button"
      underline={activo ? "hover" : "none"}
      disabled={!activo}
      onClick={() => activo && onPageChange(destino)}
      sx={{ color: activo ? "text.primary" : "text.disabled", cursor: activo ? "pointer" : "default", font: "inherit", verticalAlign: "baseline" }}
    >
      {texto}
    </Link>
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      <Typography variant="body2" color="text.secondary" component="span">
        {total > 0 ? `${from}–${to} de ${total}` : "0 de 0"}
      </Typography>
      <Typography variant="body2" component="span" color="text.secondary">
        {enlace(hayAnterior, "‹ Anterior", page - 1)}
        {" · "}
        {enlace(haySiguiente, "Siguiente ›", page + 1)}
      </Typography>
    </Box>
  );
}
