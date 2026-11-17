import { Suspense } from "react";
import { CargandoPagina } from "@/componentes/ui";
import { VistaProceso } from "@/componentes/VistaProceso";

export default function PaginaProceso({ params }: PageProps<"/procesos/[id]">) {
  return (
    <Suspense fallback={<CargandoPagina />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/procesos/[id]">["params"] }) {
  const { id } = await params;
  return <VistaProceso id={id} />;
}
