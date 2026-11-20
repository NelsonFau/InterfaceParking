import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/red-hat-display/400.css";
import "@fontsource/red-hat-display/500.css";
import "@fontsource/red-hat-display/600.css";
// 700 (títulos, dinero, KPI) y 800 (logo): detalles de Claude Design 1.
import "@fontsource/red-hat-display/700.css";
import "@fontsource/red-hat-display/800.css";
import App from "./App.jsx";
import ThemeRoot from "./theme/ThemeRoot.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import MeProvider from "./auth/MeProvider.jsx";
import { cleanLegacySession } from "./auth/legacyCleanup.js";

// Borra el token y los datos del login viejo que pudieran quedar en el navegador (D-FA12).
cleanLegacySession();

// ThemeRoot (tema, modo y Toaster) envuelve todo de BrowserRouter hacia adentro (spec 13, D-FM5).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeRoot>
        <AuthProvider>
          <MeProvider>
            <App />
          </MeProvider>
        </AuthProvider>
      </ThemeRoot>
    </BrowserRouter>
  </React.StrictMode>
);
