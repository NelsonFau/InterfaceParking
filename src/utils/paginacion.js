// Paginación de PagedResponse y de MUI TablePagination (D-FB13). Módulo puro, sin React.
// El backend pagina con `page` de 1 en 1; MUI, de 0 en 0. La conversión vive solo acá.
import { ApiError } from "../api/errors.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

/** 20 es el valor por defecto del backend. */
export const DEFAULT_PAGE_SIZE = 20;
/** 100 es el tope de Cliente, alertas y Trazabilidad (Caja/sesiones admite 200, pero 100 sirve para todos). */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const isCount = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * Valida que la respuesta sea `{ items: [], total, page, pageSize }` y la devuelve tal cual.
 * Si no lo es (un arreglo, `null`, un objeto sin `items`), lanza un `ApiError` `respuesta_invalida`.
 * @template T
 * @param {{ items: T[], total: number, page: number, pageSize: number }} data
 * @returns {{ items: T[], total: number, page: number, pageSize: number }}
 */
export function normalizePaged(data) {
  const valido =
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray(data.items) &&
    isCount(data.total) &&
    isCount(data.page) &&
    isCount(data.pageSize);
  if (!valido) {
    throw new ApiError({ code: "respuesta_invalida", message: ERROR_CODES.respuesta_invalida.message });
  }
  return data;
}

/** Última página (mínimo 1). */
export function lastPage(total, pageSize) {
  if (!isCount(total) || !isCount(pageSize) || total <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

const toPage = (n) => (isCount(n) ? Math.max(1, Math.floor(n)) : 1);

/**
 * Reductor de `{ page, pageSize }`. Acciones:
 * - `{ type: "setPage", page }`
 * - `{ type: "setPageSize", pageSize }` (vuelve a la página 1)
 * - `{ type: "reset" }` (página 1; cuando cambian los filtros)
 * - `{ type: "fit", total }` (si `page` quedó más allá de la última, baja a la última:
 *   pasa al borrar el último elemento de la última página)
 */
export function paginationReducer(state, action) {
  switch (action.type) {
    case "setPage":
      return { ...state, page: toPage(action.page) };
    case "setPageSize":
      return { page: 1, pageSize: action.pageSize };
    case "reset":
      return state.page === 1 ? state : { ...state, page: 1 };
    case "fit": {
      const ultima = lastPage(action.total, state.pageSize);
      return state.page > ultima ? { ...state, page: ultima } : state;
    }
    default:
      return state;
  }
}

/**
 * Props de MUI `TablePagination` (`page` de 0 en 0) desde la paginación del backend (`page` de 1 en 1).
 * Recorta la página al rango válido y trae las etiquetas en español.
 */
export function toTablePaginationProps(
  { page, pageSize, total },
  { onPageChange, onPageSizeChange, pageSizeOptions = PAGE_SIZE_OPTIONS } = {},
) {
  const maxIndex = lastPage(total, pageSize) - 1;
  const index = Math.min(Math.max(toPage(page) - 1, 0), maxIndex);
  // MUI avisa por consola si rowsPerPage no está entre las opciones.
  const opciones = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);
  return {
    count: isCount(total) ? total : 0,
    page: index,
    rowsPerPage: pageSize,
    rowsPerPageOptions: opciones,
    onPageChange: (_event, newIndex) => onPageChange?.(newIndex + 1),
    onRowsPerPageChange: (event) => onPageSizeChange?.(Number(event.target.value)),
    labelRowsPerPage: "Filas por página",
    labelDisplayedRows: ({ from, to, count }) => `${from}–${to} de ${count}`,
  };
}
