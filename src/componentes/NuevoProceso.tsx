"use client";

// Subida de facturas por LOTES. Una selección grande (hasta 1000 o más) se divide en lotes (por defecto
// de 100); cada lote es un proceso con sus propias métricas. Mientras se sube el lote siguiente, el
// motor (en segundo plano) ya procesa los anteriores. Un archivo que falla no detiene nada: se reintenta
// y, si sigue fallando, queda en una lista para reintentarlo después.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { comprimirFoto } from "@/lib/navegador/comprimir-imagen";
import { EXTENSIONES_IMAGEN } from "@/lib/rutas";
import { dormir, num } from "./formato";
import { ResumenEnVivo, procesadasDe } from "./ResumenEnVivo";
import { IconoMal, IconoOk, Girando, Progreso, botonPrimario, botonSecundario } from "./ui";
import { useMetricas } from "./useMetricas";

const CONCURRENCIA_SUBIDA = 6;
const REINTENTOS = 3;
const TAMANO_LOTE_POR_DEFECTO = 100;

const mb = (bytes: number) => (bytes / 1024 / 1024).toLocaleString("es-CO", { maximumFractionDigits: 1 });
/** Peso legible: las fotos comprimidas pesan cientos de KB y «0,5 MB» diría poco. */
const peso = (bytes: number) => (bytes < 1024 * 1024 ? `${num(Math.round(bytes / 1024))} KB` : `${mb(bytes)} MB`);

// ¿Pantalla táctil? Solo ahí tiene sentido «Tomar fotos». Se lee con useSyncExternalStore y no al renderizar ni con
// setState dentro de un efecto (React 19 prohíbe lo segundo): en el servidor vale `false` y, ya en el navegador,
// React lo actualiza sin error de hidratación y se suscribe a cambios (p. ej., conectar un ratón a una tableta).
const CONSULTA_TACTIL = "(pointer: coarse)";
function suscribirTactil(aviso: () => void) {
  const consulta = window.matchMedia(CONSULTA_TACTIL);
  consulta.addEventListener("change", aviso);
  return () => consulta.removeEventListener("change", aviso);
}
const esTactilEnNavegador = () => window.matchMedia(CONSULTA_TACTIL).matches;
const esTactilEnServidor = () => false;

interface Foto { id: number; archivo: File; original: number; url: string }

/** El servidor rechazó el archivo (no es imagen, pesa demasiado…): reintentar no sirve. */
class Rechazo extends Error {}

async function subirImagen(id: string, indice: number, f: File): Promise<void> {
  const tipo = f.type || (/\.png$/i.test(f.name) ? "image/png" : "image/jpeg");
  const url = `/api/procesos/${id}/imagenes?indice=${indice}&nombre=${encodeURIComponent(f.name)}`;
  let ultimo = "error de red";
  for (let intento = 0; intento < REINTENTOS; intento++) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": tipo }, body: f });
      if (r.ok) return;
      const mensaje = ((await r.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${r.status}`;
      if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) throw new Rechazo(mensaje);
      ultimo = mensaje;
    } catch (e) {
      if (e instanceof Rechazo) throw e;
      ultimo = e instanceof Error ? e.message : ultimo;
    }
    await dormir(500 * 2 ** intento);
  }
  throw new Error(ultimo);
}

interface LoteUI {
  etiqueta: string;
  total: number;
  id?: string;
  subidos: number;
  fallidos: number;
  fase: "pendiente" | "subiendo" | "iniciado" | "error";
  error?: string;
}

export function NuevoProceso() {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [ignorados, setIgnorados] = useState(0);
  const [carpeta, setCarpeta] = useState("");
  const [tamLote, setTamLote] = useState(String(TAMANO_LOTE_POR_DEFECTO));
  const [lotes, setLotes] = useState<LoteUI[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [terminoSubida, setTerminoSubida] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallidosRef = useRef<File[]>([]);
  const motivosRef = useRef<string[]>([]);
  const [hayFallidos, setHayFallidos] = useState(0);
  const [motivos, setMotivos] = useState<string[]>([]);
  const ocupado = useRef(false);

  // Fase E1: bandeja de fotos tomadas con la cámara (ya comprimidas, listas para subir).
  const esTactil = useSyncExternalStore(suscribirTactil, esTactilEnNavegador, esTactilEnServidor);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [comprimiendo, setComprimiendo] = useState(0);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const contadorFotos = useRef(0);
  // URLs de las miniaturas (URL.createObjectURL): ocupan memoria hasta revocarlas, así que se llevan aquí y se
  // revocan al quitar la foto, al procesarlas o al salir de la página.
  const urlsMiniaturas = useRef(new Set<string>());
  useEffect(() => {
    const urls = urlsMiniaturas.current;
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); };
  }, []);

  async function agregarFotos(lista: FileList | null) {
    const nuevas = [...(lista ?? [])];
    if (nuevas.length === 0) return;
    setErrorFoto(null);
    setComprimiendo((c) => c + nuevas.length);
    for (const original of nuevas) {
      const n = ++contadorFotos.current;
      try {
        const archivo = await comprimirFoto(original, n);
        const url = URL.createObjectURL(archivo);
        urlsMiniaturas.current.add(url);
        setFotos((fs) => [...fs, { id: n, archivo, original: original.size, url }]);
      } catch (e) {
        // FormatoNoLegible trae el mensaje para la persona (p. ej., HEIC): mejor avisar aquí que recibir un 415.
        setErrorFoto(e instanceof Error ? e.message : "No se pudo preparar la foto");
      } finally {
        setComprimiendo((c) => c - 1);
      }
    }
  }

  function soltarMiniaturas(lista: Foto[]) {
    for (const f of lista) { URL.revokeObjectURL(f.url); urlsMiniaturas.current.delete(f.url); }
  }

  function quitarFoto(id: number) {
    soltarMiniaturas(fotos.filter((f) => f.id === id));
    setFotos((fs) => fs.filter((f) => f.id !== id));
  }

  function procesarFotos() {
    if (ocupado.current || fotos.length === 0) return;
    const lista = fotos.map((f) => f.archivo);
    const cuando = new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    soltarMiniaturas(fotos);
    setFotos([]);
    // Mismo camino que «Elegir archivos»; todas las fotos en UN lote (no se divide por «Facturas por lote»).
    void empezar(lista, `Fotos del ${cuando}`, lista.length);
  }

  const idsSesion = useMemo(() => new Set(lotes.map((l) => l.id).filter((x): x is string => Boolean(x))), [lotes]);
  const { datos } = useMetricas(idsSesion.size > 0 ? 5000 : null);
  const lotesVivos = (datos?.lotes ?? []).filter((l) => idsSesion.has(l.id));
  const procesando = lotesVivos.some((l) => l.estado === "ejecutando");

  function elegir(lista: FileList | null) {
    const todos = [...(lista ?? [])];
    const imagenes = todos.filter((f) => EXTENSIONES_IMAGEN.test(f.name));
    imagenes.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name));
    setArchivos(imagenes);
    setIgnorados(todos.length - imagenes.length);
    setCarpeta(imagenes[0]?.webkitRelativePath.split("/")[0] ?? "Archivos");
    setError(null);
    setTerminoSubida(false);
  }

  const tam = Math.max(0, Math.floor(Number(tamLote)) || 0);
  const nLotes = tam > 0 ? Math.ceil(archivos.length / tam) : archivos.length > 0 ? 1 : 0;
  const bytes = archivos.reduce((a, f) => a + f.size, 0);

  function parche(i: number, p: Partial<LoteUI>) {
    setLotes((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  }

  async function subirLote(i: number, trozo: File[], etiqueta: string) {
    parche(i, { fase: "subiendo" });
    const r = await fetch("/api/procesos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ carpeta: etiqueta }) });
    if (!r.ok) throw new Error("No se pudo crear el lote");
    const { id } = (await r.json()) as { id: string };
    parche(i, { id });

    let siguiente = 0, subidos = 0, fallidos = 0;
    const trabajador = async () => {
      while (siguiente < trozo.length) {
        const k = siguiente++;
        const f = trozo[k];
        try {
          await subirImagen(id, k + 1, f);
          subidos++;
        } catch (e) {
          fallidos++;
          fallidosRef.current.push(f);
          motivosRef.current.push(`${f.name}: ${e instanceof Error ? e.message : "error"}`);
        }
        parche(i, { subidos, fallidos });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA_SUBIDA, trozo.length) }, trabajador));
    if (subidos === 0) { parche(i, { fase: "error", error: "No se pudo subir ningún archivo" }); return; }

    const ini = await fetch(`/api/procesos/${id}/iniciar`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    if (!ini.ok) throw new Error(((await ini.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo iniciar el lote");
    parche(i, { fase: "iniciado" });
    window.dispatchEvent(new CustomEvent("lote-iniciado", { detail: { id } })); // el motor lo toma de inmediato
  }

  /** `porLote`: facturas por lote; por defecto el campo «Facturas por lote» (las fotos lo fijan a todas). */
  async function empezar(lista: File[], nombre: string, porLote: number = tam) {
    if (ocupado.current || lista.length === 0) return;
    ocupado.current = true;
    setError(null);
    setSubiendo(true);
    setTerminoSubida(false);
    fallidosRef.current = [];
    motivosRef.current = [];
    setHayFallidos(0);
    setMotivos([]);
    const t = porLote > 0 ? porLote : lista.length;
    const trozos: File[][] = [];
    for (let k = 0; k < lista.length; k += t) trozos.push(lista.slice(k, k + t));
    setLotes(trozos.map((z, k) => ({
      etiqueta: trozos.length > 1 ? `${nombre} (parte ${k + 1} de ${trozos.length})` : nombre,
      total: z.length, subidos: 0, fallidos: 0, fase: "pendiente",
    })));
    try {
      // Un lote tras otro: mientras se sube el siguiente, el motor ya procesa los anteriores.
      for (let k = 0; k < trozos.length; k++) {
        const etiqueta = trozos.length > 1 ? `${nombre} (parte ${k + 1} de ${trozos.length})` : nombre;
        try {
          await subirLote(k, trozos[k], etiqueta);
        } catch (e) {
          parche(k, { fase: "error", error: e instanceof Error ? e.message : "Error" });
        }
      }
    } finally {
      setHayFallidos(fallidosRef.current.length);
      setMotivos(motivosRef.current.slice(0, 3));
      setSubiendo(false);
      setTerminoSubida(true);
      ocupado.current = false;
    }
  }

  const ordenado = useMemo(() => lotes, [lotes]);

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-borde bg-superficie p-5">
      <div>
        <h2 className="text-lg font-semibold">1. Elige las facturas</h2>
        <p className="text-sm text-texto2">
          Imágenes .png o .jpg. Puedes elegir una carpeta completa (incluso 1000 facturas): se divide en lotes y cada lote tiene sus métricas.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className={`${botonPrimario} cursor-pointer ${subiendo ? "pointer-events-none opacity-40" : ""}`}>
          Elegir carpeta…
          <input
            type="file" multiple className="sr-only" disabled={subiendo}
            // @ts-expect-error webkitdirectory no está en los tipos de React pero lo soportan los navegadores
            webkitdirectory=""
            onChange={(e) => { elegir(e.target.files); e.target.value = ""; }}
            data-testid="carpeta"
          />
        </label>
        <label className={`${botonSecundario} cursor-pointer ${subiendo ? "pointer-events-none opacity-40" : ""}`}>
          Elegir archivos…
          <input
            type="file" multiple accept="image/png,image/jpeg" className="sr-only" disabled={subiendo}
            onChange={(e) => { elegir(e.target.files); e.target.value = ""; }}
            data-testid="archivos"
          />
        </label>
        {esTactil && (
          <label className={`${botonSecundario} cursor-pointer ${subiendo ? "pointer-events-none opacity-40" : ""}`}>
            Tomar fotos…
            <input
              type="file" accept="image/*" capture="environment" multiple className="sr-only" disabled={subiendo}
              onChange={(e) => { void agregarFotos(e.target.files); e.target.value = ""; }}
              data-testid="camara"
            />
          </label>
        )}
      </div>

      {(fotos.length > 0 || comprimiendo > 0) && (
        <div className="flex flex-col gap-3 rounded-md bg-pista/50 p-4" data-testid="bandeja-fotos">
          <p className="cifra" aria-live="polite">
            <b>{num(fotos.length)}</b> {fotos.length === 1 ? "foto" : "fotos"}
            {fotos.length > 0 && (
              <span className="text-texto2">
                {" "}· {peso(fotos.reduce((a, f) => a + f.original, 0))} originales → {peso(fotos.reduce((a, f) => a + f.archivo.size, 0))} para subir
              </span>
            )}
            {comprimiendo > 0 && <span className="ml-2 inline-flex items-center gap-1 text-texto2"><Girando className="text-acento" /> Preparando {num(comprimiendo)}…</span>}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fotos.map((f, i) => (
              <li key={f.id} className="flex flex-col gap-2 rounded-md border border-borde bg-superficie p-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local (URL de objeto), no pasa por el optimizador de Next */}
                <img src={f.url} alt={`Foto ${i + 1}`} className="aspect-[3/4] w-full rounded object-cover" />
                <span className="cifra">{i + 1}. {peso(f.original)} → {peso(f.archivo.size)}</span>
                <button className={botonSecundario} onClick={() => quitarFoto(f.id)} aria-label={`Quitar la foto ${i + 1}`}>Quitar</button>
              </li>
            ))}
          </ul>
          <button
            onClick={procesarFotos} disabled={subiendo || comprimiendo > 0 || fotos.length === 0}
            className={`${botonPrimario} self-start`} data-testid="procesar-fotos"
          >
            Procesar {fotos.length === 1 ? "esta foto" : `estas ${num(fotos.length)} fotos`}
          </button>
          <p className="text-xs text-texto2">
            Una foto con sombras, arrugas o en ángulo se lee peor que una imagen escaneada: es normal que más facturas pasen a revisión.
          </p>
        </div>
      )}

      {errorFoto && <p role="alert" className="text-sm text-malo">{errorFoto}</p>}

      {archivos.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-md bg-pista/50 p-4">
          <p className="cifra">
            <b>{num(archivos.length)}</b> imágenes en «{carpeta}» · {mb(bytes)} MB
            {ignorados > 0 ? <span className="text-texto2"> · {num(ignorados)} archivos que no son imagen se ignoran</span> : null}
          </p>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Facturas por lote
            <input
              type="number" min={0} value={tamLote} onChange={(e) => setTamLote(e.target.value)} disabled={subiendo}
              className="cifra w-24 rounded-md border border-borde bg-superficie px-2 py-1"
            />
            <span className="text-texto2">
              → {num(nLotes)} {nLotes === 1 ? "lote" : "lotes"} (0 = todo en un solo lote)
            </span>
          </label>
          <p className="text-xs text-texto2">
            Cada factura usa unas 5 lecturas y 6 escrituras de Firestore (plan gratuito: 50 000 lecturas al día): {num(archivos.length)} facturas ≈ {num(archivos.length * 5)} lecturas.
            Procesar toma unos 1,5 s por factura; la pestaña debe seguir abierta.
          </p>
          <button
            onClick={() => empezar(archivos, carpeta)} disabled={subiendo || archivos.length === 0}
            className={`${botonPrimario} self-start`} data-testid="procesar"
          >
            {subiendo ? <><Girando /> Subiendo…</> : `Subir y procesar ${num(archivos.length)} facturas`}
          </button>
        </div>
      ) : fotos.length === 0 && comprimiendo === 0 ? (
        <p className="text-sm text-texto2">Aún no has elegido nada.</p>
      ) : null}

      {error && <p role="alert" className="text-sm text-malo">{error}</p>}

      {ordenado.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">2. Avance de los lotes</h2>
          <ul className="flex flex-col gap-3">
            {ordenado.map((l, i) => {
              const vivo = lotesVivos.find((v) => v.id === l.id);
              const hechas = vivo ? procesadasDe(vivo) : 0;
              return (
                <li key={i} className="flex flex-col gap-2 rounded-md border border-borde p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{l.etiqueta} · {num(l.total)} imágenes</span>
                    <span className="inline-flex items-center gap-1 text-texto2">
                      {l.fase === "error" ? <><IconoMal className="text-malo" /> {l.error}</> :
                        l.fase === "pendiente" ? "En espera" :
                        l.fase === "subiendo" ? <><Girando className="text-acento" /> Subiendo</> :
                        vivo?.estado === "terminado" ? <><IconoOk className="text-bueno" /> Terminado</> :
                        <><Girando className="text-acento" /> Procesando</>}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Progreso valor={l.subidos + l.fallidos} max={l.total} etiqueta={`Subida de ${l.etiqueta}`} />
                      <p className="cifra mt-1 text-xs text-texto2">Subida {num(l.subidos)} de {num(l.total)}{l.fallidos ? ` · ${l.fallidos} fallaron` : ""}</p>
                    </div>
                    <div>
                      <Progreso valor={hechas} max={vivo?.totalArchivos ?? l.total} etiqueta={`Procesamiento de ${l.etiqueta}`} />
                      <p className="cifra mt-1 text-xs text-texto2">Procesadas {num(hechas)} de {num(vivo?.totalArchivos ?? l.total)}</p>
                    </div>
                  </div>
                  {l.id && <Link className="text-xs underline" href={`/procesos/${l.id}`}>Ver detalle y facturas</Link>}
                </li>
              );
            })}
          </ul>

          {lotesVivos.length > 0 && <ResumenEnVivo lotes={lotesVivos} titulo={procesando ? "Procesado hasta ahora (en vivo)" : "Total procesado en esta carga"} />}

          {terminoSubida && hayFallidos > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-aviso p-3 text-sm">
              <span>
                {num(hayFallidos)} archivos no se pudieron subir.
                {motivos.length > 0 && <span className="mt-1 block text-xs text-texto2">Por ejemplo: {motivos.join(" · ")}</span>}
              </span>
              <button className={botonSecundario} onClick={() => empezar([...fallidosRef.current], `${carpeta} (reintento)`)}>Reintentar esos archivos</button>
            </div>
          )}
          {terminoSubida && (
            <p className="text-sm">
              Subida completa. {procesando ? "El procesamiento sigue en segundo plano: puedes cambiar de pestaña." : ""}{" "}
              <Link className="font-medium underline" href="/metricas">Ver métricas →</Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
