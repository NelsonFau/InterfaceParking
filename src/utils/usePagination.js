// Hook delgado sobre `paginationReducer` (D-FB13). No pide datos: la pantalla llama a su módulo de API.
import { useCallback, useMemo, useReducer } from "react";
import { DEFAULT_PAGE_SIZE, paginationReducer } from "./paginacion.js";

/**
 * @param {{ pageSize?: number }} [options]
 * @returns {{ page: number, pageSize: number, setPage: (page: number) => void,
 *   setPageSize: (pageSize: number) => void, reset: () => void, fit: (total: number) => void }}
 */
export function usePagination({ pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [state, dispatch] = useReducer(paginationReducer, { page: 1, pageSize });
  const setPage = useCallback((page) => dispatch({ type: "setPage", page }), []);
  const setPageSize = useCallback((size) => dispatch({ type: "setPageSize", pageSize: size }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const fit = useCallback((total) => dispatch({ type: "fit", total }), []);
  return useMemo(
    () => ({ page: state.page, pageSize: state.pageSize, setPage, setPageSize, reset, fit }),
    [state.page, state.pageSize, setPage, setPageSize, reset, fit],
  );
}
