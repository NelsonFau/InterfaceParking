import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";
import AuthProvider from "./auth/AuthProvider.jsx";
import MeProvider from "./auth/MeProvider.jsx";
import { cleanLegacySession } from "./auth/legacyCleanup.js";

// Borra el token y los datos del login viejo que pudieran quedar en el navegador (D-FA12).
cleanLegacySession();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MeProvider>
          <App />
          <Toaster />
        </MeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
