import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
//import DataTable from './DataTable';
import RecepcionProducto from './operations/RecepcionProducto';
import Clasificacion from './operations/Clasificacion';
//import Empaque from './operations/Empaque';
import GeneracionEtiquetas from './operations/GeneracionEtiquetas';
import Bodegas from './catalogs/Bodega';
import Transportes from './catalogs/Transportes';
import Ciclos from './catalogs/Ciclos';
import Usuarios from './catalogs/Usuarios';
import Tallas from './catalogs/Tallas';
import Clientes from './catalogs/Clientes';
import Choferes from './catalogs/Choferes';
import Granjas from './catalogs/Granjas';
import Productos from './catalogs/Productos';
import Propietarios from './catalogs/Propietarios';
import Proveedores from './catalogs/Proveedores';
import ErrorBoundary from './ErrorBoundary';
import TiposPreciosDescabece from './catalogs/TiposPreciosDescabece';
import Descabece from './operations/Descabece'; 
import Puestos from './catalogs/Puestos';
import Trabajadores from './catalogs/Trabajadores';
import Salidas from './operations/Salidas';
import Solicitudes from './operations/solicitudes';
import AlmacenajeCobro from './operations/AlmacenajeCobro';

export default function Dashboard() {
  const { userPermissions } = useAuth();
  const [activeSection, setActiveSection] = useState('usuarios');

  // Map of section IDs to permission names (case-insensitive match)
  const permissionMap: { [key: string]: string } = {
    usuarios: 'Usuarios',
    tallas: 'Tallas',
    ciclos: 'Ciclos',
    bodegas: 'Bodegas',
    transportes: 'Transportes',
    clientes: 'Clientes',
    choferes: 'Choferes',
    granjas: 'Granjas',
    productos: 'Productos',
    propietarios: 'Propietarios',
    proveedores: 'Proveedores',
    //recepcion: 'Recepcion',
    recepcion:'RecepcionProducto',
    clasificacion: 'Clasificacion',
    //empaque: 'RegistrarEmpaque',
    //empaque: 'Empaque',
    //etiquetas: 'GeneracionEtiquetas',
    puestos: 'Puestos',
    empleados: 'Empleados',
    etiquetas: 'GenerarEtiquetas',
  };

  // Check if user has permission for the active section
  const hasPermission = () => {
    const requiredPermission = permissionMap[activeSection];
    return requiredPermission
      ? userPermissions.some(p => p.permiso.toLowerCase() === requiredPermission.toLowerCase())
      : true; // Allow sections without specific permissions (e.g., default)
  };

  // Redirect to a default section if no permission
  useEffect(() => {
    if (!hasPermission() && userPermissions.length > 0) {
      // Find the first permitted section
      const permittedSection = Object.keys(permissionMap).find(section =>
        userPermissions.some(p => p.permiso.toLowerCase() === permissionMap[section].toLowerCase())
      );
      setActiveSection(permittedSection || 'usuarios');
    }
  }, [userPermissions, activeSection]);

  const renderContent = () => {
    if (!hasPermission()) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Acceso Denegado
            </h2>
            <p className="text-gray-600">
              No tienes permiso para acceder a esta sección.
            </p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'usuarios':
        return <Usuarios />;
      case 'tallas':
        return <Tallas />;
      case 'ciclos':
        return <Ciclos />;
      case 'bodegas':
        return <Bodegas />;
      case 'transportes':
        return <Transportes />;
      case 'clientes':
        return <Clientes />;
      case 'choferes':
        return <Choferes />;
      case 'granjas':
        return <Granjas />;
      case 'productos':
        return <Productos />;
      case 'propietarios':
        return <Propietarios />;
      case 'proveedores':
        return <Proveedores />;
      case 'recepcionproducto':
        return <RecepcionProducto />;
      case 'recepcion':
        return <RecepcionProducto />;
      case 'clasificacion':
        return <Clasificacion />;
      case 'puestos':
        return <Puestos />;
      case 'empleados':
        return <Trabajadores />;
      case 'salidas':
        return <Salidas />;
      case 'solicitudes':
        return <Solicitudes />;
      case 'precio descabece':
        return <TiposPreciosDescabece />;
      case 'almacenaje':
        return <AlmacenajeCobro />;
      //case 'empaque':
      //  return <Empaque />;
      case 'etiquetas':
        return <ErrorBoundary>
                 <GeneracionEtiquetas />
               </ErrorBoundary>;
      case 'descabece':
        return <Descabece />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h2>
              <p className="text-gray-600">
                Módulo en desarrollo. Seleccione otra opción del menú.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
/*import React, { useState } from 'react';
import Sidebar from './Sidebar';
import DataTable from './DataTable';
import RecepcionProducto from './operations/RecepcionProducto';
import Clasificacion from './operations/Clasificacion';
import Empaque from './operations/Empaque';
import GeneracionEtiquetas from './operations/GeneracionEtiquetas';
import Bodegas from './catalogs/Bodega';
import Transportes from './catalogs/Transportes';
import Ciclos from './catalogs/Ciclos';
import Usuarios from './catalogs/Usuarios';
import Tallas from './catalogs/Tallas';
import Clientes from './catalogs/Clientes';
import Choferes from './catalogs/Choferes';
import Granjas from './catalogs/Granjas';
import Productos from './catalogs/Productos';
import Propietarios from './catalogs/Propietarios';
import Proveedores from './catalogs/Proveedores';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('usuarios');

  const renderContent = () => {
    switch (activeSection) {
      case 'usuarios':
        return <Usuarios />;
      
      case 'tallas':
        return <Tallas />;
      
      case 'ciclos':
        return <Ciclos />;
        
      case 'bodegas':
        return <Bodegas />;

      case 'transportes':
        return <Transportes />;

      case 'clientes':
        return <Clientes />;

      case 'choferes':
        return <Choferes />;

      case 'granjas':
        return <Granjas />;

      case 'productos':
        return <Productos />;

      case 'propietarios':
        return <Propietarios />;

      case 'recepcion':
        return <RecepcionProducto />;
      
      case 'clasificacion':
        return <Clasificacion />;
      
      case 'empaque':
        return <Empaque />;
      
      case 'etiquetas':
        return <GeneracionEtiquetas />;

      case 'proveedores':
        return <Proveedores />;

      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h2>
              <p className="text-gray-600">
                Módulo en desarrollo. Seleccione otra opción del menú.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}*/