// Cliente HTTP único hacia /api/v1 (D-FA5). Agrega el token y normaliza todo error en un ApiError (D-FA6).
import axios from "axios";
import { getConfig } from "../config.js";
import { TREATMENT, treatmentFor } from "../constants/errorCodes.js";
import { accountBlocked, getToken, refreshToken, sessionLost } from "./authBridge.js";
import { ApiError, normalizeError } from "./errors.js";

export const http = axios.create({
  baseURL: getConfig().apiBaseUrl,
  timeout: 20000,
  // Un arreglo sale como `fuente=PAGO&fuente=CAJA` (el valor por defecto, `fuente[]=PAGO`, no lo enlaza
  // el backend; D-FB15).
  paramsSerializer: { indexes: null },
  headers: {
    // P-FA5: se mantiene hasta confirmar que el backend ya no se expone por ngrok.
    "ngrok-skip-browser-warning": "true",
  },
});

// El frontend nunca manda un TenantId: el tenant sale del token en el backend.
http.interceptors.request.use(async (config) => {
  // En el reintento tras un 401 se usa el token recién renovado.
  let token = config._retryToken;
  if (!token) {
    try {
      token = await getToken();
    } catch {
      token = null;
    }
    // El SDK no puede dar un token (login_required, missing_refresh_token, refresh token vencido o
    // revocado) o no devuelve ninguno (tope de la sesión alcanzado).
    if (!token) {
      sessionLost();
      throw new ApiError({ status: 401, code: "no_autenticado", message: "Tu sesión venció." });
    }
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Ya normalizado y tratado (por ejemplo, el rechazo del interceptor de request).
    if (error instanceof ApiError) throw error;

    const apiError = normalizeError(error);
    const config = error.config;

    if (apiError.code === "no_autenticado") {
      // Un solo reintento, con un token renovado a la fuerza (renovación compartida entre pedidos).
      if (config && !config._authRetried) {
        let token = null;
        try {
          token = await refreshToken();
        } catch {
          token = null;
        }
        if (!token) {
          sessionLost();
          throw apiError;
        }
        return http({ ...config, _authRetried: true, _retryToken: token });
      }
      // El reintento con un token recién renovado también dio 401: sesión perdida.
      sessionLost();
      throw apiError;
    }

    if (treatmentFor(apiError.code) === TREATMENT.ACCOUNT_BLOCKED) {
      accountBlocked(apiError);
    }

    throw apiError;
  }
);
