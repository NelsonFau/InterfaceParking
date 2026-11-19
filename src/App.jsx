import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./componentes/Layout.jsx";
import OperationalAlerts from "./pages/OperationalAlerts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Cocheras from "./pages/Cocheras.jsx";
import Clientes from "./pages/Clientes.jsx";
import Ocupaciones from "./pages/Ocupaciones.jsx";
import Tarifas from "./pages/Tarifas.jsx";
import Trazabilidad from "./pages/Trazabilidad.jsx";
import Configuracion from "./pages/Configuracion.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Login from "./pages/Login.jsx";
import Splash from "./pages/Splash.jsx";
import OperationalDashboard from "./pages/OperationalDashboard.jsx";
import Caja from "./pages/Caja.jsx";
import Callback from "./pages/Callback.jsx";
import RequireAuth from "./auth/RequireAuth.jsx";
import RequirePermission from "./auth/RequirePermission.jsx";
import { PRIVATE_ROUTES } from "./auth/routes.js";

// Pantalla de cada ruta privada. La ruta, su permiso y su ítem de menú salen de PRIVATE_ROUTES (D-FA8).
const PAGES = {
  "/dashboard": Dashboard,
  "/operaciones": OperationalDashboard,
  "/cocheras": Cocheras,
  "/ocupaciones": Ocupaciones,
  "/clientes": Clientes,
  "/tarifas": Tarifas,
  "/trazabilidad": Trazabilidad,
  "/alertas-operativas": OperationalAlerts,
  "/caja": Caja,
  "/configuracion": Configuracion,
  "/usuarios": Usuarios,
};

function PrivatePage({ path }) {
  const Page = PAGES[path];
  return Page ? <Page /> : null;
}

export default function App() {
  return (
    <Routes>
      {/* splash inicial */}
      <Route path="/" element={<Splash />} />

      {/* públicas: login y vuelta de Auth0 */}
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<Callback />} />

      {/* app protegida */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {PRIVATE_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RequirePermission permiso={route.permiso}>
                <PrivatePage path={route.path} />
              </RequirePermission>
            }
          />
        ))}
      </Route>

      {/* ruta vieja de Auditoría: redirige sin query y fuera del mapa, para no duplicar el ítem de menú (D-FD3) */}
      <Route path="/auditoria" element={<Navigate to="/trazabilidad" replace />} />

      {/* ruta vieja de Caja diaria: redirige sin query y fuera del mapa, para no duplicar el ítem de menú (D-FI3) */}
      <Route path="/caja-diaria" element={<Navigate to="/caja" replace />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
