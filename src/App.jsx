import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./componentes/Layout.jsx";
import RequireAuth from "./componentes/RequireAuth.jsx";

import Splash from "./pages/Splash.jsx";
import Login from "./pages/Login.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Cocheras from "./pages/Cocheras.jsx";
import Clientes from "./pages/Clientes.jsx";
import Ocupaciones from "./pages/Ocupaciones.jsx";
import Tarifas from "./pages/Tarifas.jsx";
import Auditoria from "./pages/Auditoria.jsx";

export default function App() {
  return (
    <Routes>
      {/* SPLASH */}
      <Route path="/" element={<Splash />} />

      {/* LOGIN */}
      <Route path="/login" element={<Login />} />

      {/* APP PROTEGIDA */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cocheras" element={<Cocheras />} />
        <Route path="/ocupaciones" element={<Ocupaciones />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/tarifas" element={<Tarifas />} />
        <Route path="/auditoria" element={<Auditoria />} />

        {/* fallback interno */}
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* cualquier cosa rara vuelve al splash */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
