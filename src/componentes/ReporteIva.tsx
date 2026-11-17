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
import { botonSecundario } from "./ui";
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
            <text x={x + BARRA / 2} y={(alto > 0 ? y : base) - 8} textAnchor="middle" className={`cifra text-[12px] ${f.iva > 0 ? "fill-tinta font-medium" : "fill-texto2"}`}>
              {f.iva > 0 ? `$${compacto.format(f.iva)}` : "$0"}
            </text>
            <text x={x + BARRA / 2} y={base + 20} textAnchor="middle" className="fill-texto2 text-[12px]">{etiquetaCorta(f.clave)}</text>
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
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando el reporte">
        <div className="h-9 w-48 animate-pulse rounded-md bg-pista" />
        <div className="h-60 animate-pulse rounded-lg bg-pista" />
        <div className="h-40 animate-pulse rounded-lg bg-pista" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-malo p-4 text-sm">
        No se pudo cargar el reporte ({error}). Revisa tu conexión e inténtalo de nuevo.
        <button className={botonSecundario} onClick={() => void refrescar()}>Reintentar</button>
      </div>
    );
  }

  const avisoSinDatos = sinDatos > 0 && (
    <p className="rounded-lg border border-aviso p-3 text-sm" data-testid="aviso-sin-periodo">
      {num(sinDatos)} {sinDatos === 1 ? "lote se procesó" : "lotes se procesaron"} antes de este reporte y no {sinDatos === 1 ? "tiene" : "tienen"} datos
      por periodo: no {sinDatos === 1 ? "está incluido" : "están incluidos"} abajo. Recalcúlalos con <code>scripts/recalcular-metricas.ts</code>.
    </p>
  );

  if (anios.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {avisoSinDatos}
        <p className="rounded-lg border border-borde bg-superficie p-5 text-texto2" data-testid="reporte-vacio">
          Aún no hay facturas aceptadas con fecha de emisión para el reporte. <Link href="/" className="font-medium underline">Procesa facturas</Link> o revisa a mano las pendientes.
        </p>
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
          Año
          <select
            value={anio} onChange={(e) => setAnioElegido(Number(e.target.value))} data-testid="selector-anio"
            className="cifra rounded-md border border-borde bg-superficie px-2 py-1.5"
          >
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <a className={botonSecundario} href={`/api/reportes/iva?anio=${anio}`} data-testid="descargar-reporte">Descargar este reporte (Excel)</a>
      </div>

      {avisoSinDatos}

      <section aria-labelledby="h-grafico" className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie p-5">
        <h2 id="h-grafico" className="text-lg font-semibold">IVA por bimestre · {anio}</h2>
        <GraficoIva filas={filas} anio={anio} />
      </section>

      <section aria-labelledby="h-tabla" className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie p-5">
        <h2 id="h-tabla" className="text-lg font-semibold">Cifras exactas · {anio}</h2>
        {/* `relative`: mismo motivo que en Métricas (que nada escape del scroll horizontal en el celular). */}
        <div className="relative overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="tabla-iva">
            <thead>
              <tr className="border-b border-borde text-texto2">
                <th className="py-2 pr-3 font-medium">Periodo</th><th className="pr-3 text-right font-medium">Facturas</th>
                <th className="pr-3 text-right font-medium">Base gravable</th><th className="pr-3 text-right font-medium">IVA</th>
                <th className="pr-3 text-right font-medium">Impoconsumo</th><th className="text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.clave} className="border-b border-borde/60">
                  <td className="py-2 pr-3 whitespace-nowrap">{nombrePeriodo(f.clave)}</td>
                  <td className="cifra pr-3 text-right">{num(f.n)}</td>
                  <td className="cifra pr-3 text-right">{cop(f.subtotal)}</td>
                  <td className="cifra pr-3 text-right">{cop(f.iva)}</td>
                  <td className="cifra pr-3 text-right">{cop(f.impoconsumo)}</td>
                  <td className="cifra text-right">{cop(f.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2 pr-3">Total {anio}</td>
                <td className="cifra pr-3 text-right">{num(suma("n"))}</td>
                <td className="cifra pr-3 text-right">{cop(suma("subtotal"))}</td>
                <td className="cifra pr-3 text-right">{cop(suma("iva"))}</td>
                <td className="cifra pr-3 text-right">{cop(suma("impoconsumo"))}</td>
                <td className="cifra text-right">{cop(suma("total"))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-texto2">
          Por fecha de emisión. Incluye las facturas aceptadas por la máquina y las revisadas a mano; las que esperan revisión
          no entran hasta que una persona las revise. La periodicidad real de tu declaración depende de tus ingresos: verifícala con un contador.
        </p>
      </section>
    </div>
  );
}
