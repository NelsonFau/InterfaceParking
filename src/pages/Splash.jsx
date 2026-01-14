import { Box } from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";

export default function Splash() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      const token = localStorage.getItem("token");
      nav(token ? "/dashboard" : "/login", { replace: true });
    }, 1800);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "#0b0f17",
        px: 2,
      }}
    >
      <Box
        component="img"
        src={logo}
        alt="Charlie's Parking"
        sx={{
          width: "min(320px, 80vw)",
          filter: "drop-shadow(0 18px 40px rgba(0,0,0,.45))",
          borderRadius: 2,
        }}
      />
    </Box>
  );
}
