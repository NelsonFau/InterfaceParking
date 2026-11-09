// Configuración del frontend leída de las variables VITE_ (D-FA11).
// Toda variable VITE_ termina en el JavaScript del navegador: ninguna es secreta.
// Si falta una o es inválida, falla nombrando la variable.

const REQUIRED = [
  "VITE_API_BASE_URL",
  "VITE_AUTH0_DOMAIN",
  "VITE_AUTH0_CLIENT_ID",
  "VITE_AUTH0_AUDIENCE",
];

export function validateConfig(env) {
  const source = env ?? {};

  for (const name of REQUIRED) {
    const value = source[name];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Falta la variable de entorno ${name}.`);
    }
  }

  const apiBaseUrl = source.VITE_API_BASE_URL.trim().replace(/\/+$/, "");
  if (!apiBaseUrl.endsWith("/api/v1")) {
    throw new Error(
      `La variable de entorno VITE_API_BASE_URL debe terminar en /api/v1 (valor actual: ${apiBaseUrl}).`
    );
  }

  const domain = source.VITE_AUTH0_DOMAIN.trim();
  if (domain.includes("://") || domain.includes("/")) {
    throw new Error(
      "La variable de entorno VITE_AUTH0_DOMAIN debe ser solo el dominio, sin https:// ni rutas."
    );
  }

  return {
    apiBaseUrl,
    auth0: {
      domain,
      clientId: source.VITE_AUTH0_CLIENT_ID.trim(),
      audience: source.VITE_AUTH0_AUDIENCE.trim(),
    },
  };
}

let cached = null;

// Se valida la primera vez que alguien pide la configuración (al arrancar la app).
export function getConfig() {
  if (!cached) cached = validateConfig(import.meta.env);
  return cached;
}
