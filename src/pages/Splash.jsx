import { useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpeg";

export default function Splash() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => nav("/login"), 1200);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "#0b0f14",
        px: 2,
      }}
    >
      <Box sx={{ textAlign: "center", width: "100%", maxWidth: 420 }}>
        <Box
          component="img"
          src={logo}
          alt="Charlie's Parking"
          sx={{
            width: "100%",
            maxWidth: 280,
            borderRadius: 3,
            boxShadow: "0 16px 50px rgba(0,0,0,.45)",
          }}
        />

        <Typography
          sx={{ mt: 2, color: "rgba(255,255,255,.8)", fontSize: 14, letterSpacing: 0.4 }}
        >
          Iniciando…
        </Typography>

        <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={26} />
        </Box>
      </Box>
    </Box>
  );
}
