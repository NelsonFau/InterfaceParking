// Botón que se deshabilita con un motivo y lo muestra en un tooltip (spec 14, D-FN1).
// El llamador no pasa `disabled`: se calcula como `ocupado || Boolean(motivo)` y cualquier `disabled` recibido se ignora.
import { Box, Button, Tooltip } from "@mui/material";

/**
 * @param {import("@mui/material").ButtonProps & { motivo?: string | null, ocupado?: boolean }} props
 *   `motivo`: por qué no se puede usar el botón (condición que persiste).
 *   `ocupado`: estado transitorio (guardando, cargando); no muestra tooltip.
 */
export default function BotonConMotivo({ motivo = null, ocupado = false, ...props }) {
  // `disabled` va después de `props`: pisa cualquier `disabled` que llegue.
  const boton = <Button {...props} disabled={ocupado || Boolean(motivo)} />;
  if (!motivo || ocupado) return boton;
  // Un botón deshabilitado no dispara eventos: el Tooltip se ancla a un span alcanzable con el teclado.
  // El Tooltip de MUI ya pone el aria-label con el título.
  return (
    <Tooltip title={motivo}>
      <Box component="span" tabIndex={0} sx={{ display: "inline-flex" }}>
        {boton}
      </Box>
    </Tooltip>
  );
}
