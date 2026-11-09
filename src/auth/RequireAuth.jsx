// Guarda de autenticación (D-FA9).
// Sin sesión y sin error de Auth0: redirige a Auth0 una sola vez, con returnTo igual a la ruta actual.
// Con un error de Auth0: va a /login con el aviso y no vuelve a redirigir (evita un bucle).
import { useAuth0 } from "@auth0/auth0-react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LOGIN_REASON } from "../constants/errorCodes.js";
import AccountBlocked from "../pages/AccountBlocked.jsx";
import { ME_STATUS, useMe } from "./usePermissions.js";

export function Waiting({ text }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

export default function RequireAuth({ children }) {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const redirected = useRef(false);

  const mustLogin = !isLoading && !isAuthenticated && !error;
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!mustLogin || redirected.current) return;
    redirected.current = true;
    loginWithRedirect({ appState: { returnTo } });
  }, [mustLogin, returnTo, loginWithRedirect]);

  if (isLoading) return <Waiting text="Cargando…" />;

  if (error) {
    return (
      <Navigate to="/login" replace state={{ reason: LOGIN_REASON.AUTH0_ERROR, message: error.message }} />
    );
  }

  if (!isAuthenticated) return <Waiting text="Redirigiendo al inicio de sesión…" />;

  return <RequireMe>{children}</RequireMe>;
}

// Con sesión, espera a /me: cuenta bloqueada → pantalla completa; error → aviso con reintento manual.
function RequireMe({ children }) {
  const { status, error, reload } = useMe();

  if (status === ME_STATUS.BLOCKED) return <AccountBlocked message={error?.message} />;
  if (status === ME_STATUS.LOADING) return <Waiting text="Cargando tu cuenta…" />;
  if (status === ME_STATUS.ERROR) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}>
        <Box sx={{ textAlign: "center", maxWidth: 420 }}>
          <Alert severity="error">{error?.message || "No pudimos cargar tu cuenta."}</Alert>
          <Button sx={{ mt: 2 }} variant="contained" onClick={reload}>
            Reintentar
          </Button>
        </Box>
      </Box>
    );
  }

  return children;
}
