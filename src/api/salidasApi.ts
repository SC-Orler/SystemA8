import axios from "axios";

const API_URL = "http://localhost:3000/api";

export const getUsuarios = async () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(`${API_URL}/usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching usuarios:", error);
    throw new Error(
      error.response?.data?.error || "Error al obtener los usuarios"
    );
  }
};

export const getClientes = async () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(`${API_URL}/salidas/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching clientes:", error);
    throw new Error(
      error.response?.data?.error || "Error al obtener los clientes"
    );
  }
};

export const getTallasDisponibles = async () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(`${API_URL}/salidas/tallas-disponibles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching tallas:", error);
    throw new Error(
      error.response?.data?.error || "Error al obtener las tallas"
    );
  }
};

export const getCajasPorTalla = async (tallaid: number) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(
      `${API_URL}/salidas/cajas/talla/${tallaid}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching cajas por talla:", error);
    throw new Error(
      error.response?.data?.error || "Error al obtener las cajas por talla"
    );
  }
};

export const getCajasDisponiblesPorTalla = async (tallaid: number) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(
      `${API_URL}/salidas/cajas/talla/${tallaid}/count`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.count;
  } catch (error: any) {
    console.error("Error fetching count of cajas por talla:", error);
    throw new Error(
      error.response?.data?.error ||
        "Error al obtener el conteo de cajas disponibles"
    );
  }
};

export const createSalida = async (data: FormData) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.post(`${API_URL}/salidas`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error creating salida:", error);
    throw new Error(
      error.response?.data?.error || "Error al registrar la salida"
    );
  }
};

export const createSolicitud = async (data: {
  clienteid: number;
  observaciones?: string;
  pagado: boolean;
  estatus: "PENDIENTE" | "APROBADA" | "SURTIDA" | "RECHAZADA" | "LIBERADO";
  detalles: Array<{ tallaid: number; cantidad: number }>;
  usuarioid?: number;
}) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.post(`${API_URL}/solicitudes`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error creating solicitud:", error);
    throw new Error(
      error.response?.data?.error || "Error al crear la solicitud"
    );
  }
};

export const getSolicitudes = async () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(`${API_URL}/solicitudes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching solicitudes:", error);
    throw new Error(
      error.response?.data?.error || "Error al obtener las solicitudes"
    );
  }
};

export const getCajasForSolicitud = async (solicitudid: number) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.get(
      `${API_URL}/solicitudes/${solicitudid}/cajas`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    // ← AGREGAR ESTA LÍNEA: EXTRAER EL ARRAY DE CAJAS
    return response.data.cajas || [];
  } catch (error: any) {
    console.error("Error fetching cajas for solicitud:", error);
    throw new Error(
      error.response?.data?.error || "Error al obtener cajas para la solicitud"
    );
  }
};

export const approveSolicitud = async (solicitudid: number) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.put(
      `${API_URL}/solicitudes/${solicitudid}/approve`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error approving solicitud:", error);
    throw new Error(
      error.response?.data?.error || "Error al aprobar la solicitud"
    );
  }
};

export const updateSolicitud = async (data: any) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No se encontró un token de autenticación");
    const response = await axios.put(
      `${API_URL}/solicitudes/${data.solicitudid}`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating solicitud:", error);
    throw new Error(
      error.response?.data?.error || "Error al actualizar la solicitud"
    );
  }
};

// ← AGREGAR ESTAS 2 NUEVAS FUNCIONES AL FINAL
export const getCiclosPorTalla = async (tallaid: number) => {
  try {
    const token = sessionStorage.getItem('token');
    if (!token) throw new Error('No se encontró un token de autenticación');
    const response = await axios.get(`${API_URL}/salidas/ciclos/talla/${tallaid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching ciclos por talla:', error);
    throw new Error(error.response?.data?.error || 'Error al obtener los ciclos por talla');
  }
};

export const getLotesPorCiclo = async (cicloid: number, tallaid: number) => {
  try {
    const token = sessionStorage.getItem('token');
    if (!token) throw new Error('No se encontró un token de autenticación');
    const response = await axios.get(
      `${API_URL}/salidas/lotes/ciclo/${cicloid}/${tallaid}`,  // ← FORMATO CORRECTO
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching lotes por ciclo:', error);
    throw new Error(error.response?.data?.error || 'Error al obtener los lotes por ciclo');
  }
};
export const getCajasPorLote = async (lote: string) => {
  try {
    const token = sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No se encontró un token de autenticación');
    }
    const response = await axios.get(`${API_URL}/salidas/cajas/lote/${lote}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching cajas por lote:', error);
    throw new Error(error.response?.data?.error || 'Error al obtener las cajas por lote');
  }
};