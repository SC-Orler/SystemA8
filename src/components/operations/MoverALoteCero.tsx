// components/MoverALoteCero.tsx
import React, { useState } from "react";
import { Card, Input, IconBtn } from "./UI";
import { Package, AlertTriangle } from "lucide-react";

export default function MoverALoteCero({ empaques, onMover }: { empaques: any[]; onMover: (idEmpaque: number, detalleId: number) => void }) {
  const [codigo, setCodigo] = useState("");
  const [encontrado, setEncontrado] = useState<any>(null);
  const [error, setError] = useState("");

  const buscar = () => {
    setError("");
    setEncontrado(null);
    for (const e of empaques) {
      const d = e.detalles?.find((x: any) => x.barras === codigo);
      if (d) {
        setEncontrado({ empaque: e, detalle: d });
        return;
      }
    }
    setError("Código no encontrado");
  };

  const mover = () => {
    if (!encontrado) return;
    const confirm = window.confirm(
      `¿Mover ${encontrado.detalle.cartones} cartones del lote ${encontrado.empaque.lote}-${encontrado.detalle.subLote} a LOTE 0?`
    );
    if (confirm) {
      onMover(encontrado.empaque.id, encontrado.detalle.id);
      setEncontrado(null);
      setCodigo("");
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Package size={18} /> Mover Cajas a Lote 0
      </h3>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Escanear código de barras"
          value={codigo}
          onChange={(e: any) => setCodigo(e.target.value)}
          onKeyDown={(e: any) => e.key === "Enter" && buscar()}
        />
        <IconBtn onClick={buscar} className="bg-amber-500">
          Buscar
        </IconBtn>
      </div>

      {error && <div className="text-red-600 text-sm flex items-center gap-1"><AlertTriangle size={14} /> {error}</div>}

      {encontrado && (
        <div className="border-2 border-amber-400 rounded p-3 bg-amber-50">
          <div className="text-sm space-y-1">
            <div><strong>Lote:</strong> {encontrado.empaque.lote}-{encontrado.detalle.subLote}</div>
            <div><strong>Código:</strong> {encontrado.detalle.barras}</div>
            <div><strong>Cartones:</strong> {encontrado.detalle.cartones}</div>
            <div><strong>Kg:</strong> {encontrado.detalle.totalKg.toFixed(2)}</div>
          </div>
          <button
            onClick={mover}
            className="mt-3 w-full py-2 bg-red-600 text-white rounded flex items-center justify-center gap-2"
          >
            Mover a Lote 0
          </button>
        </div>
      )}
    </Card>
  );
}