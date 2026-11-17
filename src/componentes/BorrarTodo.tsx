"use client";

import { useState } from "react";
import { num } from "./formato";
import { Aviso, Boton, IconoAlerta } from "./ui";

interface Resultado {
  borrados: Record<string, number>;
  archivosBlob: number;
}

// El rojo (`error`) de la app está reservado para fallos técnicos y para esta acción destructiva.
export function BorrarTodo({ alBorrar }: { alBorrar?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [hayEjecucion, setHayEjecucion] = useState(false);

  async function borrar(forzar: boolean) {
    setTrabajando(true);
    setError(null);
    setResultado(null);
    try {
      const r = await fetch("/api/datos/borrar", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmacion: texto, forzar }),
      });
      const d = (await r.json().catch(() => ({}))) as Partial<Resultado> & { error?: string; enEjecucion?: number };
      if (r.status === 409) { setHayEjecucion(true); setError(`Hay ${d.enEjecucion} lote(s) procesándose. Si borras ahora se interrumpen.`); return; }
      if (!r.ok) throw new Error(d.error ?? `Error ${r.status}`);
      setResultado(d as Resultado);
      setHayEjecucion(false);
      setAbierto(false);
      setTexto("");
      alBorrar?.();
      window.dispatchEvent(new CustomEvent("datos-borrados"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-panel border border-error/40 bg-superficie p-5" aria-labelledby="h-zona-pruebas">
      <div>
        <h2 id="h-zona-pruebas" className="flex items-center gap-2 text-lg font-semibold"><IconoAlerta className="text-error" /> Zona de pruebas</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Borra <b className="text-tinta">todo</b> lo guardado (de todos los usuarios): facturas, clientes, lotes, métricas, imágenes y Excel. No se puede deshacer.
        </p>
      </div>
      {!abierto ? (
        <Boton className="self-start border-error/60 text-error hover:bg-error-suave" onClick={() => setAbierto(true)} data-testid="borrar-abrir">
          Borrar todas las facturas y registros…
        </Boton>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span>Escribe <b>BORRAR</b> para confirmar</span>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" data-testid="borrar-texto" className="campo max-w-56" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Boton
              variante="peligro" onClick={() => borrar(hayEjecucion)} disabled={texto !== "BORRAR"} cargando={trabajando} textoCargando="Borrando…"
              data-testid="borrar-confirmar"
            >
              {hayEjecucion ? "Borrar de todos modos" : "Borrar todo"}
            </Boton>
            <Boton onClick={() => { setAbierto(false); setTexto(""); setError(null); }} disabled={trabajando}>Cancelar</Boton>
          </div>
        </div>
      )}
      {error && <Aviso tono="error">{error}</Aviso>}
      {resultado && (
        <Aviso tono="exito" className="cifra">
          Listo: se borraron {num(resultado.borrados.facturas ?? 0)} facturas, {num(resultado.borrados.clientes ?? 0)} clientes,{" "}
          {num(resultado.borrados.procesos ?? 0)} lotes y {num(resultado.archivosBlob)} archivos.
        </Aviso>
      )}
    </section>
  );
}
