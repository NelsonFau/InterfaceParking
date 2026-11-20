// Cuenta bloqueada (D-FA6): pantalla completa con el `title` de la API y el botón "Cerrar sesión".
// Llega por un 403 usuario_no_registrado, usuario_inactivo o tenant_inactivo. No se reintenta.
import { useAuth0 } from "@auth0/auth0-react";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";

export default function AccountBlocked({ message }) {
  const { logout } = useAuth0();

  const cerrarSesion = () => logout({ logoutParams: { returnTo: `${window.location.origin}/login` } });

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", px: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 460 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={600}>
              No podés acceder
            </Typography>
            <Alert severity="error">{message || "Tu cuenta no tiene acceso a la aplicación."}</Alert>
            <Button variant="contained" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
