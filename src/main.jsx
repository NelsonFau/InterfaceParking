import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";
import AuthProvider from "./auth/AuthProvider.jsx";
import MeProvider from "./auth/MeProvider.jsx";

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
