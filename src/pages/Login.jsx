import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import toast from "react-hot-toast";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("dueno");
  const [password, setPassword] = useState("dueno123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setErr("Completá usuario y contraseña.");
      return;
    }

    try {
      setLoading(true);

      // OJO: tu baseURL debe terminar en /api (como ya venías usando)
      // entonces acá pega a /Auth/login
      const res = await http.post("/Auth/login", { username: u, password: p });

      const token = res?.data?.token;
      if (!token) throw new Error("No llegó token");

      localStorage.setItem("token", token);
      localStorage.setItem("userId", String(res?.data?.usuarioId ?? ""));
      localStorage.setItem("userName", String(res?.data?.nombre ?? ""));
      localStorage.setItem("userRole", String(res?.data?.rol ?? ""));

      toast.success("Bienvenido");
      nav("/dashboard");
    } catch (e2) {
    const status = e2?.response?.status;

    const msg =
      e2?.response?.data?.message ||
      e2?.response?.data?.error ||
      (typeof e2?.response?.data === "string" && e2.response.data) ||
      (status === 429
        ? "Demasiados intentos de login. Intente nuevamente en unos minutos."
        : "No pude iniciar sesión");

      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "#f6f8fb",
        px: 2,
        py: 3,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 18px 40px rgba(16,24,40,.08)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Iniciar sesión
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accedé al panel de tu garage
              </Typography>
            </Box>

            <Divider />

            {err ? <Alert severity="error">{err}</Alert> : null}

            <Box component="form" onSubmit={submit}>
              <Stack spacing={2}>
                <TextField
                  label="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  fullWidth
                />

                <TextField
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ borderRadius: 2, py: 1.2, fontWeight: 800 }}
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </Stack>
            </Box>

           
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
