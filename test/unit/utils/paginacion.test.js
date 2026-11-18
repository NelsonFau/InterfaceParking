import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../src/api/errors.js";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  lastPage,
  normalizePaged,
  paginationReducer,
  toTablePaginationProps,
} from "../../../src/utils/paginacion.js";

describe("constantes", () => {
  it("20 por defecto y opciones hasta 100", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100]);
  });
});

describe("normalizePaged", () => {
  it("acepta { items, total, page, pageSize } y lo devuelve", () => {
    const data = { items: [{ id: 1 }], total: 1, page: 1, pageSize: 20 };
    expect(normalizePaged(data)).toBe(data);
  });

  it("acepta una página vacía", () => {
    expect(normalizePaged({ items: [], total: 0, page: 1, pageSize: 20 }).items).toEqual([]);
  });

  it.each([
    ["un arreglo", []],
    ["null", null],
    ["undefined", undefined],
    ["un texto", "x"],
    ["un objeto sin items", { total: 0, page: 1, pageSize: 20 }],
    ["items que no es arreglo", { items: {}, total: 0, page: 1, pageSize: 20 }],
    ["un objeto sin total", { items: [], page: 1, pageSize: 20 }],
  ])("rechaza %s con respuesta_invalida", (_n, data) => {
    let error;
    try {
      normalizePaged(data);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("respuesta_invalida");
  });
});

describe("lastPage", () => {
  it("mínimo 1", () => {
    expect(lastPage(0, 20)).toBe(1);
    expect(lastPage(5, 20)).toBe(1);
  });

  it("redondea hacia arriba", () => {
    expect(lastPage(20, 20)).toBe(1);
    expect(lastPage(21, 20)).toBe(2);
    expect(lastPage(41, 20)).toBe(3);
  });

  it("entradas inválidas dan 1", () => {
    expect(lastPage(undefined, 20)).toBe(1);
    expect(lastPage(10, 0)).toBe(1);
  });
});

describe("paginationReducer", () => {
  const base = { page: 3, pageSize: 20 };

  it("setPage cambia la página", () => {
    expect(paginationReducer(base, { type: "setPage", page: 5 })).toEqual({ page: 5, pageSize: 20 });
  });

  it("setPage no baja de 1", () => {
    expect(paginationReducer(base, { type: "setPage", page: 0 }).page).toBe(1);
    expect(paginationReducer(base, { type: "setPage", page: -2 }).page).toBe(1);
  });

  it("setPageSize cambia el tamaño y vuelve a la página 1", () => {
    expect(paginationReducer(base, { type: "setPageSize", pageSize: 50 })).toEqual({ page: 1, pageSize: 50 });
  });

  it("reset vuelve a la página 1 y conserva el tamaño", () => {
    expect(paginationReducer(base, { type: "reset" })).toEqual({ page: 1, pageSize: 20 });
  });

  it("fit con total 20, pageSize 20 y page 2 baja a la 1", () => {
    expect(paginationReducer({ page: 2, pageSize: 20 }, { type: "fit", total: 20 })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("fit no toca una página válida", () => {
    const s = { page: 2, pageSize: 20 };
    expect(paginationReducer(s, { type: "fit", total: 41 })).toBe(s);
  });

  it("fit con total 0 queda en la 1", () => {
    expect(paginationReducer({ page: 4, pageSize: 20 }, { type: "fit", total: 0 }).page).toBe(1);
  });

  it("una acción desconocida no cambia el estado", () => {
    expect(paginationReducer(base, { type: "nada" })).toBe(base);
  });
});

describe("toTablePaginationProps", () => {
  it("convierte page 1 en page 0", () => {
    const p = toTablePaginationProps({ page: 1, pageSize: 20, total: 134 });
    expect(p.page).toBe(0);
    expect(p.count).toBe(134);
    expect(p.rowsPerPage).toBe(20);
  });

  it("convierte page 3 en page 2", () => {
    expect(toTablePaginationProps({ page: 3, pageSize: 20, total: 134 }).page).toBe(2);
  });

  it("recorta una página fuera de rango", () => {
    expect(toTablePaginationProps({ page: 99, pageSize: 20, total: 41 }).page).toBe(2);
    expect(toTablePaginationProps({ page: 5, pageSize: 20, total: 0 }).page).toBe(0);
    expect(toTablePaginationProps({ page: 0, pageSize: 20, total: 41 }).page).toBe(0);
  });

  it("trae las etiquetas en español", () => {
    const p = toTablePaginationProps({ page: 1, pageSize: 20, total: 134 });
    expect(p.labelRowsPerPage).toBe("Filas por página");
    expect(p.labelDisplayedRows({ from: 1, to: 20, count: 134 })).toBe("1–20 de 134");
  });

  it("onPageChange devuelve la página de 1 en 1", () => {
    const onPageChange = vi.fn();
    const p = toTablePaginationProps({ page: 1, pageSize: 20, total: 134 }, { onPageChange });
    p.onPageChange(null, 2);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("onRowsPerPageChange devuelve el tamaño como número", () => {
    const onPageSizeChange = vi.fn();
    const p = toTablePaginationProps({ page: 1, pageSize: 20, total: 134 }, { onPageSizeChange });
    p.onRowsPerPageChange({ target: { value: "50" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("usa las opciones por defecto y respeta las que se pasan", () => {
    expect(toTablePaginationProps({ page: 1, pageSize: 20, total: 1 }).rowsPerPageOptions).toEqual([10, 20, 50, 100]);
    expect(
      toTablePaginationProps({ page: 1, pageSize: 5, total: 1 }, { pageSizeOptions: [5, 10] }).rowsPerPageOptions,
    ).toEqual([5, 10]);
  });

  it("suma el tamaño actual si no está entre las opciones", () => {
    expect(toTablePaginationProps({ page: 1, pageSize: 30, total: 1 }).rowsPerPageOptions).toEqual([
      10, 20, 30, 50, 100,
    ]);
  });
});
