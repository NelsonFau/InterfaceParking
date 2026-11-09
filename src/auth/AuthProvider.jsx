// Provider de Auth0 (D-FA2, D-FA3). Va dentro de BrowserRouter para poder navegar en onRedirectCallback.
import { Auth0Provider } from "@auth0/auth0-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getConfig } from "../config.js";
import { safeReturnTo } from "./safeReturnTo.js";

const DEFAULT_ROUTE = "/dashboard";

export default function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { auth0 } = getConfig();

  // Vuelve a la ruta que el usuario quería ver, solo si es interna (evita un open redirect).
  const onRedirectCallback = useCallback(
    (appState) => {
      navigate(safeReturnTo(appState?.returnTo) ?? DEFAULT_ROUTE, { replace: true });
    },
    [navigate]
  );

  return (
    <Auth0Provider
      domain={auth0.domain}
      clientId={auth0.clientId}
      authorizationParams={{
        audience: auth0.audience,
        redirect_uri: `${window.location.origin}/callback`,
      }}
      // Tokens solo en memoria, con refresh token rotativo y sin iframe (D-FA2).
      // Al recargar, la memoria se pierde y RequireAuth vuelve a pasar por Auth0.
      cacheLocation="memory"
      useRefreshTokens
      useRefreshTokensFallback={false}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
