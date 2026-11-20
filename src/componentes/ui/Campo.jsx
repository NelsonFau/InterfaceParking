// Campo de formulario y filtro (guía visual 1.4): la etiqueta va ARRIBA del campo, no flotante dentro del borde.
// Es un `TextField` compacto de ancho completo. El tema (`MuiInputLabel`, `MuiOutlinedInput`) fija la posición de la
// etiqueta, el borde y el radio. El texto de ayuda va debajo, en gris (`ayuda`, o `helperText` si hay un error).
import { TextField } from "@mui/material";

/**
 * Acepta las props de `TextField` (`select`, `type`, `value`, `onChange`, `children`...) más `ayuda`.
 * Un `select` muestra su opción de valor vacío ("Todas", "Todos") sin etiqueta flotante.
 */
export default function Campo({ ayuda, helperText, slotProps, select, ...props }) {
  const slots = select ? { ...slotProps, select: { displayEmpty: true, ...slotProps?.select } } : slotProps;
  return <TextField fullWidth select={select} helperText={helperText ?? ayuda} slotProps={slots} {...props} />;
}
