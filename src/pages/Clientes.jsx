import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../api/http";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  Skeleton,
} from "@mui/material";

function ActivoChip({ activo }) {
  return (
    <Chip
      size="small"
      label={activo ? "Activo" : "Inactivo"}
      color={activo ? "success" : "default"}
      variant={activo ? "filled" : "outlined"}
      sx={{ fontWeight: 700 }}
    />
  );
}

function LoadingList() {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={92} />
      ))}
    </Stack>
  );
}

function ClienteCard({ c, onEdit, onToggle }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: "divider",
        boxShadow: "0 6px 18px rgba(0,0,0,.06)",
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          {/* Info */}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 900, letterSpacing: -0.2 }}
                noWrap
                title={c.nombreCompleto}
              >
                {c.nombreCompleto}
              </Typography>

              <ActivoChip activo={c.activo} />
            </Stack>

            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Doc: <b>{c.documento}</b> · Tel: <b>{c.telefono}</b>
              {c.email ? (
                <>
                  {" "}
                  · Email: <b>{c.email}</b>
                </>
              ) : null}
            </Typography>
          </Box>

          {/* Actions */}
          <Stack
            direction="row"
            spacing={1}
            justifyContent={{ xs: "flex-start", sm: "flex-end" }}
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              variant="outlined"
              onClick={onEdit}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              Editar
            </Button>

            <Button
              variant="contained"
              color={c.activo ? "error" : "success"}
              onClick={onToggle}
              sx={{ borderRadius: 2, fontWeight: 800 }}
            >
              {c.activo ? "Desactivar" : "Reactivar"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtro
  const [q, setQ] = useState("");

  // paginación real
  const [page, setPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  // dialog create/edit
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null); // null => crear
  const [saving, setSaving] = useState(false);

  // form
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // evita “lag” por respuestas viejas (race conditions)
  const reqIdRef = useRef(0);

  function resetForm() {
    setNombreCompleto("");
    setDocumento("");
    setTelefono("");
    setEmail("");
  }

  function abrirCrear() {
    setEdit(null);
    resetForm();
    setOpen(true);
  }

  function abrirEditar(c) {
    setEdit(c);
    setNombreCompleto(c?.nombreCompleto ?? "");
    setDocumento(c?.documento ?? "");
    setTelefono(c?.telefono ?? "");
    setEmail(c?.email ?? "");
    setOpen(true);
  }

  async function cargar(p = page) {
    const myReqId = ++reqIdRef.current;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      const term = q.trim();
      if (term) params.set("q", term);

      params.set("page", String(p));
      params.set("pageSize", String(pageSize));

      // ESTA VISTA ES SOLO ACTIVOS
      params.set("activos", "true");

      const res = await http.get(`/Cliente?${params.toString()}`);
      if (myReqId !== reqIdRef.current) return;

      const data = res.data ?? {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);

      if (typeof data.page === "number" && data.page > 0) setPage(data.page);
      if (typeof data.pageSize === "number" && data.pageSize > 0) setPageSize(data.pageSize);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude cargar clientes";
      toast.error(msg);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  useEffect(() => {
    cargar(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, pageSize]);

  async function guardar() {
    const payloadBase = {
      nombreCompleto: nombreCompleto.trim(),
      documento: documento.trim(),
      telefono: telefono.trim(),
      email: email.trim() ? email.trim() : null,
    };

    if (!payloadBase.nombreCompleto) return toast.error("Falta Nombre completo");
    if (!payloadBase.documento) return toast.error("Falta Documento");
    if (!payloadBase.telefono) return toast.error("Falta Teléfono");

    try {
      setSaving(true);

      if (!edit) {
        await http.post("/Cliente", payloadBase);
        toast.success("Cliente creado");
      } else {
        await http.put(`/Cliente/${edit.id}`, {
          ...payloadBase,
          activo: edit.activo ?? true,
        });
        toast.success("Cliente actualizado");
      }

      setOpen(false);
      await cargar(page);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude guardar el cliente";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function desactivar(c) {
    const ok = window.confirm(`¿Desactivar a "${c?.nombreCompleto}"?`);
    if (!ok) return;

    try {
      await http.patch(`/Cliente/${c.id}/desactivar`);
      toast.success("Cliente desactivado");

      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else await cargar(page);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude desactivar el cliente";
      toast.error(msg);
    }
  }

  async function reactivar(c) {
    const ok = window.confirm(`¿Reactivar a "${c?.nombreCompleto}"?`);
    if (!ok) return;

    try {
      await http.patch(`/Cliente/${c.id}/reactivar`);
      toast.success("Cliente reactivado");
      await cargar(page);
    } catch (e) {
      console.error(e);
      const msg =
        (typeof e?.response?.data === "string" && e.response.data) ||
        e?.response?.data?.error ||
        "No pude reactivar el cliente";
      toast.error(msg);
    }
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, py: 2 }}>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
          Clientes (Activos)
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Gestión de clientes activos. Buscá por nombre, documento o teléfono.
        </Typography>
      </Stack>

      {/* Actions */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Button
          variant="contained"
          onClick={abrirCrear}
          sx={{ borderRadius: 2, fontWeight: 900 }}
        >
          Nuevo cliente
        </Button>

        <Button
          variant="outlined"
          onClick={() => cargar(page)}
          disabled={loading}
          sx={{ borderRadius: 2, fontWeight: 800 }}
        >
          Refrescar
        </Button>

        <TextField
          size="small"
          label="Buscar (nombre/doc/tel)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: { xs: "100%", sm: 320 } }}
        />
      </Stack>

      {/* Pagination toolbar */}
      {!loading && (
        <Card
          variant="outlined"
          sx={{
            mb: 2,
            borderRadius: 3,
            borderColor: "divider",
            boxShadow: "0 6px 18px rgba(0,0,0,.06)",
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                Mostrando <b>{items.length}</b> de <b>{total}</b> · Página{" "}
                <b>{page}</b> / <b>{totalPages}</b>
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Anterior
                </Button>

                <Button
                  variant="outlined"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Siguiente
                </Button>

                <TextField
                  size="small"
                  label="Page size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                  sx={{ width: 130 }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <LoadingList />
      ) : (
        <Stack spacing={1.25}>
          {items.map((c) => (
            <ClienteCard
              key={c.id}
              c={c}
              onEdit={() => abrirEditar(c)}
              onToggle={() => (c.activo ? desactivar(c) : reactivar(c))}
            />
          ))}

          {!items.length && (
            <Typography color="text.secondary">
              No hay clientes activos para mostrar.
            </Typography>
          )}
        </Stack>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {edit ? "Editar cliente" : "Nuevo cliente"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nombre completo"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              fullWidth
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                fullWidth
              />

              <TextField
                label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                fullWidth
              />
            </Stack>

            <TextField
              label="Email (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />

            {edit && (
              <>
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Estado:
                  </Typography>
                  <ActivoChip activo={edit.activo} />
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={guardar} disabled={saving} sx={{ fontWeight: 900 }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
