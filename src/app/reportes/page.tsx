import { ReporteIva } from "@/componentes/ReporteIva";
import { EncabezadoPagina } from "@/componentes/ui";

export default function Reportes() {
  return (
    <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col gap-6 px-4 py-8">
      <EncabezadoPagina titulo="Reportes">
        IVA por bimestre: base gravable, IVA, impoconsumo y total de las facturas procesadas, para preparar la declaración.
      </EncabezadoPagina>
      <ReporteIva />
    </main>
  );
}
