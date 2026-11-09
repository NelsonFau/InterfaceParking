// Guarda por permiso (D-FA8). Va dentro de RequireAuth, con /me ya cargado.
// Sin acceso a ninguna ruta del mapa → "Sin acceso"; sin el permiso de esta ruta → "No tenés permiso".
// No redirige: así no puede entrar en bucle.
import NoAccess from "../pages/NoAccess.jsx";
import Forbidden from "./Forbidden.jsx";
import { accessibleRoutes } from "./routes.js";
import { usePermissions } from "./usePermissions.js";

export default function RequirePermission({ permiso, children }) {
  const { permisos, can } = usePermissions();

  if (accessibleRoutes(permisos).length === 0) return <NoAccess />;
  if (!can(permiso)) return <Forbidden />;

  return children;
}
