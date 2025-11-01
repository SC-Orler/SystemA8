// components/ReporteRendimientos.tsx
import React, { useMemo } from "react";
import { Card } from "./UI";

export default function ReporteRendimientos({ empaques }: { empaques: any[] }) {
  const resumen = useMemo(() => {
    const porLote: any = {};
    const porGranja: any = {};
    const porPropietario: any = {}; // puedes mapear granja → propietario

    empaques.forEach((e) => {
      const recibidos = Number(e.kilosRecibidos) || 0;
      const empacado = Number(e.kilos) || 0;
      const rendimiento = recibidos > 0 ? (empacado / recibidos) * 100 : 0;

      // Por lote
      porLote[e.lote] = porLote[e.lote] || { recibidos: 0, empacado: 0, rendimiento: 0, count: 0 };
      porLote[e.lote].recibidos += recibidos;
      porLote[e.lote].empacado += empacado;
      porLote[e.lote].count += 1;

      // Por granja
      porGranja[e.granja] = porGranja[e.granja] || { recibidos: 0, empacado: 0, rendimiento: 0, count: 0 };
      porGranja[e.granja].recibidos += recibidos;
      porGranja[e.granja].empacado += empacado;
      porGranja[e.granja].count += 1;
    });

    // Calcular rendimientos finales
    Object.keys(porLote).forEach((k) => {
      const r = porLote[k];
      r.rendimiento = r.recibidos > 0 ? (r.empacado / r.recibidos) * 100 : 0;
    });
    Object.keys(porGranja).forEach((k) => {
      const r = porGranja[k];
      r.rendimiento = r.recibidos > 0 ? (r.empacado / r.recibidos) * 100 : 0;
    });

    return { porLote, porGranja, porPropietario };
  }, [empaques]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Rendimiento por Lote</h3>
        <div className="overflow-auto max-h-60">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Lote</th>
                <th className="p-2 text-right">Recibidos</th>
                <th className="p-2 text-right">Empacado</th>
                <th className="p-2 text-right">Rendimiento %</th>
                <th className="p-2 text-center">Empaques</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(resumen.porLote).map(([lote, data]: any) => (
                <tr key={lote} className="even:bg-slate-50">
                  <td className="p-2 font-medium">{lote}</td>
                  <td className="p-2 text-right">{data.recibidos.toFixed(2)}</td>
                  <td className="p-2 text-right">{data.empacado.toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold text-green-600">
                    {data.rendimiento.toFixed(2)}%
                  </td>
                  <td className="p-2 text-center">{data.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Rendimiento por Granja</h3>
        <div className="overflow-auto max-h-60">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Granja</th>
                <th className="p-2 text-right">Recibidos</th>
                <th className="p-2 text-right">Empacado</th>
                <th className="p-2 text-right">Rendimiento %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(resumen.porGranja).map(([granja, data]: any) => (
                <tr key={granja} className="even:bg-slate-50">
                  <td className="p-2 font-medium">{granja}</td>
                  <td className="p-2 text-right">{data.recibidos.toFixed(2)}</td>
                  <td className="p-2 text-right">{data.empacado.toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold text-blue-600">
                    {data.rendimiento.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}