import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './lib/auth/AuthContext';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';

// Páginas Públicas
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';

// Páginas Privadas (Dashboard)
import DashboardLayout from './pages/dashboard/Layout';
import DashboardHome from './pages/dashboard/DashboardHome';
import AgendaHome from './pages/dashboard/agenda/AgendaHome';
import Clientes from './pages/dashboard/Clientes';
import Profissionais from './pages/dashboard/Profissionais';
import Servicos from './pages/dashboard/Servicos';
import Financeiro from './pages/dashboard/Financeiro';
import Configuracoes from './pages/dashboard/Configuracoes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="cuthub-theme">
        <Toaster position="bottom-right" />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />

              {/* Rotas Protegidas */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="agenda" element={<AgendaHome />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="profissionais" element={<Profissionais />} />
                  <Route path="servicos" element={<Servicos />} />
                  <Route path="financeiro" element={<Financeiro />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                </Route>
              </Route>

              {/* Redirect genérico */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
