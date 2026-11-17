// Mapa ÚNICO de estados de una factura (docs/guia/diseno.md): color + icono + texto. Insignias, sellos, tablas y
// métricas leen de aquí, así «en revisión» se ve igual en toda la app. Nunca solo color: siempre icono y texto.
//
// Las clases van escritas completas (no `text-${x}`) porque Tailwind solo genera las que encuentra literalmente.

export type EstadoVisual = "aceptada" | "revision" | "manual" | "duplicada" | "error";
export type NombreIcono = "verificacion" | "reloj" | "pluma" | "hojas" | "triangulo";

export interface DefinicionEstado {
  texto: string;
  /** Versión corta para tablas y espacios estrechos. */
  corto: string;
  icono: NombreIcono;
  /** Color del texto y del icono. */
  claseTexto: string;
  /** Fondo suave + borde para insignias y avisos. */
  claseInsignia: string;
  /** Clase del sello (globals.css). */
  claseSello: string;
}

export const ESTADOS: Record<EstadoVisual, DefinicionEstado> = {
  aceptada: {
    texto: "Leída correctamente", corto: "Leída", icono: "verificacion", claseTexto: "text-aceptada",
    claseInsignia: "bg-aceptada-suave border-aceptada/40 text-tinta", claseSello: "sello-aceptada",
  },
  // Revisión NO es un error: es trabajo pendiente para una persona (ámbar, no rojo).
  revision: {
    texto: "Pendiente de revisión", corto: "En revisión", icono: "reloj", claseTexto: "text-revision",
    claseInsignia: "bg-revision-suave border-revision/40 text-tinta", claseSello: "sello-revision",
  },
  // La «tinta» de una persona: comparte el color del acento.
  manual: {
    texto: "Revisada a mano", corto: "A mano", icono: "pluma", claseTexto: "text-manual",
    claseInsignia: "bg-manual-suave border-manual/40 text-tinta", claseSello: "sello-manual",
  },
  duplicada: {
    texto: "Ya estaba en la base", corto: "Duplicada", icono: "hojas", claseTexto: "text-duplicada",
    claseInsignia: "bg-duplicada-suave border-linea text-tinta", claseSello: "sello-duplicada",
  },
  error: {
    texto: "No se pudo leer", corto: "Error", icono: "triangulo", claseTexto: "text-error",
    claseInsignia: "bg-error-suave border-error/40 text-tinta", claseSello: "sello-error",
  },
};

/** Estado visual de una factura guardada: si una persona la corrigió, manda «a mano». */
export function estadoDeFactura(f: { estado: "aceptada" | "revision"; corregidaManualmente?: boolean }): EstadoVisual {
  if (f.corregidaManualmente) return "manual";
  return f.estado;
}
