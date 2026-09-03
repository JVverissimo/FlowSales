import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomeRedirect } from "@/components/HomeRedirect";
import Dashboard from "./pages/Dashboard";
import Cadencias from "./pages/Cadencias";
import CadenceDetail from "./pages/CadenceDetail";
import Atividades from "./pages/Atividades";
import Execucao from "./pages/Execucao";
import SdrAtividades from "./pages/SdrAtividades";
import MeuDashboard from "./pages/MeuDashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Agendamentos from "./pages/Agendamentos";
import PainelControle from "./pages/PainelControle";
import MotivosPerda from "./pages/MotivosPerda";

import Comissoes from "./pages/Comissoes";
import Crm from "./pages/Crm";
import Placeholder from "./pages/Placeholder";
import Perfil from "./pages/Perfil";
import Empresa from "./pages/Empresa";
import Integracoes from "./pages/Integracoes";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Home: gestor → Dashboard, SDR → Minhas atividades */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/dashboard" element={<ProtectedRoute requireGestor><Dashboard /></ProtectedRoute>} />
              <Route path="/meu-dashboard" element={<MeuDashboard />} />
              <Route path="/minhas-atividades" element={<SdrAtividades />} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/crm" element={<Crm />} />

              <Route path="/prospeccao" element={<Navigate to="/prospeccao/painel" replace />} />
              <Route path="/prospeccao/painel" element={<ProtectedRoute requireGestor><PainelControle /></ProtectedRoute>} />
              <Route path="/prospeccao/execucao" element={<Execucao />} />
              <Route path="/prospeccao/atividades" element={<ProtectedRoute requireGestor><Atividades /></ProtectedRoute>} />
              <Route path="/prospeccao/cadencias" element={<ProtectedRoute requireGestor><Cadencias /></ProtectedRoute>} />
              <Route path="/prospeccao/cadencias/:id" element={<ProtectedRoute requireGestor><CadenceDetail /></ProtectedRoute>} />
              <Route path="/prospeccao/leads" element={<Leads />} />
              <Route path="/prospeccao/leads/:id" element={<LeadDetail />} />
              <Route path="/agendamentos" element={<Agendamentos />} />
              <Route path="/prospeccao/ajustes" element={<ProtectedRoute requireGestor><Placeholder title="Ajustes de Prospecção" /></ProtectedRoute>} />
              <Route path="/prospeccao/motivos-perda" element={<ProtectedRoute requireGestor><MotivosPerda /></ProtectedRoute>} />

              <Route path="/ligacoes" element={<Navigate to="/ligacoes/painel" replace />} />
              <Route path="/ligacoes/painel" element={<Placeholder title="Painel de Ligações" />} />
              <Route path="/ligacoes/lista" element={<Placeholder title="Lista de Ligações" />} />
              <Route path="/ligacoes/extrato" element={<Placeholder title="Extrato de Ligações" />} />

              

              <Route path="/perfil" element={<Perfil />} />
              <Route path="/empresa" element={<Navigate to="/empresa/dados" replace />} />
              <Route path="/empresa/:tab" element={<ProtectedRoute requireGestor><Empresa /></ProtectedRoute>} />
              <Route path="/integracoes" element={<ProtectedRoute requireGestor><Integracoes /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
