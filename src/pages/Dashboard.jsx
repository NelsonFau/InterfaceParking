import { useEffect, useState } from "react";
import { http } from "../api/http";
import { Grid, Paper, Typography } from "@mui/material";
import toast from "react-hot-toast";

function Card({ title, value }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get("/Panel/resumen");
        setData(res.data);
      } catch (e) {
        toast.error("No pude cargar el resumen");
        console.error(e);
      }
    })();
  }, []);

  if (!data) return <div>Cargando...</div>;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={3}><Card title="Total cocheras" value={data.totalCocheras} /></Grid>
      <Grid item xs={12} md={3}><Card title="Disponibles" value={data.disponiblesAhora} /></Grid>
      <Grid item xs={12} md={3}><Card title="Ocupadas" value={data.ocupadasAhora} /></Grid>
      <Grid item xs={12} md={3}><Card title="Bloqueadas" value={data.bloqueadas} /></Grid>

      <Grid item xs={12} md={3}><Card title="Vencen hoy" value={data.vencenHoy} /></Grid>
      <Grid item xs={12} md={3}><Card title="Vencen en 7 días" value={data.vencenEn7Dias} /></Grid>
    </Grid>
  );
}
