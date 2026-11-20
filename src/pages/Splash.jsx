import { useAuth0 } from "@auth0/auth0-react";
import { Box, Card } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";

// Muestra el logo y, cuando el SDK de Auth0 terminó de inicializar, va a /dashboard o a /login (D-FA9).
// El fondo sale del tema (`palette.pc.splashBg`) y el logo va en un `Card` del tema (spec 13, D-FM11).
export default function Splash() {
  const nav = useNavigate();
  const { isLoading, isAuthenticated } = useAuth0();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!shown || isLoading) return;
    nav(isAuthenticated ? "/dashboard" : "/login", { replace: true });
  }, [shown, isLoading, isAuthenticated, nav]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "pc.splashBg",
        px: 2,
      }}
    >
      <Card
        component="img"
        src={logo}
        alt="Charlie's Parking"
        sx={{ width: "min(320px, 80vw)" }}
      />
    </Box>
  );
}
