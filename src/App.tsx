import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './lib/auth/AuthContext';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { GuardaDoDashboard } from './lib/auth/GuardaDoDashboard';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';

// Páginas Públicas
import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Barbearias from './pages/publico/Barbearias';
import PerfilBarbearia from './pages/publico/PerfilBarbearia';
import AgendarNaBarbearia from './pages/publico/AgendarNaBarbearia';

// Área do cliente
import { ClienteLayout } from './components/layout/ClienteLayout';
import EscolherAcesso from './pages/EscolherAcesso';
import MinhaConta from './pages/cliente/MinhaConta';
import MeusAgendamentos from './pages/cliente/MeusAgendamentos';
import MeusFavoritos from './pages/cliente/MeusFavoritos';
import MinhasPromocoes from './pages/cliente/MinhasPromocoes';

// Console da plataforma (admin_supremo)
import { AdminLayout } from './components/layout/AdminLayout';
import AdminHome from './pages/admin/AdminHome';
import AdminBarbearias from './pages/admin/AdminBarbearias';
import AdminAuditoria from './pages/admin/AdminAuditoria';

// Páginas Privadas (Dashboard)
import DashboardLayout from './pages/dashboard/Layout';
import DashboardHome from './pages/dashboard/DashboardHome';
import AgendaHome from './pages/dashboard/agenda/AgendaHome';
import Clientes from './pages/dashboard/Clientes';
import Profissionais from './pages/dashboard/Profissionais';
import Servicos from './pages/dashboard/Servicos';
import Produtos from './pages/dashboard/Produtos';
import Promocoes from './pages/dashboard/Promocoes';
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
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              {/* Catálogo e perfil da barbearia são públicos de propósito: se o
                  cliente precisar de conta para ver preço e serviço, o perfil
                  deixa de ser divulgação e vira portão. O login aparece na hora
                  de agendar. */}
              <Route path="/barbearias" element={<Barbearias />} />
              <Route path="/b/:slug" element={<PerfilBarbearia />} />
              {/* Público: dá para montar o agendamento inteiro sem conta. O
                  login só é exigido no passo de confirmar. */}
              <Route path="/b/:slug/agendar" element={<AgendarNaBarbearia />} />

              {/* Escolha do chapeu. Fica na area `cliente` porque desde a
                  F8.4 todos os papeis logados entram nela -- e e justamente
                  quem trabalha numa barbearia que precisa desta tela. */}
              <Route path="/escolher-acesso" element={<ProtectedRoute area="cliente" />}>
                <Route index element={<EscolherAcesso />} />
              </Route>

              {/* Área do cliente — identidade neutra do CutHub */}
              <Route path="/minha-conta" element={<ProtectedRoute area="cliente" />}>
                <Route element={<ClienteLayout />}>
                  <Route index element={<MinhaConta />} />
                  <Route path="agendamentos" element={<MeusAgendamentos />} />
                  <Route path="favoritos" element={<MeusFavoritos />} />
                  <Route path="promocoes" element={<MinhasPromocoes />} />
                </Route>
              </Route>

              {/* Console da plataforma — URL separada de propósito: o admin age
                  sobre todos os tenants, e misturar isso com /dashboard já fez
                  ele ver uma tela onde todo botão vinha desabilitado. */}
              <Route path="/admin" element={<ProtectedRoute area="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<AdminHome />} />
                  <Route path="barbearias" element={<AdminBarbearias />} />
                  <Route path="auditoria" element={<AdminAuditoria />} />
                </Route>
              </Route>

              {/* Rotas Protegidas */}
              {/* Dois guardas em serie, com perguntas diferentes: o primeiro
                  diz quem entra na area de gestao, o segundo diz qual papel
                  abre qual tela dentro dela. O profissional passa no primeiro
                  e e barrado no segundo em Servicos, Produtos e afins. */}
              <Route path="/dashboard" element={<ProtectedRoute area="gestao" />}>
                <Route element={<GuardaDoDashboard />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="agenda" element={<AgendaHome />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="profissionais" element={<Profissionais />} />
                  <Route path="servicos" element={<Servicos />} />
                  <Route path="produtos" element={<Produtos />} />
                  <Route path="promocoes" element={<Promocoes />} />
                  <Route path="financeiro" element={<Financeiro />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                </Route>
                </Route>
              </Route>

              {/* Rota desconhecida cai na porta de entrada pública; quem
                  estiver logado é levado da landing para o painel. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
