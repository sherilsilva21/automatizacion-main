import Link from "next/link";
import { BorrarTodo } from "@/componentes/BorrarTodo";
import { ListaProcesos } from "@/componentes/ListaProcesos";
import { NuevoProceso } from "@/componentes/NuevoProceso";
import { SoloEscritura } from "@/componentes/Rol";
import { EncabezadoPagina, Tarjeta } from "@/componentes/ui";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col gap-6 px-4 py-8">
      <EncabezadoPagina titulo="Procesar facturas">
        Sube las imágenes: la app las lee con OCR, valida cada cifra, guarda los datos y genera un Excel por lote.
      </EncabezadoPagina>
      {/* Fase E4: la demo no sube ni borra (el servidor respondería 403); en su lugar, qué puede mirar. */}
      <SoloEscritura
        enDemo={
          <Tarjeta className="text-sm" data-testid="demo-inicio">
            <h2 className="text-lg font-semibold">Modo demo</h2>
            <p className="mt-1 text-tinta-suave">
              En la demo no se pueden subir facturas. Abajo están los lotes ya procesados: abre su detalle y descarga su Excel.
              También puedes ver <Link className="enlace" href="/metricas">Métricas</Link>,{" "}
              <Link className="enlace" href="/revision">Revisión</Link> y{" "}
              <Link className="enlace" href="/reportes">Reportes</Link>.
            </p>
          </Tarjeta>
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
