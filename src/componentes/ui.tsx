// Componentes base del sistema «Libro de cuentas» (docs/guia/diseno.md). Ninguna página define colores propios:
// todo pasa por los tokens de globals.css y por el mapa de estados (estado.ts).

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ESTADOS, type EstadoVisual, type NombreIcono } from "./estado";

// ── Iconos (trazo de 2 px, heredan el color del texto; siempre acompañan a un texto, por eso aria-hidden) ──

const TRAZO = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Svg({ className = "", children }: { className?: string; children: ReactNode }) {
  return <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 ${className}`} {...TRAZO}>{children}</svg>;
}

export const IconoOk = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><circle cx="10" cy="10" r="8" /><path d="M6.4 10.3l2.4 2.4 4.8-5.2" /></Svg>
);
/** Fallo de una validación concreta (en listas de problemas). */
export const IconoMal = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><circle cx="10" cy="10" r="8" /><path d="M7.2 7.2l5.6 5.6M12.8 7.2l-5.6 5.6" /></Svg>
);
export const IconoReloj = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><path d="M5.5 2.5h9M5.5 17.5h9M6.5 2.5c0 4 7 4 7 7.5s-7 3.5-7 7.5M13.5 2.5c0 4-7 4-7 7.5s7 3.5 7 7.5" /></Svg>
);
export const IconoPluma = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><path d="M3.5 16.5l2.8-.7 9.1-9.1a1.6 1.6 0 0 0-2.1-2.1L4.2 13.7z" /><path d="M11.8 6.1l2.1 2.1" /></Svg>
);
export const IconoHojas = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><rect x="6.5" y="2.5" width="10" height="12" rx="1.5" /><path d="M3.5 6v10a1.5 1.5 0 0 0 1.5 1.5h8" /></Svg>
);
export const IconoAlerta = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><path d="M10 3l7.5 13.5h-15z" /><path d="M10 8.5v3.5M10 14.6v.01" /></Svg>
);
export const IconoInfo = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 6.2v.01" /></Svg>
);
export const IconoDescarga = ({ className = "" }: { className?: string }) => (
  <Svg className={className}><path d="M10 3v9.5M6 8.8l4 4 4-4M3.5 16.5h13" /></Svg>
);
/** Marca de la app: una hoja de libro contable con renglones y un sello. */
export const IconoMarca = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 ${className}`} {...TRAZO}>
    <rect x="4" y="2.5" width="16" height="19" rx="2" />
    <path d="M8 7.5h8M8 11h8M8 14.5h3.5" />
    <circle cx="15.5" cy="16" r="2.6" />
  </svg>
);

export function Girando({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 animate-spin ${className}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M10 2a8 8 0 1 0 8 8" />
    </svg>
  );
}

const ICONOS: Record<NombreIcono, (p: { className?: string }) => ReactNode> = {
  verificacion: IconoOk, reloj: IconoReloj, pluma: IconoPluma, hojas: IconoHojas, triangulo: IconoAlerta,
};

export function IconoEstado({ estado, className = "" }: { estado: EstadoVisual; className?: string }) {
  const Icono = ICONOS[ESTADOS[estado].icono];
  return <Icono className={`${ESTADOS[estado].claseTexto} ${className}`} />;
}

// ── Insignia y sello ──

/** Píldora de estado: icono + texto sobre el fondo suave del estado. `corta`: texto breve para tablas. */
export function Insignia({ estado, corta = false, children }: { estado: EstadoVisual; corta?: boolean; children?: ReactNode }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${e.claseInsignia}`}>
      <IconoEstado estado={estado} className="h-3.5 w-3.5" />
      {children ?? (corta ? e.corto : e.texto)}
    </span>
  );
}

/** El sello: el único elemento «expresivo». `nuevo` lo estampa con una animación (respeta reduced-motion). */
export function Sello({ estado, nuevo = false }: { estado: EstadoVisual; nuevo?: boolean }) {
  const e = ESTADOS[estado];
  const Icono = ICONOS[e.icono]; // hereda el color del sello (currentColor)
  return (
    <span className={`sello ${e.claseSello} ${nuevo ? "sello-nuevo" : ""}`} data-testid="sello">
      <Icono className="h-5 w-5" />
      {e.texto}
    </span>
  );
}

// ── Botones ──

export type VarianteBoton = "principal" | "secundario" | "peligro" | "fantasma";

const BASE_BOTON =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";
const VARIANTES: Record<VarianteBoton, string> = {
  principal: "bg-acento text-sobre-acento hover:bg-acento-hover",
  secundario: "border border-linea bg-superficie text-tinta hover:bg-superficie-2",
  peligro: "bg-error text-sobre-acento hover:opacity-90",
  fantasma: "text-tinta hover:bg-superficie-2",
};

/** Clases de botón para enlaces o etiquetas que deben verse como botón (descargas, «Elegir carpeta»). */
export const claseBoton = (variante: VarianteBoton = "secundario", extra = "") => `${BASE_BOTON} ${VARIANTES[variante]} ${extra}`;
export const botonPrimario = claseBoton("principal");
export const botonSecundario = claseBoton("secundario");

/** Botón con estado `cargando` (gira, queda deshabilitado y dice lo que pasa). */
export function Boton({
  variante = "secundario", cargando = false, textoCargando, className = "", children, disabled, type = "button", ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton; cargando?: boolean; textoCargando?: ReactNode }) {
  return (
    <button type={type} {...resto} disabled={disabled || cargando} aria-busy={cargando || undefined} className={claseBoton(variante, className)}>
      {cargando ? <><Girando />{textoCargando ?? children}</> : children}
    </button>
  );
}

// ── Contenedores ──

/** Panel con borde `linea` (sin sombra): la unidad de la página. */
export function Tarjeta({ children, className = "", ...resto }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return <section {...resto} className={`rounded-panel border border-linea bg-superficie p-5 ${className}`}>{children}</section>;
}

/** Encabezado de página: título en frase normal y una línea que explica para qué sirve. */
export function EncabezadoPagina({ titulo, children, acciones }: { titulo: ReactNode; children?: ReactNode; acciones?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {children && <p className="mt-2 text-tinta-suave">{children}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

export type TonoAviso = "exito" | "revision" | "error" | "info";
const AVISOS: Record<TonoAviso, { clase: string; icono: ReactNode }> = {
  exito: { clase: "border-aceptada/40 bg-aceptada-suave", icono: <IconoOk className="mt-0.5 text-aceptada" /> },
  revision: { clase: "border-revision/40 bg-revision-suave", icono: <IconoReloj className="mt-0.5 text-revision" /> },
  error: { clase: "border-error/40 bg-error-suave", icono: <IconoAlerta className="mt-0.5 text-error" /> },
  info: { clase: "border-acento/30 bg-acento-suave", icono: <IconoInfo className="mt-0.5 text-acento" /> },
};

/** Mensaje en línea con icono. Error → role="alert"; el resto, role="status" (los lectores de pantalla lo anuncian). */
export function Aviso({ tono, children, className = "", ...resto }: { tono: TonoAviso; children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const a = AVISOS[tono];
  return (
    <div role={tono === "error" ? "alert" : "status"} {...resto} className={`flex items-start gap-2.5 rounded-panel border px-4 py-3 text-sm text-tinta ${a.clase} ${className}`}>
      {a.icono}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Bloque gris que tiene la forma del contenido que va a llegar (no un spinner centrado). */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-superficie-2 ${className}`} />;
}

/** Esqueleto de una tabla: cabecera + n filas. */
export function EsqueletoTabla({ filas = 4, etiqueta }: { filas?: number; etiqueta: string }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy="true" aria-label={etiqueta}>
      <Esqueleto className="h-9 w-full" />
      {Array.from({ length: filas }, (_, i) => <Esqueleto key={i} className="h-7 w-full opacity-70" />)}
    </div>
  );
}

/** Esqueleto de una página entera (título + cifras + tabla) mientras llega su contenido. */
export function CargandoPagina() {
  return (
    <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col gap-6 px-4 py-8" aria-busy="true" aria-label="Cargando">
      <Esqueleto className="h-8 w-64" />
      <EsqueletoCifras />
      <EsqueletoTabla etiqueta="Cargando" />
    </main>
  );
}

/** Estado vacío: qué pasa y qué hacer. */
export function Vacio({ titulo, children, accion }: { titulo: ReactNode; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-panel border border-dashed border-linea bg-superficie p-6">
      <p className="text-base font-semibold">{titulo}</p>
      {children && <p className="text-sm text-tinta-suave">{children}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

// ── Cifras ──

/**
 * Tamaño de letra que hace caber la cifra en SU tarjeta: `cqi` es el 1 % del ancho de la tarjeta (container query),
 * así que la letra se encoge según cuántos caracteres tiene la cifra y cuánto mide la tarjeta. Un «$0» se ve grande
 * y un «$1.243.666.665» se reduce solo lo necesario. 0,62 em por carácter es un margen holgado para dígitos tabulares.
 * Mínimo 0,875 rem (14 px) para que siga legible; si ni así cabe, la cifra se parte en dos líneas (overflow-wrap).
 */
function tamanoCifra(valor: ReactNode, maximoRem: number): string | undefined {
  if (typeof valor !== "string" && typeof valor !== "number") return undefined; // otro contenido: tamaño de la clase
  const largo = Math.max(String(valor).length, 4);
  return `clamp(0.875rem, ${(100 / (largo * 0.62)).toFixed(2)}cqi, ${maximoRem}rem)`;
}

/** Tarjeta con una cifra (el valor va en tinta de texto; el color solo acompaña como marca). */
export function Cifra({ etiqueta, valor, detalle, grande = false }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode; grande?: boolean }) {
  return (
    // @container: la tarjeta es el contenedor de referencia de `cqi`. min-w-0: en una cuadrícula, la tarjeta no
    // puede crecer por su contenido (por defecto sí, y en el celular empujaba la cifra fuera de la pantalla).
    <div className="@container flex min-w-0 flex-col gap-1 rounded-panel border border-linea bg-superficie p-4">
      <span className="text-sm text-tinta-suave">{etiqueta}</span>
      <span
        className={`cifra font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] ${grande ? "text-2xl" : "text-xl"}`}
        style={{ fontSize: tamanoCifra(valor, grande ? 1.9375 : 1.5625) }}
      >{valor}</span>
      {detalle ? <span className="text-xs text-tinta-suave">{detalle}</span> : null}
    </div>
  );
}

/** Esqueleto de una fila de 4 cifras. */
export function EsqueletoCifras({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-panel border border-linea bg-superficie p-4">
          <Esqueleto className="h-4 w-20" /><Esqueleto className="h-7 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Medidor de una proporción (n de total). Siempre con icono y texto: el color nunca es lo único que dice algo. */
export function Medidor({
  etiqueta, porcentaje, n, total, estado,
}: { etiqueta: string; porcentaje: number | null; n: number; total: number; estado: "aceptada" | "revision" }) {
  const relleno = estado === "aceptada" ? "bg-aceptada" : "bg-revision";
  return (
    <div className="flex flex-col gap-2 rounded-panel border border-linea bg-superficie p-4">
      <div className="flex items-center gap-2 text-sm">
        <IconoEstado estado={estado} />
        <span className="font-medium">{etiqueta}</span>
      </div>
      <div className="cifra text-2xl font-semibold tracking-tight">{porcentaje === null ? "—" : `${porcentaje.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`}</div>
      <div
        role="meter" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje ?? 0}
        className="h-2 w-full overflow-hidden rounded-full bg-superficie-2"
      >
        <div className={`h-full rounded-full ${relleno}`} style={{ width: `${porcentaje ?? 0}%` }} />
      </div>
      <span className="cifra text-xs text-tinta-suave">
        {n.toLocaleString("es-CO")} de {total.toLocaleString("es-CO")} facturas
      </span>
    </div>
  );
}

/** Barra de progreso (acento). Es el único movimiento propio de la app junto con el sello. */
export function Progreso({ valor, max, etiqueta }: { valor: number; max: number; etiqueta: string }) {
  const p = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor} className="h-2 w-full overflow-hidden rounded-full bg-superficie-2">
      <div className="h-full rounded-full bg-acento transition-[width] duration-300" style={{ width: `${p}%` }} />
    </div>
  );
}
