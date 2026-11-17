"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cop, num } from "./formato";
import { Aviso, EsqueletoTabla, IconoEstado, Sello, Tarjeta, claseBoton } from "./ui";
import { useMetricas } from "./useMetricas";

interface Pendiente { hash: string; archivo: string; procesoId: string; numero: string | null; proveedor: string | null; total: number | null; motivos: string[]; confianzaOcr: number }

/** Facturas que la máquina no pudo aceptar y esperan a una persona. */
export function ListaRevision() {
  const [pendientes, setPendientes] = useState<Pendiente[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { datos } = useMetricas(null);
  const numeroDeLote = new Map((datos?.lotes ?? []).map((l) => [l.id, l.numero]));

  useEffect(() => {
    let vivo = true;
    fetch("/api/facturas", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(`Error ${r.status}`); return (await r.json()) as { facturas: Pendiente[]; hayMas: boolean }; })
      .then((d) => { if (vivo) { setPendientes(d.facturas); setHayMas(d.hayMas); } })
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : "Error"));
    return () => { vivo = false; };
  }, []);

  if (error) return <Aviso tono="error">No se pudo cargar la lista ({error}). Recarga la página para intentarlo de nuevo.</Aviso>;
  if (!pendientes) return <Tarjeta><EsqueletoTabla etiqueta="Cargando las facturas pendientes" /></Tarjeta>;
  if (pendientes.length === 0) {
    return (
      <Tarjeta className="flex flex-col items-start gap-3">
        <Sello estado="aceptada" />
        <p className="mt-2 text-lg font-semibold">No hay facturas pendientes de revisión.</p>
        <p className="text-tinta-suave">Todo lo que la máquina no pudo leer ya fue revisado por una persona.</p>
        <Link href="/metricas" className="enlace">Ver métricas</Link>
      </Tarjeta>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-revision/40 bg-revision-suave px-4 py-3">
        <p className="inline-flex items-center gap-2">
          <IconoEstado estado="revision" />
          <b className="cifra text-lg">{num(pendientes.length)}{hayMas ? "+" : ""} {pendientes.length === 1 ? "factura espera" : "facturas esperan"} a una persona</b>
        </p>
        <Link href={`/revision/${pendientes[0].hash}`} className={claseBoton("principal")} data-testid="empezar">Empezar por la primera</Link>
      </div>
      <div className="relative overflow-x-auto rounded-panel border border-linea bg-superficie" tabIndex={0} role="region" aria-label="Facturas pendientes de revisión">
        {/* `relative`: el `sr-only` del encabezado es absoluto; sin un ancestro posicionado escapa del
            recorte de overflow-x-auto y ensancha la página en móvil (mismo caso que PanelMetricas). */}
        <table className="tabla" data-testid="tabla-revision">
          <thead>
            <tr>
              <th>Archivo</th><th>Lote</th><th>Qué falló</th>
              <th className="num">Total leído</th><th><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((f) => (
              <tr key={f.hash}>
                <td className="max-w-56 font-medium [overflow-wrap:anywhere]">{f.archivo}</td>
                <td className="cifra">{numeroDeLote.get(f.procesoId) ?? "—"}</td>
                <td className="min-w-48">{f.motivos[0] ?? "—"}{f.motivos.length > 1 && <span className="text-tinta-suave"> (+{f.motivos.length - 1} más)</span>}</td>
                <td className="num">{cop(f.total)}</td>
                <td><Link className="enlace" href={`/revision/${f.hash}`}>Revisar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hayMas && <p className="text-sm text-tinta-suave">Se muestran las primeras {num(pendientes.length)}; al resolverlas aparecerán las demás.</p>}
    </div>
  );
}
