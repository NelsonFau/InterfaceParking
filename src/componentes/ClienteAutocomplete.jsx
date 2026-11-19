// Selector de cliente por nombre o documento (spec 07, D-FG11, D-FG16). Un solo componente para el filtro
// del listado y para el alta de ocupación. Busca en el servidor con 300 ms de espera y descarta las
// respuestas que llegan después de un pedido más nuevo. Solo clientes activos.
import { useEffect, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { listClientes } from "../api/clienteApi";
import { showApiError } from "../api/errors";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

function clienteLabel(c) {
  return c ? `${c.nombreCompleto ?? c.nombre ?? ""} · CI: ${c.documento ?? ""}` : "";
}

/**
 * @param {{ value: object | null, onChange: (cliente: object | null) => void, label: string,
 *   placeholder?: string, error?: boolean, helperText?: import("react").ReactNode,
 *   size?: "small" | "medium", disabled?: boolean, autoFocus?: boolean }} props
 */
export default function ClienteAutocomplete({
  value,
  onChange,
  label,
  placeholder = "Nombre o CI...",
  error = false,
  helperText,
  size,
  disabled = false,
  autoFocus = false,
}) {
  const [inputValue, setInputValue] = useState(() => clienteLabel(value));
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Con el cliente ya elegido, el texto del campo es su etiqueta: no se vuelve a buscar.
  const selectedLabel = clienteLabel(value);
  const term = inputValue.trim();
  const shouldSearch = term !== "" && !(value && inputValue === selectedLabel);

  useEffect(() => {
    if (!shouldSearch) return undefined;
    let ignore = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const page = await listClientes({ q: term, activos: true, page: 1, pageSize: PAGE_SIZE });
        if (!ignore) setOptions(page.items);
      } catch (e) {
        if (!ignore) showApiError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [term, shouldSearch]);

  return (
    <Autocomplete
      options={shouldSearch ? options : value ? [value] : []}
      value={value}
      inputValue={inputValue}
      onInputChange={(_e, v) => setInputValue(v)}
      onChange={(_e, v) => onChange(v)}
      loading={loading && shouldSearch}
      disabled={disabled}
      // El servidor ya filtró: no se vuelve a filtrar en el cliente.
      filterOptions={(x) => x}
      getOptionLabel={clienteLabel}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      noOptionsText={term === "" ? "Escribí para buscar" : "Sin resultados"}
      loadingText="Buscando..."
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          error={error}
          helperText={helperText}
          autoFocus={autoFocus}
          fullWidth
        />
      )}
    />
  );
}
