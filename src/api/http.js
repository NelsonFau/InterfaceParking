import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

console.log("VITE_API_BASE_URL =", baseURL);

export const http = axios.create({ baseURL });
