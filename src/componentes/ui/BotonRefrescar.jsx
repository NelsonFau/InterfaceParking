// Botón circular arena con el ícono de refrescar (guía visual 1.3). Va junto a las acciones de la página.
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button } from "@mui/material";

/** @param {import("@mui/material").ButtonProps & { etiqueta?: string }} props */
export default function BotonRefrescar({ etiqueta = "Actualizar", ...props }) {
  return (
    <Button variant="refrescar" aria-label={etiqueta} title={etiqueta} {...props}>
      <RefreshIcon fontSize="small" />
    </Button>
  );
}
