"use client";

// Detalle de UN lote: avance en vivo (con antes de IVA, IVA e impoconsumo), Excel y tabla de facturas.
// El trabajo lo hace el Motor del layout; esta vista solo muestra.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Metricas } from "@/lib/modelo/tipos";
import { calcularTasas, sumarMetricas } from "@/lib/procesamiento/metricas";
import { cop, dormir, fechaHora, num, pct } from "./formato";
import { SoloEscritura } from "./Rol";
import { estadoDeFactura } from "./estado";
import { Aviso, Boton, Cifra, EsqueletoCifras, EsqueletoTabla, Girando, IconoDescarga, IconoEstado, IconoOk, Insignia, Progreso, Tarjeta, Vacio, claseBoton } from "./ui";

const SONDEO_MS = 4000;

interface Estado {
  id: string; carpeta: string; estado: "subiendo" | "ejecutando" | "terminado" | "error" | "en_cola";
  totalArchivos: number; inicio: number; fin: number | null; tieneExcel: boolean; metricas: Partial<Metricas>;
}
interface FilaFactura {
  hash: string; archivo: string; numero: string | null; fecha: string | null; proveedor: string | null;
  clienteDocumento: string | null; clienteNombre: string | null; subtotal: number | null; iva: number | null;
  impoconsumo: number; total: number | null; estado: "aceptada" | "revision"; motivos: string[]; corregidaManualmente: boolean;
}

export function VistaProceso({ id }: { id: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [facturas, setFacturas] = useState<FilaFactura[] | null>(null);
  const [hayMas, setHayMas] = useState(false); // Fase E4: la demo ve como máximo 50 facturas por lote
  const [filtro, setFiltro] = useState<"todas" | "aceptada" | "revision">("todas");
  const [ahora, setAhora] = useState(0);
  const [regenerando, setRegenerando] = useState(false);

  const consultar = useCallback(async (): Promise<Estado | null> => {
    const r = await fetch(`/api/procesos/${id}`, { cache: "no-store" });
    if (r.status === 401) { router.replace("/login"); return null; }
    if (!r.ok) { setMensaje("No se encontró este lote (¿se borraron los datos?)"); return null; }
    const e = (await r.json()) as Estado;
    setEstado(e);
    setAhora(Date.now());
    return e;
  }, [id, router]);

  // Sondeo barato (el documento del lote ya trae los contadores); se detiene al terminar o con la pestaña oculta.
  useEffect(() => {
    let vivo = true;
    (async () => {
      while (vivo) {
        if (document.visibilityState === "visible") {
          const e = await consultar().catch(() => null);
          if (!e || e.estado === "terminado" || e.estado === "error") break;
        }
        await dormir(SONDEO_MS);
      }
    })();
    return () => { vivo = false; };
  }, [consultar]);

  const terminado = estado?.estado === "terminado";
  // Las facturas se leen una vez, al terminar (cuesta ~2 lecturas por factura).
  useEffect(() => {
    if (!terminado || facturas) return;
    fetch(`/api/procesos/${id}/facturas`).then((r) => r.json()).then((d: { facturas: FilaFactura[]; hayMas?: boolean }) => { setFacturas(d.facturas); setHayMas(Boolean(d.hayMas)); }).catch(() => setFacturas([]));
  }, [terminado, id, facturas]);

  async function regenerarExcel() {
    setRegenerando(true);
    try {
      const r = await fetch(`/api/procesos/${id}/regenerar-excel`, { method: "POST" });
      if (!r.ok) setMensaje("No se pudo regenerar el Excel");
      await consultar();
    } finally {
      setRegenerando(false);
    }
  }

  const m = sumarMetricas([estado?.metricas]);
  const t = calcularTasas(m);
  const total = estado?.totalArchivos ?? 0;
  const hechas = t.total + m.duplicadas;
  const visibles = (facturas ?? []).filter((f) => filtro === "todas" || f.estado === filtro);
  const segundos = estado ? Math.max(0, Math.round(((estado.fin ?? ahora) - estado.inicio) / 1000)) : 0;

  return (
    <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <p><Link className="enlace text-sm" href="/">← Procesar facturas</Link></p>
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">Lote: {estado?.carpeta ?? "…"}</h1>
      </div>
      {mensaje && <Aviso tono="error">{mensaje}</Aviso>}

      {!estado && !mensaje && (
        <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Cargando el lote">
          <EsqueletoCifras />
          <EsqueletoTabla etiqueta="Cargando las facturas" />
        </div>
      )}

      {estado && (
        <Tarjeta className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-2 font-medium" aria-live="polite">
              {terminado ? <><IconoOk className="text-aceptada" /> Terminado</> : <><Girando className="text-acento" /> Procesando (en segundo plano)</>}
            </span>
            <span className="cifra text-tinta-suave">{fechaHora(estado.inicio)} · {segundos} s</span>
          </div>
          <div>
            <Progreso valor={hechas} max={total} etiqueta="Facturas procesadas" />
            <p className="cifra mt-1 text-sm text-tinta-suave">{num(hechas)} de {num(total)} facturas procesadas</p>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
            <Cifra etiqueta="Antes de IVA" valor={cop(m.aceptadas.subtotal + m.manuales.subtotal)} />
            <Cifra etiqueta="IVA" valor={cop(m.aceptadas.iva + m.manuales.iva)} />
            <Cifra etiqueta="Impoconsumo" valor={cop(m.aceptadas.impoconsumo + m.manuales.impoconsumo)} />
            <Cifra etiqueta="Total" valor={cop(m.aceptadas.total + m.manuales.total)} />
          </div>
          <p className="-mt-2 text-xs text-tinta-suave">Suma lo aceptado (por la máquina o revisado a mano). Lo que está en revisión no se incluye hasta que una persona lo revise.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li className="inline-flex items-center gap-1.5"><IconoEstado estado="aceptada" /> Leídas correctamente: <b className="cifra">{num(t.correctas)}</b> ({pct(t.pctCorrectas)})</li>
            <li className="inline-flex items-center gap-1.5"><IconoEstado estado="revision" /> A revisión / mal leídas: <b className="cifra">{num(t.malLeidas)}</b> ({pct(t.pctMalLeidas)})</li>
            <li className="inline-flex flex-wrap items-center gap-1.5"><IconoEstado estado="manual" /> Revisadas a mano: <b className="cifra">{num(t.revisadasAMano)}</b>{t.pendientes > 0 && <> · <Link className="enlace" href="/revision">{num(t.pendientes)} pendientes: revisar</Link></>}</li>
            <li className="inline-flex items-center gap-1.5"><IconoEstado estado="duplicada" /> Duplicadas: <b className="cifra">{num(m.duplicadas)}</b></li>
            <li className="inline-flex items-center gap-1.5">Clientes nuevos: <b className="cifra">{num(m.clientesNuevos)}</b></li>
          </ul>
          {estado.tieneExcel && (
            <p className="flex flex-wrap items-center gap-3">
              <a className={claseBoton("principal")} href={`/api/procesos/${id}/excel`}><IconoDescarga /> Descargar Excel</a>
              {terminado && m.manuales.n > 0 && (
                <SoloEscritura>{/* Fase E4: regenerar escribe en Blob; la demo solo descarga */}
                  <Boton onClick={() => void regenerarExcel()} cargando={regenerando} textoCargando="Generando…" data-testid="regenerar-excel">
                    Regenerar el Excel con las correcciones a mano
                  </Boton>
                </SoloEscritura>
              )}
            </p>
          )}
        </Tarjeta>
      )}

      {terminado && !facturas && <Tarjeta><EsqueletoTabla etiqueta="Cargando las facturas" /></Tarjeta>}

      {facturas && (
        <Tarjeta className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Facturas ({num(visibles.length)})</h2>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-tinta-suave">Mostrar</span>
              <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="campo w-auto">
                <option value="todas">Todas</option>
                <option value="aceptada">Aceptadas</option>
                <option value="revision">En revisión</option>
              </select>
            </label>
          </div>
          {hayMas && <Aviso tono="info" data-testid="demo-tope">Modo demo: se muestran las primeras 50 facturas del lote.</Aviso>}
          {visibles.length === 0 ? (
            <Vacio titulo="No hay facturas con este estado.">Cambia el filtro «Mostrar» para ver las demás.</Vacio>
          ) : (
            <div className="relative overflow-x-auto rounded-control border border-linea" tabIndex={0} role="region" aria-label="Facturas del lote">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Archivo</th><th>Número</th><th>Fecha</th><th>Razón social</th>
                    <th className="num">Antes de IVA</th><th className="num">IVA</th><th className="num">Impoconsumo</th><th className="num">Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((f) => (
                    <tr key={f.hash}>
                      <td className="max-w-56 [overflow-wrap:anywhere]"><a className="enlace" target="_blank" rel="noreferrer" href={`/api/facturas/${f.hash}/imagen`}>{f.archivo}</a></td>
                      <td className="whitespace-nowrap font-mono text-xs">{f.numero ?? "—"}</td>
                      <td className="cifra whitespace-nowrap">{f.fecha ?? "—"}</td>
                      <td className="min-w-40">{f.proveedor ?? "—"}</td>
                      <td className="num">{cop(f.subtotal)}</td>
                      <td className="num">{cop(f.iva)}</td>
                      <td className="num">{cop(f.impoconsumo)}</td>
                      <td className="num font-medium">{cop(f.total)}</td>
                      <td className="min-w-44">
                        <span title={f.motivos.join("\n") || undefined}><Insignia estado={estadoDeFactura(f)} corta /></span>
                        {f.estado === "revision" && <div className="mt-1 max-w-xs text-xs text-tinta-suave">{f.motivos[0]}</div>}
                        {(f.estado === "revision" || f.corregidaManualmente) && <div className="mt-1"><Link className="enlace text-sm" href={`/revision/${f.hash}`}>{f.estado === "revision" ? "Revisar" : "Editar"}</Link></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      )}
    </main>
  );
}
