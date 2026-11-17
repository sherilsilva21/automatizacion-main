import { ListaRevision } from "@/componentes/ListaRevision";
import { EncabezadoPagina } from "@/componentes/ui";

export default function Revision() {
  return (
    <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col gap-6 px-4 py-8">
      <EncabezadoPagina titulo="Revisión de facturas">
        Las facturas que la máquina no pudo aceptar. Abre cada una, mira la imagen y completa o corrige los datos: con eso se cierra el ciclo de validación humana.
      </EncabezadoPagina>
      <ListaRevision />
    </main>
  );
}
