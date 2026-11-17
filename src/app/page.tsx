import Link from "next/link";
import { BorrarTodo } from "@/componentes/BorrarTodo";
import { ListaProcesos } from "@/componentes/ListaProcesos";
import { NuevoProceso } from "@/componentes/NuevoProceso";
import { SoloEscritura } from "@/componentes/Rol";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Procesar facturas</h1>
        <p className="mt-2 text-texto2">
          Sube las imágenes: la app las lee con OCR, valida cada cifra, guarda los datos y genera un Excel por lote.
        </p>
      </header>
      {/* Fase E4: la demo no sube ni borra (el servidor respondería 403); en su lugar, qué puede mirar. */}
      <SoloEscritura
        enDemo={
          <section className="rounded-lg border border-borde bg-superficie p-5 text-sm" data-testid="demo-inicio">
            <h2 className="text-lg font-semibold">Modo demo</h2>
            <p className="mt-1 text-texto2">
              En la demo no se pueden subir facturas. Abajo están los lotes ya procesados: abre su detalle y descarga su Excel.
              También puedes ver <Link className="underline" href="/metricas">Métricas</Link>, <Link className="underline" href="/revision">Revisión</Link> y <Link className="underline" href="/reportes">Reportes</Link>.
            </p>
          </section>
        }
      >
        <NuevoProceso />
      </SoloEscritura>
      <ListaProcesos />
      <SoloEscritura>
        <BorrarTodo />
      </SoloEscritura>
    </main>
  );
}
