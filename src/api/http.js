import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL; // ej: https://xxxx.ngrok-free.dev/api

export const http = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// ✅ agrega el token a TODAS las requests
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

(opcional) 
http.interceptors.response.use(
  (r) => r,
  (e) => {
    console.log("HTTP ERROR:", e?.response?.status, e?.response?.data);
    return Promise.reject(e);
  }
);
