import { ReporteIva } from "@/componentes/ReporteIva";

export default function Reportes() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Reportes</h1>
        <p className="mt-2 text-texto2">
          IVA por bimestre: base gravable, IVA, impoconsumo y total de las facturas procesadas, para preparar la declaración.
        </p>
      </header>
      <ReporteIva />
    </main>
  );
}
