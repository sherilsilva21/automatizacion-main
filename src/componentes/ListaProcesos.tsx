"use client";

import Link from "next/link";
import { useEffect } from "react";
import { fechaHora, num } from "./formato";
import { useRol } from "./Rol";
import { Aviso, EsqueletoTabla, Girando, IconoOk, Tarjeta, Vacio } from "./ui";
import { useMetricas } from "./useMetricas";

/** Lotes anteriores (con su número, fecha y avance). Usa los mismos datos baratos que el panel de métricas. */
export function ListaProcesos() {
  const { datos, error, cargando, refrescar } = useMetricas(null);
  const { rol } = useRol();
  useEffect(() => {
    const alBorrar = () => void refrescar();
    window.addEventListener("datos-borrados", alBorrar);
    return () => window.removeEventListener("datos-borrados", alBorrar);
  }, [refrescar]);
  const lotes = [...(datos?.lotes ?? [])].reverse();

  return (
    <Tarjeta className="flex flex-col gap-3" aria-labelledby="h-lotes-anteriores">
      <h2 id="h-lotes-anteriores" className="text-lg font-semibold">Lotes anteriores</h2>
      {cargando && !datos ? (
        <EsqueletoTabla filas={3} etiqueta="Cargando los lotes" />
      ) : error && !datos ? (
        <Aviso tono="error">No se pudieron cargar los lotes ({error}). Recarga la página para intentarlo de nuevo.</Aviso>
      ) : lotes.length === 0 ? (
        <Vacio titulo="Aún no hay lotes.">
          {rol === "completo" ? "Elige una carpeta de facturas arriba para empezar." : "Cuando se procese un lote aparecerá aquí."}
        </Vacio>
      ) : (
        <ul className="flex flex-col divide-y divide-linea text-sm">
          {lotes.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
              <Link className="enlace min-w-0 [overflow-wrap:anywhere]" href={`/procesos/${l.id}`}>Lote {l.numero} · {l.carpeta}</Link>
              <span className="cifra inline-flex items-center gap-2 text-tinta-suave">
                {fechaHora(l.inicio)} · {num(l.totalArchivos)} facturas ·
                {l.estado === "terminado"
                  ? <span className="inline-flex items-center gap-1 text-tinta"><IconoOk className="text-aceptada" /> terminado</span>
                  : <span className="inline-flex items-center gap-1 text-tinta"><Girando className="text-acento" /> procesando</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
