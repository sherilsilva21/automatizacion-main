"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calcularTasas, proveedoresOrdenados, sumarMetricas } from "@/lib/procesamiento/metricas";
import { cop, fechaHora, num, pct } from "./formato";
import { Aviso, Boton, Cifra, Esqueleto, EsqueletoCifras, EsqueletoTabla, Girando, IconoEstado, Medidor, Tarjeta, Vacio, claseBoton } from "./ui";
import { useMetricas } from "./useMetricas";

/** Barra fina de dos tramos (leídas bien / mal leídas) para leer la proporción al lado de sus cifras. */
function BarraProporcion({ buenas, malas }: { buenas: number; malas: number }) {
  const total = buenas + malas;
  if (total === 0) return <div className="h-2 w-28 rounded-full bg-superficie-2" aria-hidden />;
  return (
    <div className="flex h-2 w-28 gap-0.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
      <div className="bg-aceptada" style={{ width: `${(buenas / total) * 100}%` }} />
      <div className="bg-revision" style={{ width: `${(malas / total) * 100}%` }} />
    </div>
  );
}

export function PanelMetricas() {
  const { datos, error, cargando, refrescar } = useMetricas(8000);
  const [seleccion, setSeleccion] = useState<string>("todos");

  useEffect(() => {
    const alBorrar = () => { setSeleccion("todos"); void refrescar(); };
    window.addEventListener("datos-borrados", alBorrar);
    return () => window.removeEventListener("datos-borrados", alBorrar);
  }, [refrescar]);

  const lotes = useMemo(() => datos?.lotes ?? [], [datos]);
  const elegidos = useMemo(() => (seleccion === "todos" ? lotes : lotes.filter((l) => l.id === seleccion)), [lotes, seleccion]);
  const m = useMemo(() => sumarMetricas(elegidos.map((l) => l.metricas)), [elegidos]);
  const t = calcularTasas(m);
  const proveedores = proveedoresOrdenados(m);
  // Lo aceptado por la máquina más lo que una persona ingresó o corrigió a mano.
  const procesado = {
    n: m.aceptadas.n + m.manuales.n, subtotal: m.aceptadas.subtotal + m.manuales.subtotal, iva: m.aceptadas.iva + m.manuales.iva,
    impoconsumo: m.aceptadas.impoconsumo + m.manuales.impoconsumo, total: m.aceptadas.total + m.manuales.total,
  };
  const maxProveedor = Math.max(1, ...proveedores.map((p) => p.total));
  const procesando = lotes.some((l) => l.estado === "ejecutando");
  const etiquetaSeleccion = seleccion === "todos" ? `todos los lotes (${lotes.length})` : `el lote ${elegidos[0]?.numero ?? ""}`;

  if (cargando && !datos) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Cargando métricas">
        <Esqueleto className="h-10 w-80 max-w-full" />
        <EsqueletoCifras />
        <EsqueletoCifras />
        <Tarjeta><EsqueletoTabla etiqueta="Cargando métricas" /></Tarjeta>
      </div>
    );
  }
  if (error && !datos) {
    return (
      <Aviso tono="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>No se pudieron cargar las métricas ({error}). Revisa tu conexión e inténtalo de nuevo.</span>
          <Boton onClick={() => void refrescar()}>Reintentar</Boton>
        </div>
      </Aviso>
    );
  }

  if (lotes.length === 0) {
    return (
      <Vacio titulo="Todavía no hay facturas procesadas." accion={<Link href="/" className={claseBoton("principal")}>Ir a procesar facturas</Link>}>
        Sube un lote y aquí verás cuánto se procesó y qué tan bien se leyó.
      </Vacio>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex max-w-full items-center gap-2 text-sm">
          <span className="text-tinta-suave">Mostrando</span>
          {/* min-w-0 + max-w-full: el select mide lo que su opción más larga; sin esto se sale a 375 px. */}
          <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)} data-testid="selector-lote" className="campo min-w-0 max-w-full w-auto">
            <option value="todos">Todos los lotes ({lotes.length})</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>Lote {l.numero} · {l.carpeta} · {num(l.totalArchivos)} facturas</option>
            ))}
          </select>
        </label>
        <Boton onClick={() => void refrescar()}>Actualizar</Boton>
        {procesando && <span className="inline-flex items-center gap-2 text-sm text-tinta-suave" role="status"><Girando className="text-acento" /> Hay lotes procesándose; se actualiza solo.</span>}
      </div>

      <section aria-labelledby="h-calidad" className="flex flex-col gap-3">
        <h2 id="h-calidad" className="text-lg font-semibold">Calidad de la lectura · {etiquetaSeleccion}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Medidor etiqueta="Leídas correctamente" estado="aceptada" porcentaje={t.pctCorrectas} n={t.correctas} total={t.total} />
          <Medidor etiqueta="Mal leídas (a revisión)" estado="revision" porcentaje={t.pctMalLeidas} n={t.malLeidas} total={t.total} />
          <Cifra etiqueta="Facturas procesadas" valor={num(t.total)} detalle={`${num(m.revision.n)} en revisión · ${num(m.errores)} con error`} />
          <Cifra etiqueta="Duplicadas (ya estaban)" valor={num(m.duplicadas)} detalle={`Clientes en la base: ${num(datos?.clientesEnBase ?? 0)}`} />
        </div>
        {t.malLeidas > 0 && (
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-panel border border-linea bg-superficie p-4 text-sm" data-testid="aviso-pendientes">
            <IconoEstado estado="manual" className="mt-0.5" />
            <p className="min-w-0 flex-1 basis-56">
              De las {num(t.malLeidas)} mal leídas, <b className="cifra">{num(t.revisadasAMano)}</b> ya se revisaron a mano y <b className="cifra">{num(t.pendientes)}</b> esperan a una persona.
              {/* Fase E3: cuánto ayudó la IA, contado aparte (no cambia «leídas correctamente», que mide a la máquina). */}
              {(m.asistidasIa ?? 0) > 0 && <> <b className="cifra">{num(m.asistidasIa ?? 0)}</b> de las revisadas a mano usaron sugerencias de IA.</>}
            </p>
            {t.pendientes > 0 && <Link href="/revision" className="enlace">Revisar las pendientes →</Link>}
          </div>
        )}
        <p className="text-xs text-tinta-suave">
          «Leída correctamente» = pasó todas las validaciones (IVA 19 %, impoconsumo 4 %, sumas, dígito de verificación del NIT…). No se compara con una respuesta conocida,
          así que un error que cuadre aritméticamente podría pasar. Los porcentajes miden a la máquina: lo que una persona revisa a mano no los cambia. Las duplicadas no cuentan.
        </p>
      </section>

      <section aria-labelledby="h-montos" className="flex flex-col gap-3">
        <h2 id="h-montos" className="text-lg font-semibold">Lo procesado · aceptadas y revisadas a mano</h2>
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
          <Cifra grande etiqueta="Antes de IVA" valor={cop(procesado.subtotal)} />
          <Cifra grande etiqueta="IVA" valor={cop(procesado.iva)} />
          <Cifra grande etiqueta="Impoconsumo" valor={cop(procesado.impoconsumo)} />
          <Cifra grande etiqueta="Total" valor={cop(procesado.total)} detalle={`${num(procesado.n)} facturas · ${num(m.manuales.n)} revisadas a mano`} />
        </div>
        {t.pendientes > 0 && (
          <p className="cifra inline-flex items-center gap-2 text-sm text-tinta-suave">
            <IconoEstado estado="revision" /> Hay {num(t.pendientes)} facturas pendientes de revisión: no están incluidas arriba hasta que una persona las revise.
          </p>
        )}
      </section>

      <Tarjeta aria-labelledby="h-prov" className="flex flex-col gap-3">
        <h2 id="h-prov" className="text-lg font-semibold">Por razón social · {etiquetaSeleccion}</h2>
        {proveedores.length === 0 ? (
          <p className="text-sm text-tinta-suave">Aún no hay facturas aceptadas.</p>
        ) : (
          <div className="relative overflow-x-auto rounded-control border border-linea" tabIndex={0} role="region" aria-label="Tabla por razón social">
            {/* `relative`: los `sr-only` de la tabla son absolutos; sin un ancestro posicionado escapan del
                recorte de overflow-x-auto y ensanchan toda la página en móvil. */}
            <table className="tabla" data-testid="tabla-proveedores">
              <thead>
                <tr>
                  <th>Razón social</th><th>NIT</th>
                  <th className="num">Facturas</th><th className="num">Antes de IVA</th>
                  <th className="num">IVA</th><th className="num">Impoconsumo</th>
                  <th className="num">Total</th><th className="w-32"><span className="sr-only">Participación</span></th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.nit}>
                    <td className="min-w-40 font-medium">{p.nombre}</td>
                    <td className="whitespace-nowrap font-mono text-xs text-tinta-suave">{p.nit}</td>
                    <td className="num">{num(p.n)}</td>
                    <td className="num">{cop(p.subtotal)}</td>
                    <td className="num">{cop(p.iva)}</td>
                    <td className="num">{cop(p.impoconsumo)}</td>
                    <td className="num font-medium">{cop(p.total)}</td>
                    <td aria-hidden className="align-middle"><div className="h-2 rounded-full bg-superficie-2"><div className="h-2 rounded-full bg-acento" style={{ width: `${(p.total / maxProveedor) * 100}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total</td>
                  <td className="num">{num(proveedores.reduce((a, p) => a + p.n, 0))}</td>
                  <td className="num">{cop(proveedores.reduce((a, p) => a + p.subtotal, 0))}</td>
                  <td className="num">{cop(proveedores.reduce((a, p) => a + p.iva, 0))}</td>
                  <td className="num">{cop(proveedores.reduce((a, p) => a + p.impoconsumo, 0))}</td>
                  <td className="num">{cop(proveedores.reduce((a, p) => a + p.total, 0))}</td><td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="text-xs text-tinta-suave">Solo facturas aceptadas o revisadas a mano: en las que esperan revisión, el NIT o el nombre pueden estar mal leídos.</p>
      </Tarjeta>

      <Tarjeta aria-labelledby="h-lotes" className="flex flex-col gap-3">
        <h2 id="h-lotes" className="text-lg font-semibold">Métricas por lote</h2>
        <div className="relative overflow-x-auto rounded-control border border-linea" tabIndex={0} role="region" aria-label="Tabla de métricas por lote">{/* `relative`: ver la tabla de proveedores */}
          <table className="tabla" data-testid="tabla-lotes">
            <thead>
              <tr>
                <th>Lote</th><th>Fecha</th>
                <th className="num">Facturas</th>
                <th><span className="inline-flex items-center gap-1"><IconoEstado estado="aceptada" /> Correctas</span></th>
                <th><span className="inline-flex items-center gap-1"><IconoEstado estado="revision" /> Mal leídas</span></th>
                <th><span className="sr-only">Proporción</span></th>
                <th className="num">Total procesado</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => {
                const lm = sumarMetricas([l.metricas]);
                const lt = calcularTasas(lm);
                return (
                  <tr key={l.id} className={seleccion === l.id ? "bg-acento-suave" : ""}>
                    <td className="min-w-40">
                      <button className="enlace" onClick={() => setSeleccion(l.id)}>Lote {l.numero}</button>
                      <span className="ml-2 text-tinta-suave [overflow-wrap:anywhere]">{l.carpeta}</span>
                    </td>
                    <td className="cifra whitespace-nowrap text-tinta-suave">{fechaHora(l.inicio)}</td>
                    <td className="num">{num(l.totalArchivos)}</td>
                    <td className="cifra whitespace-nowrap">{num(lt.correctas)} · {pct(lt.pctCorrectas)}</td>
                    <td className="cifra whitespace-nowrap">{num(lt.malLeidas)} · {pct(lt.pctMalLeidas)}{lt.malLeidas > 0 && <div className="text-xs text-tinta-suave">{num(lt.pendientes)} por revisar</div>}</td>
                    <td className="align-middle"><BarraProporcion buenas={lt.correctas} malas={lt.malLeidas} /></td>
                    <td className="num font-medium">{cop(lm.aceptadas.total + lm.manuales.total)}</td>
                    <td className="whitespace-nowrap">
                      {l.estado === "terminado" ? "Terminado" : <span className="inline-flex items-center gap-1"><Girando className="text-acento" /> Procesando</span>}
                      {l.tieneExcel && <> · <a className="enlace" href={`/api/procesos/${l.id}/excel`}>Excel</a></>}
                      {" · "}<Link className="enlace" href={`/procesos/${l.id}`}>Detalle</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}
