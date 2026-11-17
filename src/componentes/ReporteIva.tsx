"use client";

// Fase E2 · Reporte de IVA por periodo (bimestre). Reutiliza /api/metricas: suma los contadores `porPeriodo` de
// los lotes (1 lectura por lote), sin recorrer facturas. Solo cuenta lo aceptado por la máquina y lo revisado a
// mano (igual que «lo procesado» en Métricas). El gráfico nunca es la única fuente: debajo va la tabla exacta.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Importes } from "@/lib/modelo/tipos";
import { MESES_POR_PERIODO_IVA } from "@/lib/ocr/constantes";
import { importesVacios, sinDatosPorPeriodo, sumarMetricas } from "@/lib/procesamiento/metricas";
import { nombrePeriodo, partesPeriodo, periodosDelAnio } from "@/lib/reportes/periodos";
import { cop, num } from "./formato";
import { Aviso, Boton, Esqueleto, IconoDescarga, IconoEstado, Tarjeta, claseBoton } from "./ui";
import { useMetricas } from "./useMetricas";

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

/** «Mar–abr» para el eje (el nombre completo va en la tabla y en el texto alternativo). */
function etiquetaCorta(clave: string): string {
  const p = partesPeriodo(clave);
  if (!p) return clave;
  const primero = (p.n - 1) * MESES_POR_PERIODO_IVA;
  return `${MESES_CORTOS[primero]}–${MESES_CORTOS[primero + MESES_POR_PERIODO_IVA - 1].toLowerCase()}`;
}

type Fila = { clave: string } & Importes;

// Geometría del gráfico en PÍXELES reales: el SVG mide su ancho y dibuja a escala 1:1, para que el texto quede
// siempre en 12 px (un viewBox fijo que escala encogía las letras a ~6 px en el celular y las agrandaba en escritorio).
const ANCHO_INICIAL = 600, ALTO = 240, MARGEN_ARRIBA = 28, MARGEN_ABAJO = 32, BARRA = 24, RADIO = 4;

/** Barra con la punta de datos redondeada (4 px) y la base recta, creciendo desde la línea base. */
function rutaBarra(x: number, y: number, ancho: number, alto: number): string {
  const r = Math.min(RADIO, alto, ancho / 2);
  const base = y + alto;
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${base} Z`;
}

function GraficoIva({ filas, anio }: { filas: Fila[]; anio: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [ANCHO, setAncho] = useState(ANCHO_INICIAL);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    // El estado cambia en el callback del observador (asíncrono), no en el cuerpo del efecto (regla de React 19).
    const observador = new ResizeObserver(([e]) => setAncho(Math.max(240, Math.round(e.contentRect.width))));
    observador.observe(svg);
    return () => observador.disconnect();
  }, []);
  const maximo = Math.max(...filas.map((f) => f.iva), 1);
  const banda = ANCHO / filas.length;
  const altoUtil = ALTO - MARGEN_ARRIBA - MARGEN_ABAJO;
  const base = ALTO - MARGEN_ABAJO;
  const resumen = filas.map((f) => `${nombrePeriodo(f.clave)}: IVA ${cop(f.iva)}`).join("; ");
  return (
    <svg ref={ref} viewBox={`0 0 ${ANCHO} ${ALTO}`} width="100%" height={ALTO} className="block" role="img" aria-label={`IVA por bimestre de ${anio}. ${resumen}.`} data-testid="grafico-iva">
      <line x1={0} x2={ANCHO} y1={base} y2={base} className="stroke-linea" strokeWidth={1} />
      {filas.map((f, i) => {
        const alto = f.iva > 0 ? Math.max(2, (f.iva / maximo) * altoUtil) : 0;
        const x = i * banda + (banda - BARRA) / 2;
        const y = base - alto;
        return (
          // Toda la banda es el área de interacción (más grande que la barra); el detalle va en <title> (hover)
          // y en la tabla de abajo (sin depender del ratón).
          <g key={f.clave} className="group">
            <title>{`${nombrePeriodo(f.clave)}\nIVA ${cop(f.iva)} · base ${cop(f.subtotal)} · ${num(f.n)} facturas`}</title>
            <rect x={i * banda} y={0} width={banda} height={ALTO} fill="transparent" />
            {alto > 0 && <path d={rutaBarra(x, y, BARRA, alto)} className="fill-acento transition-opacity group-hover:opacity-80" />}
            <text x={x + BARRA / 2} y={(alto > 0 ? y : base) - 8} textAnchor="middle" className={`cifra text-[12px] ${f.iva > 0 ? "fill-tinta font-medium" : "fill-tinta-suave"}`}>
              {f.iva > 0 ? `$${compacto.format(f.iva)}` : "$0"}
            </text>
            <text x={x + BARRA / 2} y={base + 20} textAnchor="middle" className="fill-tinta-suave text-[12px]">{etiquetaCorta(f.clave)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ReporteIva() {
  const { datos, error, cargando, refrescar } = useMetricas(null);
  const [anioElegido, setAnioElegido] = useState<number | null>(null);

  const { total, sinDatos, anios } = useMemo(() => {
    const lotes = datos?.lotes ?? [];
    const t = sumarMetricas(lotes.map((l) => l.metricas));
    const a = [...new Set(Object.keys(t.porPeriodo ?? {}).map((c) => partesPeriodo(c)?.anio).filter((x): x is number => Boolean(x)))].sort((x, y) => y - x);
    return { total: t, sinDatos: lotes.filter((l) => sinDatosPorPeriodo(l.metricas)).length, anios: a };
  }, [datos]);

  if (cargando) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Cargando el reporte">
        <Esqueleto className="h-10 w-72" />
        <Esqueleto className="h-72 rounded-panel" />
        <Esqueleto className="h-48 rounded-panel" />
      </div>
    );
  }
  if (error) {
    return (
      <Aviso tono="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>No se pudo cargar el reporte ({error}). Revisa tu conexión e inténtalo de nuevo.</span>
          <Boton onClick={() => void refrescar()}>Reintentar</Boton>
        </div>
      </Aviso>
    );
  }

  const avisoSinDatos = sinDatos > 0 && (
    <p className="flex items-start gap-2 rounded-panel border border-revision/40 bg-revision-suave px-4 py-3 text-sm" data-testid="aviso-sin-periodo">
      <IconoEstado estado="revision" className="mt-0.5" /><span>
      {num(sinDatos)} {sinDatos === 1 ? "lote se procesó" : "lotes se procesaron"} antes de este reporte y no {sinDatos === 1 ? "tiene" : "tienen"} datos
      por periodo: no {sinDatos === 1 ? "está incluido" : "están incluidos"} abajo. Recalcúlalos con <code className="font-mono text-xs">scripts/recalcular-metricas.ts</code>.
    </span></p>
  );

  if (anios.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {avisoSinDatos}
        <div className="flex flex-col items-start gap-2 rounded-panel border border-dashed border-linea bg-superficie p-6" data-testid="reporte-vacio">
          <p className="font-semibold">Aún no hay datos para el reporte.</p>
          <p className="text-sm text-tinta-suave">
            Hacen falta facturas aceptadas con fecha de emisión. <Link href="/" className="enlace">Procesa facturas</Link> o revisa a mano las pendientes.
          </p>
        </div>
      </div>
    );
  }

  const anio = anioElegido !== null && anios.includes(anioElegido) ? anioElegido : anios[0];
  const filas: Fila[] = periodosDelAnio(anio).map((clave) => ({ clave, ...(total.porPeriodo?.[clave] ?? importesVacios()) }));
  const suma = (c: keyof Importes) => filas.reduce((a, f) => a + f[c], 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-tinta-suave">Año</span>
          <select
            value={anio} onChange={(e) => setAnioElegido(Number(e.target.value))} data-testid="selector-anio"
            className="campo cifra w-auto"
          >
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <a className={claseBoton("secundario")} href={`/api/reportes/iva?anio=${anio}`} data-testid="descargar-reporte"><IconoDescarga /> Descargar este reporte (Excel)</a>
      </div>

      {avisoSinDatos}

      <Tarjeta aria-labelledby="h-grafico" className="flex flex-col gap-3">
        <h2 id="h-grafico" className="text-lg font-semibold">IVA por bimestre · {anio}</h2>
        <GraficoIva filas={filas} anio={anio} />
      </Tarjeta>

      <Tarjeta aria-labelledby="h-tabla" className="flex flex-col gap-3">
        <h2 id="h-tabla" className="text-lg font-semibold">Cifras exactas · {anio}</h2>
        {/* `relative`: mismo motivo que en Métricas (que nada escape del scroll horizontal en el celular). */}
        <div className="relative overflow-x-auto rounded-control border border-linea" tabIndex={0} role="region" aria-label="Cifras exactas del IVA por bimestre">
          <table className="tabla" data-testid="tabla-iva">
            <thead>
              <tr>
                <th>Periodo</th><th className="num">Facturas</th>
                <th className="num">Base gravable</th><th className="num">IVA</th>
                <th className="num">Impoconsumo</th><th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.clave}>
                  <td className="whitespace-nowrap">{nombrePeriodo(f.clave)}</td>
                  <td className="num">{num(f.n)}</td>
                  <td className="num">{cop(f.subtotal)}</td>
                  <td className="num font-medium">{cop(f.iva)}</td>
                  <td className="num">{cop(f.impoconsumo)}</td>
                  <td className="num">{cop(f.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total {anio}</td>
                <td className="num">{num(suma("n"))}</td>
                <td className="num">{cop(suma("subtotal"))}</td>
                <td className="num">{cop(suma("iva"))}</td>
                <td className="num">{cop(suma("impoconsumo"))}</td>
                <td className="num">{cop(suma("total"))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-tinta-suave">
          Por fecha de emisión. Incluye las facturas aceptadas por la máquina y las revisadas a mano; las que esperan revisión
          no entran hasta que una persona las revise. La periodicidad real de tu declaración depende de tus ingresos: verifícala con un contador.
        </p>
      </Tarjeta>
    </div>
  );
}
