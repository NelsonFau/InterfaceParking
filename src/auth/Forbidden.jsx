// "No tenés permiso" (D-FA8): se muestra en lugar de la pantalla, sin redirigir.
import { Alert, Box } from "@mui/material";

export default function Forbidden() {
  return (
    <Box sx={{ maxWidth: 520 }}>
      <Alert severity="warning">No tenés permiso para ver esta pantalla.</Alert>
    </Box>
  );
}
