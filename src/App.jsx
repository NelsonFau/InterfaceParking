import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./componentes/Layout.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Cocheras from "./pages/Cocheras.jsx";
import Clientes from "./pages/Clientes.jsx";
import Ocupaciones from "./pages/Ocupaciones.jsx";
import Tarifas from "./pages/Tarifas.jsx";
import Auditoria from "./pages/Auditoria.jsx";
import Login from "./pages/Login.jsx";
import Splash from "./pages/Splash.jsx";

function isAuthed() {
  return !!localStorage.getItem("token");
}

function PrivateRoute({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* splash inicial */}
      <Route path="/" element={<Splash />} />

      {/* login */}
      <Route path="/login" element={isAuthed() ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* app protegida */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cocheras" element={<Cocheras />} />
        <Route path="/ocupaciones" element={<Ocupaciones />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/tarifas" element={<Tarifas />} />
        <Route path="/auditoria" element={<Auditoria />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
