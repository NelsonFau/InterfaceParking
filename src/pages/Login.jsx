// /login (D-FA9): pantalla pública con el botón "Ingresar" y, según el motivo, un aviso.
// Es adonde llega el logout y donde cae una sesión perdida o un error de Auth0. No redirige sola.
import { useAuth0 } from "@auth0/auth0-react";
import { Alert, Box, Button, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LOGIN_REASON } from "../constants/errorCodes.js";

function noticeFor(state) {
  if (state?.reason === LOGIN_REASON.SESSION_EXPIRED) {
    return { severity: "warning", text: "Tu sesión venció. Ingresá de nuevo." };
  }
  if (state?.reason === LOGIN_REASON.AUTH0_ERROR) {
    return {
      severity: "error",
      text: state.message ? `No se pudo iniciar sesión: ${state.message}` : "No se pudo iniciar sesión.",
    };
  }
  return null;
}

export default function Login() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const notice = noticeFor(location.state);

  // Con sesión y sin un motivo para estar acá, no tiene sentido mostrar el login.
  if (!isLoading && isAuthenticated && !notice) return <Navigate to="/dashboard" replace />;

  function ingresar() {
    setRedirecting(true);
    loginWithRedirect();
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "#f6f8fb",
        px: 2,
        py: 3,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 18px 40px rgba(16,24,40,.08)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Iniciar sesión
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accedé al panel de tu garage
              </Typography>
            </Box>

            <Divider />

            {notice ? <Alert severity={notice.severity}>{notice.text}</Alert> : null}

            <Button
              variant="contained"
              size="large"
              disabled={isLoading || redirecting}
              onClick={ingresar}
              sx={{ borderRadius: 2, py: 1.2, fontWeight: 800 }}
            >
              {redirecting ? "Redirigiendo..." : "Ingresar"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
