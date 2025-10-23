import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Salidas from './components/operations/Salidas';           // ← NUEVO
import Solicitudes from './components/operations/Solicitudes';  // ← NUEVO

// Simple loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, error, retryAuth } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - user:', user, 'isLoading:', isLoading, 'error:', error);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error de Autenticación</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={retryAuth}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return user?.isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          {/* ← NUEVAS RUTAS OPERACIONES */}
          <Route
            path="/salidas"
            element={
              <ProtectedRoute>
                <Salidas />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/solicitudes"
            element={
              <ProtectedRoute>
                <Solicitudes />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* RUTA WILDCARD (404) */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
                    <h2 className="text-xl font-bold text-gray-600 mb-4">Página no encontrada</h2>
                    <p className="text-gray-600 mb-4">La página que buscas no existe.</p>
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                    >
                      Ir al Dashboard
                    </button>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;