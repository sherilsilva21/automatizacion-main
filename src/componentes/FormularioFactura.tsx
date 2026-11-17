"use client";

// Revisión manual de UNA factura que la máquina no pudo aceptar: la imagen a un lado, los datos que el OCR
// alcanzó a leer ya precargados y un formulario para completarlos o corregirlos. Valida en vivo con las MISMAS
// reglas del servidor (validar + esquema); si algo no cuadra, la persona debe confirmar que revisó la imagen.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { aEntero, aParcial, soloDigitos, totalesSugeridos, type DatosManuales } from "@/lib/procesamiento/correccion";
import { esquemaDatosManuales } from "@/lib/procesamiento/correccion-esquema";
import { validar } from "@/lib/ocr/validador";
import { camposAplicables } from "@/lib/ia/campos";
import type { CampoIa, Sugerencias } from "@/lib/ia/sugerir";
import { cop } from "./formato";
import { useRol } from "./Rol";
import { Girando, IconoMal, IconoOk, botonPrimario, botonSecundario } from "./ui";

interface ItemCampo { descripcion: string; cantidad: string; precio: string }
type Total = "subtotal" | "iva" | "impoconsumo" | "total";
interface Cargada {
  hash: string; archivo: string; procesoId: string; estado: "aceptada" | "revision"; motivos: string[]; motivosOriginales: string[];
  confianzaOcr: number; corregidaManualmente: boolean; corregidaPor: string | null;
  /** Fase E3: hay una clave de IA configurada y la factura espera revisión. */
  iaDisponible?: boolean;
  datos: {
    numero: string; fecha: string; proveedor: string; nitProveedor: string; dvProveedor: number | null; clienteDocumento: string; clienteDv: number | null;
    clienteNombre: string; items: { descripcion: string; cantidad: number; precioUnitario: number }[];
    subtotal: number | null; iva: number | null; impoconsumo: number | null; total: number | null;
  };
}

const ENTRADA = "w-full rounded-md border border-borde bg-superficie px-2 py-1.5";
const ZOOMS = [1, 1.6, 2.4, 3.4];

function Campo({ etiqueta, children, ayuda, ia = false }: { etiqueta: string; children: React.ReactNode; ayuda?: string; ia?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex flex-wrap items-center gap-2 font-medium">
        {etiqueta}
        {/* Fase E3: el valor vino de la IA y la persona no lo ha cambiado (texto + color: nunca solo color). */}
        {ia && <span className="rounded-full border border-manual bg-manual-suave px-2 text-xs font-normal" data-testid="sugerido-ia">sugerido por IA</span>}
      </span>
      {children}
      {ayuda && <span className="text-xs text-texto2">{ayuda}</span>}
    </label>
  );
}

export function FormularioFactura({ hash }: { hash: string }) {
  const router = useRouter();
  // Fase E4: la demo ve el formulario pero no puede cambiarlo ni guardarlo (el servidor respondería 403).
  const soloLectura = useRol().rol !== "completo";
  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  // Giro de la imagen en grados (lo hace el servidor): para facturas fotografiadas de lado.
  const [giro, setGiro] = useState(0);

  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [nit, setNit] = useState("");
  const [dvNit, setDvNit] = useState("");
  const [docCliente, setDocCliente] = useState("");
  const [dvCliente, setDvCliente] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [items, setItems] = useState<ItemCampo[]>([]);
  const [aplicaInc, setAplicaInc] = useState(false);
  const [totales, setTotales] = useState<Partial<Record<Total, string>>>({}); // lo que la persona escribió a mano
  const [confirmo, setConfirmo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string; detalles?: string[] } | null>(null);
  // Fase E3: valor que puso la IA en cada campo (para marcarlo y para saber si la persona lo aceptó sin cambiarlo).
  const [aplicadoIa, setAplicadoIa] = useState<Partial<Record<CampoIa, string>>>({});
  const [ia, setIa] = useState<{ estado: "inactiva" | "pidiendo" | "lista" | "error"; texto?: string }>({ estado: "inactiva" });

  // Carga la factura y precarga el formulario con lo que la máquina alcanzó a leer.
  useEffect(() => {
    let vivo = true;
    fetch(`/api/facturas/${hash}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "No se encontró esta factura (¿ya no existe o es de otro usuario?)" : `Error ${r.status}`);
        return (await r.json()) as Cargada;
      })
      .then((c) => {
        if (!vivo) return;
        const d = c.datos;
        setCargada(c);
        setNumero(d.numero); setFecha(d.fecha); setProveedor(d.proveedor); setNit(d.nitProveedor);
        setDvNit(d.dvProveedor === null ? "" : String(d.dvProveedor)); setDocCliente(d.clienteDocumento);
        setDvCliente(d.clienteDv === null ? "" : String(d.clienteDv)); setNombreCliente(d.clienteNombre);
        // Una factura con error del OCR no trae ítems: siempre debe haber al menos una fila para escribirlos.
        setItems(d.items.length > 0 ? d.items.map((i) => ({ descripcion: i.descripcion, cantidad: String(i.cantidad), precio: String(i.precioUnitario) })) : [{ descripcion: "", cantidad: "1", precio: "" }]);
        setAplicaInc((d.impoconsumo ?? 0) > 0);
        const leidos: Partial<Record<Total, string>> = {};
        for (const k of ["subtotal", "iva", "impoconsumo", "total"] as const) if (d[k] !== null && d[k] !== 0) leidos[k] = String(d[k]);
        setTotales(leidos);
      })
      .catch((e: unknown) => vivo && setErrorCarga(e instanceof Error ? e.message : "Error"));
    return () => { vivo = false; };
  }, [hash]);

  const itemsNum = useMemo(
    () => items.map((i) => ({ descripcion: i.descripcion.trim(), cantidad: aEntero(i.cantidad), precioUnitario: aEntero(i.precio), subtotal: aEntero(i.cantidad) * aEntero(i.precio) })),
    [items],
  );
  const sugeridos = useMemo(() => totalesSugeridos(itemsNum, aplicaInc), [itemsNum, aplicaInc]);
  const valor = (k: Total): number => (totales[k] !== undefined ? aEntero(totales[k]!) : sugeridos[k]);
  const mostrar = (k: Total): string => totales[k] ?? String(sugeridos[k]);

  const datos: DatosManuales = {
    numero: numero.trim().toUpperCase(), fecha, proveedor: proveedor.trim(), nitProveedor: soloDigitos(nit), dvProveedor: dvNit === "" ? NaN : Number(dvNit),
    clienteDocumento: soloDigitos(docCliente), clienteDv: dvCliente === "" ? NaN : Number(dvCliente), clienteNombre: nombreCliente.trim(),
    items: itemsNum, subtotal: valor("subtotal"), iva: valor("iva"), impoconsumo: aplicaInc ? valor("impoconsumo") : 0, total: valor("total"),
  };
  const formato = esquemaDatosManuales.safeParse(datos);
  const problemasFormato = formato.success ? [] : [...new Set(formato.error.issues.map((i) => i.message))];
  // Las mismas reglas de negocio que el OCR (IVA 19 %, sumas, dígito de verificación…).
  const motivos = formato.success ? validar(aParcial(datos)) : [];
  const puedeGuardar = formato.success && !guardando && (motivos.length === 0 || confirmo);

  // ── Fase E3 · asistente de IA ──
  /** Valor actual de cada campo, como texto, para compararlo con lo que sugirió la IA. */
  const valorActual = (k: CampoIa): string => {
    switch (k) {
      case "numero": return numero;
      case "fecha": return fecha;
      case "proveedor": return proveedor;
      case "nitProveedor": return nit;
      case "dvProveedor": return dvNit;
      case "clienteDocumento": return docCliente;
      case "clienteDv": return dvCliente;
      case "clienteNombre": return nombreCliente;
      case "items": return JSON.stringify(items);
      default: return totales[k] ?? "";
    }
  };
  const esIa = (k: CampoIa) => aplicadoIa[k] !== undefined && valorActual(k) === aplicadoIa[k];
  const entrada = (k: CampoIa, extra = "") => `${ENTRADA} ${extra} ${esIa(k) ? "border-manual bg-manual-suave" : ""}`;

  async function pedirSugerencia() {
    setIa({ estado: "pidiendo" });
    try {
      const r = await fetch(`/api/facturas/${hash}/sugerir${giro ? `?rotar=${giro}` : ""}`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { sugerencias?: Sugerencias; msIa?: number; msOcr?: number; error?: string };
      if (!r.ok || !d.sugerencias) { setIa({ estado: "error", texto: d.error ?? "La IA no respondió; completa los campos a mano" }); return; }
      const s = d.sugerencias;
      // Un campo está «vacío» si no tiene valor; los totales, si la persona no los escribió (se calculan desde los ítems).
      const itemsVacios = items.every((i) => !i.descripcion.trim() && !i.precio.trim());
      const vacio = (k: CampoIa) => (k === "items" ? itemsVacios : valorActual(k).trim() === "");
      const aplicar = camposAplicables(Object.keys(s) as CampoIa[], vacio, [...problemasFormato, ...motivos]);
      const puestos: Partial<Record<CampoIa, string>> = {};
      for (const k of aplicar) {
        if (k === "items" && s.items) {
          const nuevos = s.items.map((i) => ({ descripcion: i.descripcion, cantidad: String(i.cantidad), precio: String(i.precioUnitario) }));
          setItems(nuevos);
          puestos.items = JSON.stringify(nuevos);
          continue;
        }
        const v = s[k];
        if (v === undefined || typeof v === "object") continue;
        const texto = String(v);
        puestos[k] = texto;
        if (k === "numero") setNumero(texto);
        else if (k === "fecha") setFecha(texto);
        else if (k === "proveedor") setProveedor(texto);
        else if (k === "nitProveedor") setNit(texto);
        else if (k === "dvProveedor") setDvNit(texto);
        else if (k === "clienteDocumento") setDocCliente(texto);
        else if (k === "clienteDv") setDvCliente(texto);
        else if (k === "clienteNombre") setNombreCliente(texto);
        else {
          setTotales((t) => ({ ...t, [k]: texto }));
          if (k === "impoconsumo" && Number(v) > 0) setAplicaInc(true);
        }
      }
      setAplicadoIa((a) => ({ ...a, ...puestos }));
      const n = Object.keys(puestos).length;
      const segundos = (((d.msIa ?? 0) + (d.msOcr ?? 0)) / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 });
      setIa({ estado: "lista", texto: n > 0
        ? `La IA sugirió ${n} ${n === 1 ? "campo" : "campos"} (marcados «sugerido por IA») en ${segundos} s. Compáralos con la imagen antes de guardar.`
        : "La IA no encontró nada nuevo para los campos vacíos o con error." });
    } catch {
      setIa({ estado: "error", texto: "La IA no respondió; completa los campos a mano" });
    }
  }

  const siguiente = useCallback(async () => {
    const r = await fetch("/api/facturas", { cache: "no-store" }).then((x) => (x.ok ? x.json() : { facturas: [] })).catch(() => ({ facturas: [] }));
    const otra = (r as { facturas: { hash: string }[] }).facturas.find((f) => f.hash !== hash);
    router.push(otra ? `/revision/${otra.hash}` : "/revision");
  }, [hash, router]);

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const r = await fetch(`/api/facturas/${hash}`, {
        method: "PUT", headers: { "content-type": "application/json" },
        // camposSugeridosIa: solo los que la persona dejó tal como los sugirió la IA (Fase E3).
        body: JSON.stringify({ datos: { ...datos, impoconsumo: datos.impoconsumo }, confirmado: confirmo, camposSugeridosIa: (Object.keys(aplicadoIa) as CampoIa[]).filter(esIa) }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; motivos?: string[]; problemas?: string[] };
      if (!r.ok) { setMensaje({ tipo: "error", texto: d.error ?? `Error ${r.status}`, detalles: d.motivos ?? d.problemas }); return; }
      setMensaje({ tipo: "ok", texto: "Factura guardada. Pasando a la siguiente pendiente…" });
      setTimeout(() => void siguiente(), 900);
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : "Error de red" });
    } finally {
      setGuardando(false);
    }
  }

  if (errorCarga) return <main className="mx-auto max-w-3xl px-4 py-10"><p role="alert" className="text-malo">{errorCarga}</p><p className="mt-3"><Link className="underline" href="/revision">← Volver a la lista</Link></p></main>;
  if (!cargada) return <main className="mx-auto max-w-3xl px-4 py-10 text-texto2">Cargando la factura…</main>;

  const marcar = (k: Total, v: string) => setTotales((t) => ({ ...t, [k]: v }));
  const cambiarItem = (i: number, campo: keyof ItemCampo, v: string) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, [campo]: v } : x)));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
      <p className="mb-3 text-sm"><Link className="underline" href="/revision">← Facturas pendientes</Link></p>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {/* min-w-0 + overflow-wrap: los nombres de las fotos (foto_20261117_102316_3.jpg) no tienen espacios y, sin esto,
            se salían de la pantalla en el celular. */}
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight">Revisar factura <span className="text-texto2 [overflow-wrap:anywhere]">{cargada.archivo}</span></h1>
        {cargada.corregidaManualmente && <span className="rounded-full border border-borde px-3 py-0.5 text-sm">ya corregida por {cargada.corregidaPor}: puedes volver a editarla</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Imagen original ── */}
        <section aria-label="Imagen original de la factura" className="flex flex-col gap-2 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className={botonSecundario} onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Alejar">−</button>
            <span className="cifra w-14 text-center">{Math.round(ZOOMS[zoom] * 100)} %</span>
            <button className={botonSecundario} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Acercar">+</button>
            <button className={botonSecundario} onClick={() => setGiro((g) => (g + 270) % 360)} aria-label="Girar a la izquierda" title="Girar a la izquierda">↺</button>
            <button className={botonSecundario} onClick={() => setGiro((g) => (g + 90) % 360)} aria-label="Girar a la derecha" title="Girar a la derecha">↻</button>
            <a className="ml-auto underline" href={`/api/facturas/${hash}/imagen${giro ? `?rotar=${giro}` : ""}`} target="_blank" rel="noreferrer">Abrir en otra pestaña</a>
          </div>
          <div className="max-h-[75vh] overflow-auto rounded-lg border border-borde bg-pista/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- la imagen sale de una ruta autenticada, no del optimizador de Next */}
            <img src={`/api/facturas/${hash}/imagen${giro ? `?rotar=${giro}` : ""}`} alt={`Factura ${cargada.archivo}`} style={{ width: `${ZOOMS[zoom] * 100}%`, maxWidth: "none" }} className="block" data-testid="imagen" />
          </div>
          {(cargada.motivosOriginales.length > 0 ? cargada.motivosOriginales : cargada.motivos).length > 0 && (
            <div className="rounded-lg border border-aviso p-3 text-sm">
              <b>Por qué quedó en revisión:</b>
              <ul className="mt-1 list-disc pl-5 text-texto2">
                {(cargada.motivosOriginales.length > 0 ? cargada.motivosOriginales : cargada.motivos).slice(0, 5).map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* ── Formulario ── */}
        <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (puedeGuardar && !soloLectura) void guardar(); }} noValidate>
          {cargada.iaDisponible && (
            <section aria-labelledby="h-ia" className="flex flex-col gap-2 rounded-lg border border-manual bg-manual-suave p-4 text-sm" data-testid="asistente-ia">
              <h2 id="h-ia" className="font-semibold">Asistente de IA</h2>
              <p>
                El texto de esta factura (leído por OCR, sin la imagen) <b>se enviará a un servicio externo de IA</b>. Solo rellena
                campos vacíos o con error, y tú decides: compara cada sugerencia con la imagen antes de guardar.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={botonSecundario} onClick={() => void pedirSugerencia()} disabled={ia.estado === "pidiendo" || guardando} data-testid="sugerir-ia">
                  {ia.estado === "pidiendo" ? <><Girando className="text-acento" /> Pidiendo sugerencias…</> : "Sugerir con IA"}
                </button>
                {ia.texto && <span role={ia.estado === "error" ? "alert" : "status"} className={ia.estado === "error" ? "text-malo" : ""} data-testid="ia-estado">{ia.texto}</span>}
              </div>
            </section>
          )}
          {/* `contents`: este fieldset solo agrupa para poder desactivar TODOS los campos de una vez en la demo. */}
          <fieldset disabled={soloLectura} className="contents">
          <fieldset className="grid gap-3 rounded-lg border border-borde bg-superficie p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Factura</legend>
            <Campo etiqueta="Número" ia={esIa("numero")}><input className={entrada("numero")} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="FE-000123" data-testid="f-numero" /></Campo>
            <Campo etiqueta="Fecha de emisión" ia={esIa("fecha")}><input type="date" className={entrada("fecha")} value={fecha} onChange={(e) => setFecha(e.target.value)} data-testid="f-fecha" /></Campo>
            <div className="sm:col-span-2"><Campo etiqueta="Razón social del proveedor" ia={esIa("proveedor")}><input className={entrada("proveedor")} value={proveedor} onChange={(e) => setProveedor(e.target.value)} data-testid="f-proveedor" /></Campo></div>
            <Campo etiqueta="NIT del proveedor" ayuda="Sin puntos ni guion, sin el dígito de verificación" ia={esIa("nitProveedor")}>
              <input className={entrada("nitProveedor")} inputMode="numeric" value={nit} onChange={(e) => setNit(e.target.value)} data-testid="f-nit" />
            </Campo>
            <Campo etiqueta="Dígito de verificación" ia={esIa("dvProveedor")}><input className={entrada("dvProveedor")} inputMode="numeric" maxLength={1} value={dvNit} onChange={(e) => setDvNit(soloDigitos(e.target.value))} data-testid="f-dv-nit" /></Campo>
          </fieldset>

          <fieldset className="grid gap-3 rounded-lg border border-borde bg-superficie p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Cliente</legend>
            <Campo etiqueta="Documento (NIT o CC)" ayuda="Sin puntos ni guion, sin el dígito de verificación" ia={esIa("clienteDocumento")}>
              <input className={entrada("clienteDocumento")} inputMode="numeric" value={docCliente} onChange={(e) => setDocCliente(e.target.value)} data-testid="f-doc-cliente" />
            </Campo>
            <Campo etiqueta="Dígito de verificación" ia={esIa("clienteDv")}><input className={entrada("clienteDv")} inputMode="numeric" maxLength={1} value={dvCliente} onChange={(e) => setDvCliente(soloDigitos(e.target.value))} data-testid="f-dv-cliente" /></Campo>
            <div className="sm:col-span-2"><Campo etiqueta="Nombre o razón social del cliente" ia={esIa("clienteNombre")}><input className={entrada("clienteNombre")} value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} data-testid="f-nombre-cliente" /></Campo></div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-borde bg-superficie p-4">
            <legend className="px-1 text-sm font-semibold">Ítems{esIa("items") && <span className="ml-2 rounded-full border border-manual bg-manual-suave px-2 text-xs font-normal" data-testid="sugerido-ia">sugeridos por IA</span>}</legend>
            {items.map((it, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-borde/70 p-3">
                <Campo etiqueta={`Ítem ${i + 1} · descripción`}><input className={ENTRADA} value={it.descripcion} onChange={(e) => cambiarItem(i, "descripcion", e.target.value)} data-testid={`i-desc-${i}`} /></Campo>
                <div className="grid grid-cols-[5rem_9rem_1fr_auto] items-end gap-2 max-sm:grid-cols-2">
                  <Campo etiqueta="Cantidad"><input className={`${ENTRADA} cifra`} inputMode="numeric" value={it.cantidad} onChange={(e) => cambiarItem(i, "cantidad", e.target.value)} data-testid={`i-cant-${i}`} /></Campo>
                  <Campo etiqueta="Precio unitario"><input className={`${ENTRADA} cifra`} inputMode="numeric" value={it.precio} onChange={(e) => cambiarItem(i, "precio", e.target.value)} data-testid={`i-precio-${i}`} /></Campo>
                  <p className="cifra pb-1.5 text-right text-sm text-texto2">Subtotal: <b className="text-foreground">{cop(itemsNum[i]?.subtotal ?? 0)}</b></p>
                  <button type="button" className="pb-1.5 text-sm underline" onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))} disabled={items.length === 1} aria-label={`Quitar el ítem ${i + 1}`}>quitar</button>
                </div>
              </div>
            ))}
            <button type="button" className={`${botonSecundario} self-start`} onClick={() => setItems((xs) => [...xs, { descripcion: "", cantidad: "1", precio: "" }])} data-testid="agregar-item">+ Agregar ítem</button>
          </fieldset>

          <fieldset className="grid gap-3 rounded-lg border border-borde bg-superficie p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Totales</legend>
            <Campo etiqueta="Valor antes de IVA" ia={esIa("subtotal")}><input className={entrada("subtotal", "cifra")} inputMode="numeric" value={mostrar("subtotal")} onChange={(e) => marcar("subtotal", e.target.value)} data-testid="f-subtotal" /></Campo>
            <Campo etiqueta="IVA (19 %)" ia={esIa("iva")}><input className={entrada("iva", "cifra")} inputMode="numeric" value={mostrar("iva")} onChange={(e) => marcar("iva", e.target.value)} data-testid="f-iva" /></Campo>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={aplicaInc} onChange={(e) => setAplicaInc(e.target.checked)} data-testid="f-aplica-inc" /> La factura trae impoconsumo (4 %: telefonía móvil y datos)</label>
            {aplicaInc && <Campo etiqueta="Impoconsumo" ia={esIa("impoconsumo")}><input className={entrada("impoconsumo", "cifra")} inputMode="numeric" value={mostrar("impoconsumo")} onChange={(e) => marcar("impoconsumo", e.target.value)} data-testid="f-impoconsumo" /></Campo>}
            <Campo etiqueta="Total" ia={esIa("total")}><input className={entrada("total", "cifra")} inputMode="numeric" value={mostrar("total")} onChange={(e) => marcar("total", e.target.value)} data-testid="f-total" /></Campo>
            <div className="flex items-end sm:col-span-2"><button type="button" className={botonSecundario} onClick={() => setTotales({})} data-testid="recalcular">Recalcular los totales desde los ítems</button></div>
          </fieldset>
          </fieldset>

          {/* ── Validación en vivo ── */}
          <section aria-live="polite" className="flex flex-col gap-2 rounded-lg border border-borde bg-superficie p-4" data-testid="validacion">
            <h2 className="text-sm font-semibold">Validación</h2>
            {problemasFormato.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">{problemasFormato.map((p) => <li key={p} className="flex items-start gap-2"><IconoMal className="mt-0.5 text-malo" /> {p}</li>)}</ul>
            ) : motivos.length === 0 ? (
              <p className="flex items-center gap-2 text-sm"><IconoOk className="text-bueno" /> Todas las validaciones pasan (IVA, sumas, dígitos de verificación).</p>
            ) : (
              <>
                <ul className="flex flex-col gap-1 text-sm">{motivos.map((m) => <li key={m} className="flex items-start gap-2"><IconoMal className="mt-0.5 text-malo" /> {m}</li>)}</ul>
                {!soloLectura && <label className="mt-1 flex items-start gap-2 rounded-md border border-aviso p-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} data-testid="confirmo" />
                  <span>Revisé la imagen y estos datos son los de la factura, aunque alguna validación no cuadre. <span className="text-texto2">(Queda registrado quién lo confirmó.)</span></span>
                </label>}
              </>
            )}
          </section>

          {mensaje && (
            <div role={mensaje.tipo === "error" ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${mensaje.tipo === "error" ? "border-malo text-malo" : "border-bueno"}`} data-testid="mensaje">
              {mensaje.texto}
              {mensaje.detalles && <ul className="mt-1 list-disc pl-5">{mensaje.detalles.map((x) => <li key={x}>{x}</li>)}</ul>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pb-8">
            {soloLectura ? (
              <p className="text-sm text-texto2" data-testid="demo-sin-guardar">Modo demo: puedes ver la factura y su validación, pero no guardar cambios.</p>
            ) : (
              <button type="submit" className={botonPrimario} disabled={!puedeGuardar} data-testid="guardar">
                {guardando ? "Guardando…" : motivos.length > 0 ? "Guardar de todos modos" : "Guardar factura"}
              </button>
            )}
            <button type="button" className={botonSecundario} onClick={() => void siguiente()} disabled={guardando}>Saltar a la siguiente</button>
          </div>
        </form>
      </div>
    </main>
  );
}
