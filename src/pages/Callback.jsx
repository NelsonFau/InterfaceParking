// /callback (D-FA9): Auth0Provider procesa el código y onRedirectCallback navega a la ruta de retorno.
// Si Auth0 devolvió un error, se va a /login con el aviso, sin volver a redirigir.
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { Waiting } from "../auth/RequireAuth.jsx";
import { LOGIN_REASON } from "../constants/errorCodes.js";

export default function Callback() {
  const { isLoading, isAuthenticated, error } = useAuth0();

  if (!isLoading && error) {
    return (
      <Navigate to="/login" replace state={{ reason: LOGIN_REASON.AUTH0_ERROR, message: error.message }} />
    );
  }

  // Una visita a /callback sin código (por ejemplo, recargada) no tiene nada que procesar.
  if (!isLoading && !isAuthenticated) return <Navigate to="/login" replace />;

  return <Waiting text="Ingresando…" />;
}
