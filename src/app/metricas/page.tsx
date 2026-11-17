import { PanelMetricas } from "@/componentes/PanelMetricas";
import { EncabezadoPagina } from "@/componentes/ui";

export default function Metricas() {
  return (
    <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col gap-6 px-4 py-8">
      <EncabezadoPagina titulo="Métricas">
        Cuánto se ha procesado (por razón social, antes de IVA, IVA e impoconsumo) y qué tan bien se leyeron las facturas, por lote o en total.
      </EncabezadoPagina>
      <PanelMetricas />
    </main>
  );
}
