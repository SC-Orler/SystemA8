import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getClientes, getTallasDisponibles, createSalida,
  getUsuarios, getSolicitudes, getCajasForSolicitud, getCiclosPorTalla,
  getLotesPorCiclo, getCajasPorLote
} from '../../api/salidasApi';

interface Cliente {
  clienteid: number;
  cliente: string;
}

interface Talla {
  tallaid: number;
  talla: string;
}

interface Caja {
  cajaid: number;
  barcode: string;
  tallaid: number;
  talla: string;
  lote: string;
  granja: string;
  propietario: string;
  posicion: string;
  bodega: string;
  fechaEntrada: string;
  clienteid?: number;
}

interface Usuario {
  usuarioid: number;
  nombrecompleto: string;
}

interface Resumen {
  talla: string;
  lote: string;
  granja: string;
  propietario: string;
  cantidad: number;
}

interface Solicitud {
  solicitudid: number;
  clienteid: number;
  cliente: string;
  estatus: string;
  pagado: boolean;
  fecha: string;
  usuarioid: number;
  usuario: string;
}
interface Ciclo {
  cicloid: number;
  nombre: string;
}

const Salidas: React.FC = () => {
  const { user, token, userPermissions, isLoading, error: authError, logout } = useAuth();
  const location = useLocation();

  // ← AGREGADOS: ESTADOS FALTANTES
  const [cicloId, setCicloId] = useState<number>(0);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [cajasDisponibles, setCajasDisponibles] = useState<Caja[]>([]);
  const [cajasSeleccionadas, setCajasSeleccionadas] = useState<Caja[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number>(0);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<number>(0);
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number>(0);
  const [ciclosDisponibles, setCiclosDisponibles] = useState<Ciclo[]>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState<string>('');
  const [lotesDisponibles, setLotesDisponibles] = useState<string[]>([]);
  const [cajasSeleccionadasIds, setCajasSeleccionadasIds] = useState<number[]>([]);
  const [tipo, setTipo] = useState<string>('VENTA');
  const [responsableBodegaId, setResponsableBodegaId] = useState<number>(0);
  const [autorizoId, setAutorizoId] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');
  const [solicitudId, setSolicitudId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'manual' | 'solicitudes'>('manual');

  // Solicitudes state
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [cajasSolicitud, setCajasSolicitud] = useState<Caja[]>([]);
  const [showSolicitudPreview, setShowSolicitudPreview] = useState(false);
  const [previewSolicitudId, setPreviewSolicitudId] = useState<number>(0); // ← NUEVO

  // ← AUTO-SELECT USUARIO ACTUAL COMO AUTORIZADOR
  useEffect(() => {
    if (usuarios.length > 0 && autorizoId === 0) {
      const currentUser = usuarios.find(u => u.nombrecompleto === user?.nombre);
      if (currentUser) {
        setAutorizoId(currentUser.usuarioid);
      }
    }
  }, [usuarios, user, autorizoId]);

  // ← TOTAL = CANTIDAD DE CAJAS
  useEffect(() => {
    setTotal(cajasSeleccionadas.length);
  }, [cajasSeleccionadas]);

  useEffect(() => {
    if (user && !isLoading) {
      fetchData();
    }
  }, [user, isLoading]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const solicitudid = params.get('solicitudid');
    const clienteid = params.get('clienteid');
    const cajas = params.get('cajas');
    if (solicitudid && clienteid && cajas) {
      setActiveTab('solicitudes');
      setSolicitudId(parseInt(solicitudid));
      setClienteSeleccionado(parseInt(clienteid));
      const parsedCajas = JSON.parse(decodeURIComponent(cajas));
      setCajasSeleccionadas(parsedCajas);
      setSelectedSolicitud({
        solicitudid: parseInt(solicitudid),
        clienteid: parseInt(clienteid),
        cliente: '',
        estatus: 'APROBADA',
        pagado: false,
        fecha: ''
      });
    }
  }, [location]);

  const fetchData = async () => {
    try {
      const [clientesData, tallasData, usuariosData, solicitudesData] = await Promise.all([
        getClientes(),
        getTallasDisponibles(),
        getUsuarios(),
        getSolicitudes(),
      ]);
      setClientes(clientesData);
      setTallas(tallasData);
      setUsuarios(usuariosData);
      setSolicitudes(solicitudesData.filter(s => s.estatus === 'APROBADA' || s.estatus === 'LIBERADO'));
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  // ← FUNCIÓN CORREGIDA
  const handlePreviewSolicitud = async (solicitudid: number) => {
    setPreviewSolicitudId(solicitudid); // ← GUARDAMOS ID
    try {
      const data = await getCajasForSolicitud(solicitudid);
      setCajasSolicitud(Array.isArray(data) ? data : []);
      setShowSolicitudPreview(true);
    } catch (err: any) {
      toast.error('Error al cargar solicitud');
      setCajasSolicitud([]);
    }
  };

  const handleLimpiarSolicitud = () => {
    setSelectedSolicitud(null);
    setCajasSeleccionadas([]);
    setClienteSeleccionado(0);
    setSolicitudId(null);
  };

  const fetchCiclosPorTalla = async (tallaid: number) => {
    try {
      const data = await getCiclosPorTalla(tallaid);
      setCiclosDisponibles(data);
      setCicloSeleccionado(0);
      setLoteSeleccionado('');
      setLotesDisponibles([]);
      setCajasDisponibles([]);
      setCajasSeleccionadasIds([]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchLotesPorCiclo = async (cicloid: number, tallaid: number) => {
    try {
      const data = await getLotesPorCiclo(cicloid,tallaid);
      setLotesDisponibles(data);
      setLoteSeleccionado('');
      setCajasDisponibles([]);
      setCajasSeleccionadasIds([]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchCajasPorLote = async (lote: string) => {
    try {
      let data = await getCajasPorLote(lote);
      const selectedIds = new Set(cajasSeleccionadas.map(c => c.cajaid));
      data = data.filter(c => !selectedIds.has(c.cajaid));
      data.sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());
      setCajasDisponibles(data);
      setCajasSeleccionadasIds([]);
      setError(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTallaChange = (tallaid: number) => {
    setTallaSeleccionada(tallaid);
    setCicloSeleccionado(0);
    setLoteSeleccionado('');
    setCajasSeleccionadasIds([]);
    if (tallaid > 0) {
      fetchCiclosPorTalla(tallaid);
    } else {
      setCiclosDisponibles([]);
      setLotesDisponibles([]);
      setCajasDisponibles([]);
    }
  };

  const handleCicloChange = (cicloid: number) => {  // ← QUITAR tallaid del parámetro
    setCicloSeleccionado(cicloid);
    setCicloId(cicloid);  // ← AGREGAR ESTO
    setLoteSeleccionado('');
    setCajasSeleccionadasIds([]);
    if (cicloid > 0 && tallaSeleccionada > 0) {
      fetchLotesPorCiclo(cicloid, tallaSeleccionada);  // ← tallaid DESDE STATE
    } else {
      setLotesDisponibles([]);
      setCajasDisponibles([]);
    }
  };

  const handleLoteChange = (lote: string) => {
    setLoteSeleccionado(lote);
    setCajasSeleccionadasIds([]);
    if (lote) {
      fetchCajasPorLote(lote);
    } else {
      setCajasDisponibles([]);
    }
  };

  const handleCajaToggle = (cajaid: number) => {
    setCajasSeleccionadasIds(prev =>
      prev.includes(cajaid) ? prev.filter(id => id !== cajaid) : [...prev, cajaid]
    );
  };

  const handleSelectAll = () => {
    if (cajasSeleccionadasIds.length === cajasDisponibles.length) {
      setCajasSeleccionadasIds([]);
    } else {
      setCajasSeleccionadasIds(cajasDisponibles.map(c => c.cajaid));
    }
  };

  const handleAgregarCaja = () => {
    const nuevasCajas = cajasDisponibles
      .filter(c => cajasSeleccionadasIds.includes(c.cajaid))
      .map(c => ({
        ...c,
        talla: tallas.find(t => t.tallaid === c.tallaid)?.talla || c.talla || '',
        lote: String(c.lote),
      }));

    setCajasSeleccionadas(prev => [...prev, ...nuevasCajas]);
    setCajasDisponibles(prev => prev.filter(c => !cajasSeleccionadasIds.includes(c.cajaid)));
    setCajasSeleccionadasIds([]);
    setLoteSeleccionado('');
  };

  const handleEliminarCaja = (cajaid: number) => {
    const caja = cajasSeleccionadas.find(c => c.cajaid === cajaid);
    if (caja) {
      setCajasSeleccionadas(prev => prev.filter(c => c.cajaid !== cajaid));
      if (tallaSeleccionada === caja.tallaid) {
        setCajasDisponibles(prev => {
          const newDisponibles = [...prev, { ...caja, fechaEntrada: caja.fechaEntrada }];
          newDisponibles.sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());
          return newDisponibles;
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        setFile(file);
      } else {
        toast.error('Solo se permiten archivos JPEG, PNG o PDF');
      }
    }
  };

  const prepareResumen = () => {
    const resumenMap = new Map<string, Resumen>();
    cajasSeleccionadas.forEach(caja => {
      const key = `${caja.talla}-${caja.lote}-${caja.granja}-${caja.propietario}`;
      if (resumenMap.has(key)) {
        const existing = resumenMap.get(key)!;
        existing.cantidad += 1;
      } else {
        resumenMap.set(key, {
          talla: caja.talla,
          lote: caja.lote,
          granja: caja.granja,
          propietario: caja.propietario,
          cantidad: 1,
        });
      }
    });
    return Array.from(resumenMap.values());
  };

  const handleGuardar = () => {
    if (!tipo || !cicloId || !responsableBodegaId || !autorizoId || !observaciones) {
      setError('Todos los campos son requeridos');
      toast.error('Todos los campos son requeridos');
      return;
    }
    const resumenData = prepareResumen();
    setResumen(resumenData);
    setShowModal(true);
  };

  const confirmGuardar = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!token) throw new Error('No se encontró un token de autenticación');

      const formData = new FormData();
      formData.append('clienteid', clienteSeleccionado.toString());
      formData.append('tipo', tipo);
      formData.append('cicloid', cicloId.toString()); // ← CAMBIADO
      formData.append('responsablebodegaid', responsableBodegaId.toString());
      formData.append('autorizoid', autorizoId.toString());
      formData.append('total', total.toString());
      formData.append('observaciones', observaciones);
      if (solicitudId) {
        formData.append('solicitudid', solicitudId.toString());
      }
      formData.append('cajas', JSON.stringify(cajasSeleccionadas.map(c => ({
        cajaid: c.cajaid,
        barcode: c.barcode,
        tallaid: c.tallaid,
        lote: String(c.lote),
        granja: c.granja,
        propietario: c.propietario,
      }))));
      if (file) {
        formData.append('justificacion', file);
      }

      await createSalida(formData);
      toast.success('Salida registrada correctamente');

      // ← RESET COMPLETO
      setCajasSeleccionadas([]);
      setClienteSeleccionado(0);
      setTallaSeleccionada(0);
      setLoteSeleccionado('');
      setCajasDisponibles([]);
      setCajasSeleccionadasIds([]);
      setTipo('VENTA');
      setCicloId(0);
      setCicloSeleccionado(0);
      setResponsableBodegaId(0);
      setAutorizoId(0);
      setTotal(0);
      setObservaciones('');
      setSolicitudId(null);
      setFile(null);
      setSelectedSolicitud(null);
      setShowModal(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detalle || err.message || 'Error al registrar la salida';
      setError(errorMessage);
      toast.error(errorMessage);
      if (errorMessage.includes('no autenticado') || errorMessage.includes('token')) {
        logout();
        window.location.href = '/login';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user?.isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!userPermissions.some(p => p.permiso === 'Salidas' || p.permiso === '*')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permiso para gestionar salidas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm text-center p-3">
          {error}
        </div>
      )}

      <div>
        <div className="border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-lg font-medium text-gray-900">Salidas / Ventas</h2>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* TABS PRINCIPALES */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                📦 Salidas Manuales
              </button>
              <button
                onClick={() => setActiveTab('solicitudes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'solicitudes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                📋 Solicitudes ({solicitudes.length})
              </button>
            </nav>
          </div>

          {/* TAB 1: SALIDAS MANUALES */}
          {activeTab === 'manual' && (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente:</label>
                  <select
                    value={clienteSeleccionado}
                    onChange={(e) => setClienteSeleccionado(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={solicitudId !== null}
                  >
                    <option value={0}>Selecciona un cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.clienteid} value={cliente.clienteid}>{cliente.cliente}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo:</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="VENTA">Venta</option>
                    <option value="TRASLADO">Traslado</option>
                    <option value="ENTREGA">Entrega</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla:</label>
                  <select
                    value={tallaSeleccionada}
                    onChange={(e) => handleTallaChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Selecciona una talla</option>
                    {tallas.map(talla => (
                      <option key={talla.tallaid} value={talla.tallaid}>{talla.talla}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo:</label>
                  <select
                    value={cicloSeleccionado}
                    onChange={(e) => handleCicloChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={ciclosDisponibles.length === 0}
                  >
                    <option value={0}>Selecciona un ciclo</option>
                    {ciclosDisponibles.map(ciclo => (
                      <option key={ciclo.cicloid} value={ciclo.cicloid}>{ciclo.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote:</label>
                  <select
                    value={loteSeleccionado}
                    onChange={(e) => handleLoteChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={lotesDisponibles.length === 0}
                  >
                    <option value="">Selecciona un lote</option>
                    {lotesDisponibles.map(lote => (
                      <option key={lote} value={lote}>{lote}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable Bodega:</label>
                  <select
                    value={responsableBodegaId}
                    onChange={(e) => setResponsableBodegaId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Selecciona un responsable</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.usuarioid} value={usuario.usuarioid}>{usuario.nombrecompleto}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Autorizó:</label>
                  <select
                    value={autorizoId}
                    onChange={(e) => setAutorizoId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Selecciona un autorizador</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.usuarioid} value={usuario.usuarioid}>{usuario.nombrecompleto}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cajas:</label>
                  <input
                    type="number"
                    value={total}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones:</label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justificación (JPEG/PNG/PDF):</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SELECCIÓN DE CAJAS */}
              {tallaSeleccionada > 0 && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lote:</label>
                    <select
                      value={loteSeleccionado}
                      onChange={(e) => handleLoteChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      disabled={!tallaSeleccionada}
                    >
                      <option value="">Selecciona un lote</option>
                      {lotesDisponibles.map(lote => (
                        <option key={lote} value={lote}>{lote}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {tallaSeleccionada > 0 && loteSeleccionado && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      Cajas disponibles ({cajasDisponibles.length})
                    </h3>
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                    >
                      {cajasSeleccionadasIds.length === cajasDisponibles.length && cajasDisponibles.length > 0
                        ? 'Deseleccionar todas'
                        : 'Seleccionar todas'}
                    </button>
                  </div>
                  <div className="overflow-auto max-h-[200px] mb-2">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Seleccionar</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Barcode</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Lote</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Propietario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cajasDisponibles.map((caja) => (
                          <tr key={caja.cajaid}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={cajasSeleccionadasIds.includes(caja.cajaid)}
                                onChange={() => handleCajaToggle(caja.cajaid)}
                                className="h-4 w-4 text-blue-600"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm">{caja.barcode}</td>
                            <td className="px-3 py-2 text-sm">{caja.lote}</td>
                            <td className="px-3 py-2 text-sm">{caja.propietario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleAgregarCaja}
                    disabled={cajasSeleccionadasIds.length === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Agregar {cajasSeleccionadasIds.length} caja(s)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOLICITUDES */}
          {activeTab === 'solicitudes' && (
            <div>
              {!selectedSolicitud ? (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Solicitud para Surtir</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cliente</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>  {/* ← NUEVA */}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estatus</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pagado</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solicitudes.map(s => (
                          <tr key={s.solicitudid} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium">{s.solicitudid}</td>
                            <td className="px-4 py-2 text-sm">{s.cliente}</td>
      <td className="px-4 py-2 text-sm text-gray-600">{s.usuario}</td>  {/* ← NUEVA */}
                            <td className="px-4 py-2 text-sm">{new Date(s.fecha).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                s.estatus === 'APROBADA' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {s.estatus}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                s.pagado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {s.pagado ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handlePreviewSolicitud(s.solicitudid)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                              >
                                <Eye className="w-4 h-4" /> Previsualizar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {solicitudes.length === 0 && (
                    <p className="text-gray-500 text-center mt-4">No hay solicitudes disponibles para surtir</p>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-800">✅ Solicitud #{selectedSolicitud.solicitudid} Cargada</h4>
                    <p className="text-sm text-green-700">
                      Cliente: <strong>{selectedSolicitud.cliente}</strong> |
                      Cajas: <strong>{cajasSeleccionadas.length}</strong> |
                      Pagado: <strong>{selectedSolicitud.pagado ? 'Sí' : 'No'}</strong>
                    </p>
                    <button
                      onClick={handleLimpiarSolicitud}
                      className="text-sm text-red-600 hover:text-red-800 mt-1"
                    >
                      Limpiar Solicitud
                    </button>
                  </div>

                  {/* FORMULARIO PARA SOLICITUDES */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cliente:</label>
                      <input
                        value={selectedSolicitud.cliente}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo:</label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="VENTA">Venta</option>
                        <option value="TRASLADO">Traslado</option>
                        <option value="ENTREGA">Entrega</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo ID:</label>
                      <input
                        type="number"
                        value={cicloId}
                        onChange={(e) => setCicloId(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsable Bodega:</label>
                      <select
                        value={responsableBodegaId}
                        onChange={(e) => setResponsableBodegaId(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={0}>Selecciona un responsable</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.usuarioid} value={usuario.usuarioid}>{usuario.nombrecompleto}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Autorizó:</label>
                      <select
                        value={autorizoId}
                        onChange={(e) => setAutorizoId(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={0}>Selecciona un autorizador</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.usuarioid} value={usuario.usuarioid}>{usuario.nombrecompleto}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total:</label>
                      <input
                        type="number"
                        value={total}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                        min="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones:</label>
                      <input
                        type="text"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Justificación (JPEG/PNG/PDF):</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TABLA CAJAS SELECCIONADAS */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Cajas Seleccionadas ({cajasSeleccionadas.length})
            </h3>
            <div className="overflow-auto max-h-[250px] mb-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Barcode</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talla</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lote</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Granja</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cajasSeleccionadas.map((caja) => (
                    <tr key={caja.cajaid}>
                      <td className="px-4 py-2 text-sm">{caja.barcode}</td>
                      <td className="px-4 py-2 text-sm">{caja.talla}</td>
                      <td className="px-4 py-2 text-sm">{caja.lote}</td>
                      <td className="px-4 py-2 text-sm">{caja.granja}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleEliminarCaja(caja.cajaid)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTÓN GUARDAR */}
          <div className="flex justify-end">
            <button
              onClick={handleGuardar}
              disabled={cajasSeleccionadas.length === 0 || isSubmitting}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 flex items-center gap-2 font-medium"
            >
              <Save className="w-5 h-5" />
              Guardar Salida ({cajasSeleccionadas.length} cajas)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PREVIEW SOLICITUD - CORREGIDO */}
      {showSolicitudPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Preview Solicitud #{previewSolicitudId}</h3>
              <button
                onClick={() => {
                  setShowSolicitudPreview(false);
                  setCajasSolicitud([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {cajasSolicitud.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Cargando cajas...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Barcode</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talla</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lote</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Granja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cajasSolicitud.map(caja => (
                          <tr key={caja.cajaid} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium">{caja.barcode}</td>
                            <td className="px-4 py-2 text-sm">{caja.talla}</td>
                            <td className="px-4 py-2 text-sm">{caja.lote}</td>
                            <td className="px-4 py-2 text-sm">{caja.granja}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => {
                        setShowSolicitudPreview(false);
                        setCajasSolicitud([]);
                      }}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setCajasSeleccionadas(cajasSolicitud);
                        
                        // ← ENCONTRAR SOLICITUD COMPLETA (CON usuarioid)
                        const solicitudCompleta = solicitudes.find(s => s.solicitudid === previewSolicitudId);
                        
                        setSelectedSolicitud(solicitudCompleta || null);
                        setClienteSeleccionado(cajasSolicitud[0]?.clienteid || 0);
                        setSolicitudId(previewSolicitudId);
                        
                        // ← AUTO-SELECCIONAR AUTORIZADOR = USUARIO DE LA SOLICITUD
                        if (solicitudCompleta?.usuarioid) {
                          setAutorizoId(solicitudCompleta.usuarioid);
                        }
                        
                        setShowSolicitudPreview(false);
                        setCajasSolicitud([]);
                        toast.success(`Solicitud ${previewSolicitudId} cargada (${cajasSolicitud.length} cajas)`);
                      }}
                      className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Surtir Solicitud ({cajasSolicitud.length} cajas)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Confirmar Salida</h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><strong>Tipo:</strong> {tipo}</div>
                <div><strong>Ciclo:</strong> {ciclosDisponibles.find(c => c.cicloid === cicloId)?.nombre || cicloId}</div>
                <div><strong>Total:</strong> {total} cajas</div>
                <div><strong>Responsable:</strong> {usuarios.find(u => u.usuarioid === responsableBodegaId)?.nombrecompleto || 'N/A'}</div>
                <div><strong>Autorizó:</strong> {usuarios.find(u => u.usuarioid === autorizoId)?.nombrecompleto || 'N/A'}</div>
                {selectedSolicitud && <div className="col-span-2"><strong>Solicitud:</strong> #{selectedSolicitud.solicitudid} ({selectedSolicitud.pagado ? 'Pagado' : 'Pendiente'})</div>}
              </div>

              <h4 className="font-medium mb-2">Resumen de Cajas:</h4>
              <div className="overflow-auto max-h-[300px]">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talla</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lote</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Granja</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Propietario</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{item.talla}</td>
                        <td className="px-4 py-2 text-sm">{item.lote}</td>
                        <td className="px-4 py-2 text-sm">{item.granja}</td>
                        <td className="px-4 py-2 text-sm">{item.propietario}</td>
                        <td className="px-4 py-2 text-sm font-medium">{item.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={confirmGuardar}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Confirmar Salida
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salidas;
