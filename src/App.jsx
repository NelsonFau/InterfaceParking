import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./componentes/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Cocheras from "./pages/Cocheras.jsx";
import Clientes from "./pages/Clientes.jsx";
import Ocupaciones from "./pages/Ocupaciones.jsx";
import Tarifas from "./pages/Tarifas.jsx";
import Auditoria from "./pages/Auditoria.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cocheras" element={<Cocheras />} />
        <Route path="/ocupaciones" element={<Ocupaciones />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/tarifas" element={<Tarifas />} />
        <Route path="/auditoria" element={<Auditoria />} />
      </Route>
    </Routes>
  );
}
