// "Sin acceso" (D-FA8): el usuario no tiene permiso para ninguna ruta del mapa (por ejemplo, un SUPERADMIN,
// que solo tiene tenants.*).
import { Alert, Box, Typography } from "@mui/material";

export default function NoAccess() {
  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Sin acceso
      </Typography>
      <Alert severity="info">
        Tu usuario no tiene acceso a ninguna pantalla de la aplicación. Si creés que es un error, consultá con el
        dueño del garage.
      </Alert>
    </Box>
  );
}
