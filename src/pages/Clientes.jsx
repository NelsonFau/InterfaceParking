import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../api/http";
import { showApiError } from "../api/errors";
import { usePermissions } from "../auth/usePermissions";
import toast from "react-hot-toast";
import ConfirmDialog from "../componentes/ConfirmDialog";
import { useDialogFullScreen } from "../componentes/useDialogFullScreen";
import AvatarTono from "../componentes/ui/AvatarTono";
import BotonRefrescar from "../componentes/ui/BotonRefrescar";
import Campo from "../componentes/ui/Campo";
import EncabezadoPagina from "../componentes/ui/EncabezadoPagina";
import Tarjeta from "../componentes/ui/Tarjeta";
import { TONE_KEYS } from "../theme/theme";
import { iniciales } from "../utils/iniciales";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Typography,
  Skeleton,
} from "@mui/material";

function ActivoChip({ activo }) {
  return <Chip size="small" label={activo ? "Activo" : "Inactivo"} color={activo ? "success" : "default"} />;
}

const GRID_2 = { xs: "1fr", md: "repeat(2, 1fr)" };

function LoadingList() {
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_2 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={150} />
      ))}
    </Box>
  );
}

function ClienteCard({ c, onEdit, onToggle, canManage }) {
  // Un tono por cliente, derivado del id: el mismo cliente siempre sale con el mismo color.
  const tono = TONE_KEYS[Math.abs(Number(c.id) || 0) % TONE_KEYS.length];
  return (
    <Tarjeta>
      <Stack spacing={1.75}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <AvatarTono tone={tono} size={48}>
              {iniciales(c.nombreCompleto)}
            </AvatarTono>
            <Typography variant="h6" component="h2" noWrap title={c.nombreCompleto}>
              {c.nombreCompleto}
            </Typography>
          </Stack>
          <ActivoChip activo={c.activo} />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Doc: {c.documento} · Tel: {c.telefono}
          {c.email ? ` · Email: ${c.email}` : ""}
        </Typography>

        {/* Acciones (solo con clientes.gestionar, D-FA10) */}
        {canManage ? (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
            <Button variant="pill" color="inherit" onClick={onEdit}>
              Editar
            </Button>
            <Button variant="pill" color={c.activo ? "error" : "success"} onClick={onToggle}>
              {c.activo ? "Desactivar" : "Reactivar"}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Tarjeta>
  );
}

export default function Clientes() {
  const { can } = usePermissions();
  const canManage = can("clientes.gestionar");
  const fullScreen = useDialogFullScreen();
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

  // confirmación de desactivar / reactivar (D-FM13): { tipo: "desactivar" | "reactivar", c }
  const [confirmar, setConfirmar] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

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
      showApiError(e);
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
      showApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function desactivar(c) {
    try {
      await http.patch(`/Cliente/${c.id}/desactivar`);
      toast.success("Cliente desactivado");

      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else await cargar(page);
    } catch (e) {
      showApiError(e);
    }
  }

  async function reactivar(c) {
    try {
      await http.patch(`/Cliente/${c.id}/reactivar`);
      toast.success("Cliente reactivado");
      await cargar(page);
    } catch (e) {
      showApiError(e);
    }
  }

  async function confirmarAccion() {
    if (!confirmar) return;
    setConfirmando(true);
    try {
      if (confirmar.tipo === "desactivar") await desactivar(confirmar.c);
      else await reactivar(confirmar.c);
    } finally {
      setConfirmando(false);
      setConfirmar(null);
    }
  }

  const hayAnterior = page > 1;
  const haySiguiente = page < totalPages;
  const enlace = (activo, texto, onClick) => (
    <Link
      component="button"
      type="button"
      underline={activo ? "hover" : "none"}
      disabled={!activo}
      onClick={() => activo && onClick()}
      sx={{ color: activo ? "text.primary" : "text.disabled", cursor: activo ? "pointer" : "default", font: "inherit", verticalAlign: "baseline" }}
    >
      {texto}
    </Link>
  );

  return (
    <Box>
      <EncabezadoPagina titulo="Clientes (Activos)" subtitulo="Gestión de clientes activos. Buscá por nombre, documento o teléfono." />

      {/* Acciones */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "flex-end" }} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {canManage ? (
            <Button variant="arena" onClick={abrirCrear}>
              Nuevo cliente
            </Button>
          ) : null}
          <BotonRefrescar onClick={() => cargar(page)} disabled={loading} />
        </Stack>
        <Campo label="Buscar (nombre/doc/tel)" value={q} onChange={(e) => setQ(e.target.value)} />
      </Stack>

      {/* Paginación */}
      {!loading && (
        <Tarjeta sx={{ mb: 2 }}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {items.length} de {total} · Página {page} / {totalPages}{" "}
              {enlace(hayAnterior, "‹ Anterior", () => setPage((p) => Math.max(1, p - 1)))}
              {" · "}
              {enlace(haySiguiente, "Siguiente ›", () => setPage((p) => Math.min(totalPages, p + 1)))}
            </Typography>

            <Campo label="Page size" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) || 10)} />
          </Box>
        </Tarjeta>
      )}

      {/* Lista */}
      {loading ? (
        <LoadingList />
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: GRID_2 }}>
          {items.map((c) => (
            <ClienteCard
              key={c.id}
              c={c}
              onEdit={() => abrirEditar(c)}
              onToggle={() => setConfirmar({ tipo: c.activo ? "desactivar" : "reactivar", c })}
              canManage={canManage}
            />
          ))}

          {!items.length && (
            <Typography color="text.secondary">
              No hay clientes activos para mostrar.
            </Typography>
          )}
        </Box>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={fullScreen} fullWidth maxWidth="sm">
        <DialogTitle>
          {edit ? "Editar cliente" : "Nuevo cliente"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Campo label="Nombre completo" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Campo label="Documento" value={documento} onChange={(e) => setDocumento(e.target.value)} />
              <Campo label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </Stack>

            <Campo label="Email (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />

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
          <Button variant="contorno" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="marron" onClick={guardar} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmar)}
        message={
          confirmar
            ? `${confirmar.tipo === "desactivar" ? "¿Desactivar" : "¿Reactivar"} a "${confirmar.c?.nombreCompleto}"?`
            : ""
        }
        confirmLabel="Confirmar"
        confirmColor={confirmar?.tipo === "desactivar" ? "error" : "success"}
        loading={confirmando}
        onConfirm={confirmarAccion}
        onClose={() => setConfirmar(null)}
      />
    </Box>
  );
}
