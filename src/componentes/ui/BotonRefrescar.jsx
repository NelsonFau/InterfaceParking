// Botón redondo de refrescar (detalles de Claude Design 4: 42 px, ícono de 22 px). Va junto a las acciones de la página.
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button } from "@mui/material";

/** @param {import("@mui/material").ButtonProps & { etiqueta?: string }} props */
export default function BotonRefrescar({ etiqueta = "Actualizar", ...props }) {
  return (
    <Button variant="refrescar" aria-label={etiqueta} title={etiqueta} {...props}>
      <RefreshIcon sx={{ fontSize: 22 }} />
    </Button>
  );
}
