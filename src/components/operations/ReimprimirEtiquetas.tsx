// src/components/operations/ReimprimirEtiquetas.tsx
import React, { useState, useEffect } from "react";
import { Search, Printer, CheckSquare, Square } from "lucide-react";
import {
  getCiclos,
  getGranjas,
  getTallas,
  getRecepciones,
  getDetalleEtiquetas,
  getBarcodes,
  createEtiquetas,
} from "../../api/empaqueApi";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

// === INTERFACES ===
interface Ciclo {
  cicloid: number;
  año: string;
  ciclo: string;
  status?: string;
}

interface Granja {
  granjaid: number;
  granja: string;
}

interface Talla {
  tallaid: number;
  talla: string;
}

interface Etiqueta {
  barras: string;
  lote: string;
  talla: string;
  kg: number;
  cartones: number;
  fecha: string;
  granja: string;
  cicloid: number;
  cicloDisplay: string;
  tallaid: number;
  producto: string;
  diajuliano: string;
  granjaid: number;
}

// === COMPONENTE PRINCIPAL ===
export default function ReimprimirEtiquetas() {
  const { user } = useAuth();

  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [granjas, setGranjas] = useState<Granja[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);

  const [granjasDisponibles, setGranjasDisponibles] = useState<Granja[]>([]);
  const [tallasDisponibles, setTallasDisponibles] = useState<Talla[]>([]);

  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [filtered, setFiltered] = useState<Etiqueta[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [filtro, setFiltro] = useState({
    cicloid: 0,
    lote: "",
    granjaid: 0,
    tallaid: 0,
    caja: "",
  });

  // === CARGAR DATOS INICIALES ===
  useEffect(() => {
    const load = async () => {
      try {
        const [ciclosData, granjasData, tallasData] = await Promise.all([
          getCiclos(),
          getGranjas(),
          getTallas(),
        ]);

        setCiclos(ciclosData);
        setGranjas(granjasData);
        setTallas(tallasData);
        setGranjasDisponibles(granjasData);
        setTallasDisponibles(tallasData);
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
        toast.error("Error al cargar datos iniciales");
      }
    };
    load();
  }, []);

  // === FILTRO GRANJAS POR LOTE ===
  useEffect(() => {
    const loadGranjas = async () => {
      if (!filtro.cicloid || !filtro.lote) {
        setGranjasDisponibles(granjas);
        setTallasDisponibles([]);
        setFiltro((prev) => ({ ...prev, granjaid: 0, tallaid: 0, caja: "" }));
        return;
      }

      try {
        const recepciones = await getRecepciones(filtro.cicloid, filtro.lote);
        const granjaIds = [...new Set(recepciones.map((r: any) => Number(r.granjaid)))];
        const granjasFiltradas = granjas.filter((g) => granjaIds.includes(g.granjaid));
        setGranjasDisponibles(granjasFiltradas.length > 0 ? granjasFiltradas : granjas);
        setTallasDisponibles([]);
        setFiltro((prev) => ({ ...prev, granjaid: 0, tallaid: 0, caja: "" }));
      } catch {
        setGranjasDisponibles(granjas);
        setTallasDisponibles([]);
        setFiltro((prev) => ({ ...prev, granjaid: 0, tallaid: 0, caja: "" }));
      }
    };
    loadGranjas();
  }, [filtro.cicloid, filtro.lote, granjas]);

  // === FILTRO TALLAS POR GRANJA ===
  useEffect(() => {
    const loadTallas = async () => {
      if (!filtro.cicloid || !filtro.lote || !filtro.granjaid) {
        setTallasDisponibles([]);
        setFiltro((prev) => ({ ...prev, tallaid: 0, caja: "" }));
        return;
      }

      try {
        const detalle = await getDetalleEtiquetas(filtro.cicloid, filtro.lote);
        const filteredDetalle = detalle.filter((d: any) => Number(d.granjaid) === filtro.granjaid);
        const tallaIds = [...new Set(filteredDetalle.map((d: any) => d.tallaid))];
        const tallasFiltradas = tallas.filter((t) => tallaIds.includes(t.tallaid));
        setTallasDisponibles(tallasFiltradas);
        setFiltro((prev) => ({ ...prev, tallaid: 0, caja: "" }));
      } catch {
        setTallasDisponibles([]);
        setFiltro((prev) => ({ ...prev, tallaid: 0, caja: "" }));
      }
    };
    loadTallas();
  }, [filtro.cicloid, filtro.lote, filtro.granjaid, tallas]);

  // === BUSCAR ETIQUETAS ===
  const buscar = async () => {
    if (!filtro.cicloid || !filtro.lote) {
      toast.warn("Seleccione Ciclo y Lote");
      return;
    }

    setIsLoading(true);
    try {
      const [detalleData, barcodesData] = await Promise.all([
        getDetalleEtiquetas(filtro.cicloid, filtro.lote),
        getBarcodes(filtro.cicloid, filtro.lote),
      ]);

      const ciclo = ciclos.find((c) => c.cicloid === filtro.cicloid);
      const cicloDisplay = ciclo ? `${ciclo.año}-${ciclo.ciclo}` : "";

      const list: Etiqueta[] = detalleData
        .map((d: any) => {
          const barcode = barcodesData.find((b: string) =>
            b.includes(String(d.slote).padStart(4, "0")) &&
            b.includes(String(d.tallaid).padStart(2, "0")) &&
            b.includes(d.diajuliano)
          ) || "";

          return {
            barras: barcode,
            lote: String(d.slote),
            talla: d.talla,
            kg: Number(d.kgs) || 0,
            cartones: d.cartones,
            fecha: d.fecha,
            granja: granjas.find((g) => g.granjaid === Number(d.granjaid))?.granja || "N/A",
            cicloid: d.cicloid,
            cicloDisplay,
            tallaid: d.tallaid,
            producto: d.producto,
            diajuliano: d.diajuliano,
            granjaid: Number(d.granjaid),
          };
        })
        .filter((e) => e.barras);

      setEtiquetas(list);
      setFiltered(list);
      setSelected(new Set());
    } catch (err) {
      console.error("Error buscando etiquetas:", err);
      toast.error("Error al buscar etiquetas");
    } finally {
      setIsLoading(false);
    }
  };

  // === FILTRADO EN TIEMPO REAL ===
  useEffect(() => {
    let res = etiquetas;
    if (filtro.tallaid) res = res.filter((e) => e.tallaid === filtro.tallaid);
    if (filtro.caja) res = res.filter((e) => e.barras.endsWith(filtro.caja.padStart(4, "0")));
    setFiltered(res);
  }, [etiquetas, filtro.tallaid, filtro.caja]);

  // === SELECCIÓN ===
  const toggleSelect = (barras: string) => {
    const newSet = new Set(selected);
    newSet.has(barras) ? newSet.delete(barras) : newSet.add(barras);
    setSelected(newSet);
  };

  const selectAll = () => {
    setSelected(
      selected.size === filtered.length
        ? new Set()
        : new Set(filtered.map((e) => e.barras))
    );
  };

  // === REIMPRIMIR ===
  const imprimirSeleccionadas = async () => {
    if (selected.size === 0) {
      toast.warn("Seleccione al menos una etiqueta");
      return;
    }

    setIsPrinting(true);
    try {
      const sel = filtered.filter((e) => selected.has(e.barras));
      const fechaHoy = new Date();
      const fechaCaduca = new Date(fechaHoy);
      fechaCaduca.setFullYear(fechaCaduca.getFullYear() + 2);

      const payload = {
        Etiquetas: sel.map((e) => ({
          folio: e.barras.slice(-4),
          detalleid: "REIMPRESO",
          Planta: "PLANTA LAS AGUILAS",
          Granja: e.granja,
          Granjaid: String(e.granjaid),
          TipoCamarón: e.producto === "S/CABEZA" ? "S/CABEZA" : "C/CABEZA",
          Talla: e.talla,
          Tallaid: String(e.tallaid),
          Lote: `${e.lote}-${e.cicloDisplay}`,
          Empaque: new Date(e.fecha).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          DiaJuliano: e.diajuliano,
          LoteId: e.lote,
          CicloId: e.cicloid,
          C_Antes_De: fechaCaduca.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          Peso: String(e.kg),
          Hora: fechaHoy.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          Camarones: null,
          Uniformidad: "0.00",
          Metabisulfito: "NO",
          Bodega: "N/A",
          Posicion: "N/A",
          Tarima: "N/A",
          LeyendaAlergias: "Este producto puede causar alergias en personas suceptibles.",
          LeyendaAlimentaria:
            "El consumo crudo o poco cocido puede incrementar el riesgo de adquirir una enfermedad alimentaria.",
          Barras: e.barras,
          QRContent: `Planta: PLANTA LAS AGUILAS, Granja: ${e.granja}, Talla: ${e.talla}, Lote: ${e.lote}, Ciclo: ${e.cicloDisplay}, Pres.: ${e.kg}, DiaJuliano: ${e.diajuliano}, Producto: ${e.producto}, Barras: ${e.barras}`,
        })),
        configuracion: { impresora: "PDF" },
      };

      await createEtiquetas(payload);
      toast.success(`Reimpresas ${selected.size} etiqueta(s)`);
      setSelected(new Set());
    } catch (err: any) {
      console.error("Error al reimprimir:", err);
      toast.error("Error al reimprimir: " + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  // === RENDER ===
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Printer className="w-5 h-5" />
        Reimprimir Etiquetas
      </h3>

      {/* FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {/* CICLO */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ciclo</label>
          <select
            value={filtro.cicloid}
            onChange={(e) =>
              setFiltro({ cicloid: Number(e.target.value), lote: "", granjaid: 0, tallaid: 0, caja: "" })
            }
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value={0}>Seleccionar</option>
            {ciclos.map((c) => (
              <option key={c.cicloid} value={c.cicloid}>
                {c.año}-{c.ciclo}
              </option>
            ))}
          </select>
        </div>

        {/* LOTE */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Lote</label>
          <input
            type="text"
            value={filtro.lote}
            onChange={(e) =>
              setFiltro((prev) => ({ ...prev, lote: e.target.value, granjaid: 0, tallaid: 0, caja: "" }))
            }
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Ej: 123"
            className="w-full px-3 py-2 border rounded-md text-sm"
            disabled={!filtro.cicloid}
          />
        </div>

        {/* GRANJA */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Granja</label>
          <select
            value={filtro.granjaid}
            onChange={(e) =>
              setFiltro((prev) => ({ ...prev, granjaid: Number(e.target.value), tallaid: 0, caja: "" }))
            }
            className="w-full px-3 py-2 border rounded-md text-sm"
            disabled={!filtro.cicloid || !filtro.lote}
          >
            <option value={0}>
              {filtro.cicloid && filtro.lote ? "Todas" : "Seleccione Ciclo y Lote"}
            </option>
            {granjasDisponibles.map((g) => (
              <option key={g.granjaid} value={g.granjaid}>
                {g.granja}
              </option>
            ))}
          </select>
        </div>

        {/* TALLA */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Talla</label>
          <select
            value={filtro.tallaid}
            onChange={(e) =>
              setFiltro((prev) => ({ ...prev, tallaid: Number(e.target.value), caja: "" }))
            }
            className="w-full px-3 py-2 border rounded-md text-sm"
            disabled={!filtro.cicloid || !filtro.lote || !filtro.granjaid}
          >
            <option value={0}>
              {filtro.cicloid && filtro.lote && filtro.granjaid ? "Todas" : "Seleccione Granja"}
            </option>
            {tallasDisponibles.map((t) => (
              <option key={t.tallaid} value={t.tallaid}>
                {t.talla}
              </option>
            ))}
          </select>
        </div>

        {/* CAJA */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Caja</label>
          <input
            type="text"
            value={filtro.caja}
            onChange={(e) => setFiltro((prev) => ({ ...prev, caja: e.target.value }))}
            placeholder="0001"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>

      {/* BOTONES */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={buscar}
          disabled={isLoading || !filtro.cicloid || !filtro.lote}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          {isLoading ? "Buscando..." : "Buscar"}
        </button>

        <button
          onClick={imprimirSeleccionadas}
          disabled={selected.size === 0 || isPrinting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          Reimprimir ({selected.size})
        </button>
      </div>

      {/* TABLA */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3 w-12 text-center">
                  <button onClick={selectAll} className="text-blue-600">
                    {selected.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-left font-medium">Código</th>
                <th className="p-3 text-left font-medium">Lote</th>
                <th className="p-3 text-left font-medium">Talla</th>
                <th className="p-3 text-right font-medium">Kg</th>
                <th className="p-3 text-left font-medium">Granja</th>
                <th className="p-3 text-left font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    {isLoading ? "Cargando..." : "No hay etiquetas"}
                  </td>
                </tr>
              ) : (
                filtered.map((e, index) => (
                  <tr
                    key={`${e.barras}-${e.granjaid}-${e.tallaid}-${index}`} // ← CLAVE 100% ÚNICA
                    className={selected.has(e.barras) ? "bg-blue-50" : "hover:bg-gray-50"}
                  >
                    <td className="p-3 text-center">
                      <button onClick={() => toggleSelect(e.barras)}>
                        {selected.has(e.barras) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-mono">{e.barras}</td>
                    <td className="p-3">{e.lote}</td>
                    <td className="p-3">{e.talla}</td>
                    <td className="p-3 text-right">{Number(e.kg).toFixed(2)}</td>
                    <td className="p-3">{e.granja}</td>
                    <td className="p-3">{e.fecha}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        {selected.size > 0
          ? `${selected.size} etiqueta(s) seleccionada(s)`
          : "Ninguna seleccionada"}
      </p>
    </div>
  );
}