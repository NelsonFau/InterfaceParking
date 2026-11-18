// Contexto de /me (D-FA7) y registro del puente de autenticación (D-FA5).
// Va dentro de AuthProvider. Pide GET /me una vez por sesión y lo guarda solo en memoria.
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerAuthBridge } from "../api/authBridge.js";
import { ApiError, normalizeError } from "../api/errors.js";
import { getMe } from "../api/meApi.js";
import { LOGIN_REASON, TREATMENT, treatmentFor } from "../constants/errorCodes.js";
import { isValidTimeZone } from "../utils/fechas.js";
import { ME_STATUS, MeContext } from "./usePermissions.js";

const initialState = { status: ME_STATUS.LOADING, me: null, error: null };

// Sin zona horaria válida no se puede mostrar ni enviar ninguna fecha (D-FB2, D-FB7):
// se trata como un error de /me, con "Reintentar", y no se cae a la zona del navegador.
const timeZoneError = () =>
  new ApiError({ code: "respuesta_invalida", message: "No pudimos leer la zona horaria del local" });

// Un bloqueo de cuenta no se pisa con un resultado posterior.
const unlessBlocked = (next) => (current) => (current.status === ME_STATUS.BLOCKED ? current : next);

export default function MeProvider({ children }) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [state, setState] = useState(initialState);
  const [attempt, setAttempt] = useState(0);

  // navigate cambia con cada navegación; el puente usa siempre la última sin volver a registrarse.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // Puente para http.js. Se registra antes que el efecto que pide /me (mismo componente, orden de declaración).
  useEffect(
    () =>
      registerAuthBridge({
        getToken: () => getAccessTokenSilently(),
        // Fuerza la renovación con el refresh token, sin usar la caché.
        refreshToken: () => getAccessTokenSilently({ cacheMode: "off" }),
        // Sesión perdida: a /login con el aviso, sin redirigir sola a Auth0 (D-FA9).
        onSessionLost: () =>
          navigateRef.current("/login", { replace: true, state: { reason: LOGIN_REASON.SESSION_EXPIRED } }),
        onAccountBlocked: (apiError) => setState({ status: ME_STATUS.BLOCKED, me: null, error: apiError }),
      }),
    [getAccessTokenSilently]
  );

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    getMe()
      .then((me) => {
        if (cancelled) return;
        if (!isValidTimeZone(me?.tenant?.zonaHoraria)) {
          setState(unlessBlocked({ status: ME_STATUS.ERROR, me: null, error: timeZoneError() }));
          return;
        }
        setState(unlessBlocked({ status: ME_STATUS.READY, me, error: null }));
      })
      .catch((err) => {
        if (cancelled) return;
        const apiError = normalizeError(err);
        const blocked = treatmentFor(apiError.code) === TREATMENT.ACCOUNT_BLOCKED;
        setState(
          blocked
            ? { status: ME_STATUS.BLOCKED, me: null, error: apiError }
            : unlessBlocked({ status: ME_STATUS.ERROR, me: null, error: apiError })
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, attempt]);

  // Reintento manual tras un error al cargar /me.
  const reload = useCallback(() => {
    setState(initialState);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(() => ({ ...state, reload }), [state, reload]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}
