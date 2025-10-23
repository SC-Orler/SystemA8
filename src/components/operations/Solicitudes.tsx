import React, { useState, useEffect } from 'react';
import { Save, X, Edit2, Eye } from 'lucide-react';  // ← SOLO ESTOS ÍCONOS
import { useAuth } from '../../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    getClientes,
    getTallasDisponibles,
    getSolicitudes,
    createSolicitud,
    getCajasForSolicitud,
    getCajasDisponiblesPorTalla,
    updateSolicitud
} from '../../api/salidasApi';

interface Cliente {
    clienteid: number;
    cliente: string;
}

interface Talla {
    tallaid: number;
    talla: string;
}

interface Solicitud {
    solicitudid: number;
    fecha: string;
    clienteid: number;
    cliente: string;
    observaciones: string;
    estatus: string;
    pagado: boolean;
    usuario: string;
    detalles: Array<{ tallaid: number; talla: string; cantidad: number }>;
}

interface Caja {
    cajaid: number;
    barcode: string;
    tallaid: number;
    talla: string;
    lote: string;
    granja: string;
    propietario: string;
}

const Solicitudes: React.FC = () => {
    const { user, token, userPermissions, isLoading, error: authError, logout } = useAuth();
    const navigate = useNavigate();

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [tallas, setTallas] = useState<Talla[]>([]);
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<number>(0);
    const [observaciones, setObservaciones] = useState<string>('');
    const [pagado, setPagado] = useState<boolean>(false);
    const [estatus, setEstatus] = useState<string>('PENDIENTE');
    const [detalles, setDetalles] = useState<Array<{ tallaid: number; cantidad: number }>>([]);
    const [tallaSeleccionada, setTallaSeleccionada] = useState<number>(0);
    const [cantidad, setCantidad] = useState<number>(0);
    const [cajasDisponibles, setCajasDisponibles] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState<number | null>(null);
    const [cajasPreview, setCajasPreview] = useState<Caja[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ← ESTADOS PARA EDITAR
    const [editingSolicitud, setEditingSolicitud] = useState<Solicitud | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // ← VERIFICAR PERMISO SOLICITUDES
    const hasSolicitudesPermission = userPermissions.some(p => p.permiso === 'Solicitudes' || p.permiso === '*');

    useEffect(() => {
        if (user && !isLoading) {
            fetchData();
        }
    }, [user, isLoading]);

    useEffect(() => {
        const fetchCajasDisponibles = async () => {
            if (tallaSeleccionada > 0) {
                try {
                    const count = await getCajasDisponiblesPorTalla(tallaSeleccionada);
                    setCajasDisponibles(count);
                    if (cantidad > count) setCantidad(count);
                } catch (err: any) {
                    toast.error(err.message || 'Error al obtener cajas disponibles');
                }
            } else {
                setCajasDisponibles(0);
                setCantidad(0);
            }
        };
        fetchCajasDisponibles();
    }, [tallaSeleccionada, cantidad]);

    const fetchData = async () => {
        try {
            const [clientesData, tallasData, solicitudesData] = await Promise.all([
                getClientes(),
                getTallasDisponibles(),
                getSolicitudes(),
            ]);
            setClientes(clientesData);
            setTallas(tallasData);
            setSolicitudes(solicitudesData);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        }
    };

    const loadSolicitudForEdit = (solicitud: Solicitud) => {
        setEditingSolicitud(solicitud);
        setIsEditing(true);
        setClienteSeleccionado(solicitud.clienteid);
        setObservaciones(solicitud.observaciones);
        setPagado(solicitud.pagado);
        setEstatus(solicitud.estatus);
        setDetalles(solicitud.detalles.map(d => ({ tallaid: d.tallaid, cantidad: d.cantidad })));
    };

    const resetForm = () => {
        setClienteSeleccionado(0);
        setObservaciones('');
        setPagado(false);
        setEstatus('PENDIENTE');
        setDetalles([]);
        setEditingSolicitud(null);
        setIsEditing(false);
        setTallaSeleccionada(0);
        setCantidad(0);
    };

    const handleAgregarDetalle = () => {
        if (tallaSeleccionada <= 0 || cantidad <= 0 || cantidad > cajasDisponibles) {
            toast.error(`Cantidad inválida. Máximo: ${cajasDisponibles}`);
            return;
        }
        setDetalles(prev => [
            ...prev.filter(d => d.tallaid !== tallaSeleccionada),
            { tallaid: tallaSeleccionada, cantidad },
        ]);
        setTallaSeleccionada(0);
        setCantidad(0);
    };

    const handleEliminarDetalle = (tallaid: number) => {
        setDetalles(prev => prev.filter(d => d.tallaid !== tallaid));
    };

    const handleSaveSolicitud = async () => {
        if (!clienteSeleccionado || detalles.length === 0) {
            toast.error('Selecciona un cliente y al menos una talla');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing && editingSolicitud) {
                await updateSolicitud({
                    solicitudid: editingSolicitud.solicitudid,
                    clienteid: clienteSeleccionado,
                    observaciones,
                    pagado,
                    estatus,
                    detalles,
                    usuarioid: JSON.parse(localStorage.getItem('user'))?.id || user!.userid,
                });
                toast.success('Solicitud actualizada correctamente');
            } else {
                await createSolicitud({
                    clienteid: clienteSeleccionado,
                    observaciones,
                    pagado,
                    estatus,
                    detalles,
                    usuarioid: JSON.parse(localStorage.getItem('user'))?.id || user!.userid,
                });
                toast.success('Solicitud creada correctamente');
            }

            resetForm();
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar solicitud');
            if (err.message.includes('autenticado')) logout();
        } finally {
            setIsSubmitting(false);
        }
    };

    // ← SOLO PREVISUALIZAR (PARA SURTIR DESDE SALIDAS)
    const handlePreviewSolicitud = async (solicitudid: number) => {
        try {
            const data = await getCajasForSolicitud(solicitudid);
            if (!data.cajas || data.cajas.length === 0) {
                toast.warning('No hay cajas disponibles para esta solicitud');
                return;
            }

            setCajasPreview(data.cajas);
            setShowPreview(solicitudid);
            toast.success(`Previsualización cargada: ${data.cajas.length} cajas`);
        } catch (err: any) {
            toast.error(err.response?.data?.detalle || err.message || 'Error al cargar previsualización');
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

    if (!hasSolicitudesPermission) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-4">No tienes permiso para gestionar solicitudes.</p>
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
                        <h2 className="text-lg font-medium text-gray-900">
                            {isEditing ? `Editar Solicitud #${editingSolicitud?.solicitudid}` : 'Solicitudes de Producto'}
                        </h2>
                        {isEditing && (
                            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* FORMULARIO */}
                <div className="p-6 space-y-6">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente:</label>
                            <select
                                value={clienteSeleccionado}
                                onChange={(e) => setClienteSeleccionado(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={0}>Selecciona un cliente</option>
                                {clientes.map(cliente => (
                                    <option key={cliente.clienteid} value={cliente.clienteid}>{cliente.cliente}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones:</label>
                            <input
                                type="text"
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estatus:</label>
                            <select
                                value={estatus}
                                onChange={(e) => setEstatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="LIBERADO">Liberado</option>
                                <option value="APROBADA">Aprobada</option>
                                <option value="RECHAZADA">Rechazada</option>
                                <option value="SURTIDA">Surtida</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label className="block text-sm font-medium text-gray-700 mr-3">¿Pagado?:</label>
                            <input
                                type="checkbox"
                                checked={pagado}
                                onChange={(e) => setPagado(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Talla:</label>
                            <div className="flex items-center">
                                <select
                                    value={tallaSeleccionada}
                                    onChange={(e) => setTallaSeleccionada(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={0}>Selecciona una talla</option>
                                    {tallas.map(talla => (
                                        <option key={talla.tallaid} value={talla.tallaid}>{talla.talla}</option>
                                    ))}
                                </select>
                                <span className="ml-3 text-sm text-gray-600">
                                    {tallaSeleccionada > 0 ? `(${cajasDisponibles} cajas disponibles)` : ''}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad:</label>
                            <input
                                type="number"
                                value={cantidad}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= cajasDisponibles) {
                                        setCantidad(value);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max={cajasDisponibles}
                                disabled={tallaSeleccionada === 0}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleAgregarDetalle}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                        disabled={tallaSeleccionada === 0 || cajasDisponibles === 0}
                    >
                        Agregar Talla
                    </button>

                    {/* TABLA DETALLES */}
                    <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Detalles de la solicitud</h3>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {detalles.map((detalle) => (
                                    <tr key={detalle.tallaid}>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {tallas.find(t => t.tallaid === detalle.tallaid)?.talla || detalle.tallaid}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{detalle.cantidad}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <button
                                                onClick={() => handleEliminarDetalle(detalle.tallaid)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            onClick={handleSaveSolicitud}
                            disabled={isSubmitting || detalles.length === 0}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> {isEditing ? 'Actualizar' : 'Crear'} Solicitud
                        </button>
                    </div>

                    {/* TABLA SOLICITUDES - SOLO PREVISUALIZAR Y MODIFICAR */}
                    <div className="mt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Solicitudes</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estatus</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {solicitudes.map((solicitud) => (
                                        <tr key={solicitud.solicitudid}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{solicitud.solicitudid}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{new Date(solicitud.fecha).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{solicitud.cliente}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{solicitud.estatus}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{solicitud.pagado ? 'Sí' : 'No'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex gap-2">
                                                    {/* ✅ SOLO PREVISUALIZAR */}
                                                    <button
                                                        onClick={() => handlePreviewSolicitud(solicitud.solicitudid)}
                                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                                                        title="Previsualizar cajas"
                                                    >
                                                        <Eye className="w-4 h-4" /> Previsualizar
                                                    </button>

                                                    {/* ✅ SOLO MODIFICAR */}
                                                    <button
                                                        onClick={() => loadSolicitudForEdit(solicitud)}
                                                        className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm"
                                                        title="Editar solicitud"
                                                        disabled={solicitud.estatus === 'SURTIDA'}
                                                    >
                                                        <Edit2 className="w-4 h-4" /> Modificar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* MODAL PREVISUALIZAR */}
                {showPreview && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
                            <div className="p-6 border-b">
                                <h3 className="text-xl font-bold text-gray-900">Previsualización Solicitud #{showPreview}</h3>
                                <div className="mt-2 text-sm text-gray-600">
                                    <p><strong>Total Cajas:</strong> {cajasPreview.length}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Talla</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {Object.entries(
                                        cajasPreview.reduce((acc, caja) => {
                                        acc[caja.talla] = (acc[caja.talla] || 0) + 1;
                                        return acc;
                                        }, {})
                                    ).map(([talla, cajas]) => (
                                        <tr key={talla} className="border-b">
                                        <td className="px-4 py-2 text-sm">{talla}</td>
                                        <td className="px-4 py-2 text-sm">{cajas}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 border-t flex justify-end">
                                <button
                                    onClick={() => setShowPreview(null)}
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Solicitudes;