import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { exigirUsuario } from "@/lib/auth/sesion";
import { agregarHojaIva } from "@/lib/excel/generar";
import { firestore } from "@/lib/firebase/admin";
import { COLECCIONES, type Proceso } from "@/lib/modelo/tipos";
import { importesVacios, sinDatosPorPeriodo, sumarMetricas } from "@/lib/procesamiento/metricas";
import { periodosDelAnio } from "@/lib/reportes/periodos";

/**
 * Fase E2 · Excel del reporte de IVA de un año (`?anio=2026`), con solo la hoja «IVA por periodo».
 * Igual que /api/metricas: suma los contadores de los lotes del usuario (1 lectura por lote), sin recorrer facturas.
 * Muestra los 6 bimestres aunque alguno esté en 0, y avisa si hay lotes antiguos sin datos por periodo.
 */
export async function GET(request: NextRequest) {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) return usuario;
  const anio = Number(request.nextUrl.searchParams.get("anio"));
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return Response.json({ error: "Indica un año válido (?anio=2026)" }, { status: 400 });

  const procesos = await firestore().collection(COLECCIONES.procesos).where("uid", "==", usuario.uid).limit(200).get();
  const metricas = procesos.docs
    .map((d) => d.data() as Proceso)
    .filter((p) => p.estado === "ejecutando" || p.estado === "terminado")
    .map((p) => p.metricas);
  const total = sumarMetricas(metricas);
  const sinDatos = metricas.filter(sinDatosPorPeriodo).length;
  const periodos = periodosDelAnio(anio).map((clave) => [clave, total.porPeriodo?.[clave] ?? importesVacios()] as [string, ReturnType<typeof importesVacios>]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Procesador de facturas";
  agregarHojaIva(wb, periodos, sinDatos > 0
    ? `Aviso: ${sinDatos} ${sinDatos === 1 ? "lote procesado" : "lotes procesados"} antes de este reporte no ${sinDatos === 1 ? "está incluido" : "están incluidos"} (recalcúlalos con scripts/recalcular-metricas.ts).`
    : undefined);
  return new Response(new Uint8Array(await wb.xlsx.writeBuffer()), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="iva_por_periodo_${anio}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
