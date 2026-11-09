// Guarda de autenticación (D-FA9).
// Sin sesión y sin error de Auth0: redirige a Auth0 una sola vez, con returnTo igual a la ruta actual.
// Con un error de Auth0: va a /login con el aviso y no vuelve a redirigir (evita un bucle).
import { useAuth0 } from "@auth0/auth0-react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LOGIN_REASON } from "../constants/errorCodes.js";

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

  return children;
}
