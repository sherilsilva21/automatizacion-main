// Tema Claro · Oscuro · Sistema. Por defecto sigue al sistema; si la persona elige uno, se guarda en localStorage
// y se pone `data-theme` en <html> (globals.css lo respeta por encima de prefers-color-scheme).

export type Tema = "light" | "dark" | "sistema";
export const CLAVE_TEMA = "tema";

/**
 * Script en línea del <head>: corre antes de pintar. try/catch porque localStorage puede lanzar (ventana privada,
 * almacenamiento bloqueado); en ese caso simplemente se sigue al sistema.
 */
export const SCRIPT_TEMA =
  `try{var t=localStorage.getItem("${CLAVE_TEMA}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function leerTema(): Tema {
  try {
    const t = localStorage.getItem(CLAVE_TEMA);
    return t === "light" || t === "dark" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

export function aplicarTema(t: Tema): void {
  const raiz = document.documentElement;
  if (t === "sistema") delete raiz.dataset.theme;
  else raiz.dataset.theme = t;
  try {
    if (t === "sistema") localStorage.removeItem(CLAVE_TEMA);
    else localStorage.setItem(CLAVE_TEMA, t);
  } catch {
    // sin almacenamiento: el tema dura hasta recargar, que es lo mejor posible
  }
}
