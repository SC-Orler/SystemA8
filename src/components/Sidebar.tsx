import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  RotateCcw, 
  Users, 
  User, 
  Warehouse, 
  ShoppingCart, 
  Building, 
  Package2,
  Ruler,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  Layers,
  FileText,
  BarChart3,
  Tag,
  CheckSquare,
  Thermometer,
  Cloud,
  Search,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['catalogos', 'operaciones']);
  const { logout } = useAuth();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const menuItems = [
    {
      id: 'catalogos',
      label: 'Catálogos',
      icon: Package,
      children: [
        { id: 'bodegas', label: 'Bodegas', icon: Warehouse },
        { id: 'transportes', label: 'Transportes', icon: Truck },
        { id: 'ciclos', label: 'Ciclos', icon: RotateCcw },
        { id: 'clientes', label: 'Clientes', icon: Users },
        { id: 'choferes', label: 'Choferes', icon: User },
        { id: 'granjas', label: 'Granjas', icon: Home },
        /*{ id: 'productos', label: 'Productos', icon: ShoppingCart },*/
        { id: 'propietarios', label: 'Propietarios', icon: Building },
        /*{ id: 'proveedores', label: 'Proveedores', icon: Package2 },*/
        { id: 'tallas', label: 'Tallas', icon: Ruler },
        { id: 'puestos', label: 'Puestos', icon: CheckSquare },
        { id: 'empleados', label: 'Empleados', icon: Settings },
        { id: 'usuarios', label: 'Usuarios', icon: Settings },
        { id: 'precio descabece', label: 'TipoPrecioDescabece', icon: Settings },
      ]
    },
    {
      id: 'operaciones',
      label: 'Operaciones',
      icon: Layers,
      children: [
        { id: 'recepcion', label: 'Recepcion Producto', icon: Package },
        { id: 'descabece', label: 'Descabece', icon: Package },
        { id: 'etiquetas', label: 'Empaque', icon: Tag },
        { id: 'salidas', label: 'Salidas', icon: Settings },
        { id: 'solicitudes', label: 'Solicitudes', icon: Settings },
        //{ id: 'empaque', label: 'Registrar Empaque', icon: Package2 },
        //{ id: 'clasificacion', label: 'Clasificación', icon: Tag },
        { id: 'concentrado', label: 'Generar Concentrado', icon: FileText },
        { id: 'concentrado-clientes', label: 'Generar Concentrado Clientes', icon: BarChart3 },
        { id: 'ventas', label: 'Ventas / Salidas', icon: ShoppingCart },
        { id: 'tablero', label: 'Tablero Procesos x Lote', icon: BarChart3 },
        { id: 'trazabilidad', label: 'Trazabilidad x Lotes', icon: Search },
        { id: 'almacenaje', label: 'Contro Almacenaje', icon: Search },
        //{ id: 'temperatura', label: 'Revision Temperatura', icon: Thermometer },
        //{ id: 'enviar-temp', label: 'Enviar Temperaturas Nube', icon: Cloud },
        //{ id: 'etiqueta-gam', label: 'Etiqueta Gam', icon: Tag },
      ]
    }
  ];

  return (
    <div className="w-64 bg-gray-100 border-r border-gray-300 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-300">
        <h1 className="text-lg font-semibold text-gray-800">A8 SYSTEMS</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {menuItems.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const SectionIcon = section.icon;
          
          return (
            <div key={section.id} className="border-b border-gray-200">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-700">{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              {isExpanded && (
                <div className="bg-white">
                  {section.children?.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-2 px-6 py-2 text-left hover:bg-blue-50 transition-colors ${
                          activeSection === item.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-gray-300">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}