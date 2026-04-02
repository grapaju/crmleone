import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext.jsx';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Properties from '@/pages/Properties';
import PropertyForm from '@/pages/PropertyForm';
import PropertyDetails from '@/pages/PropertyDetails';
import ConstructionProjectForm from '@/pages/ConstructionProjectForm';
import ConstructionProjectDetails from '@/pages/ConstructionProjectDetails';
import UnitDetails from '@/pages/UnitDetails';
import UnitEdit from '@/pages/UnitEdit';
import Agents from '@/pages/Agents';
import AgentForm from '@/pages/AgentForm';
import Leads from '@/pages/Leads';
import LeadForm from '@/pages/LeadForm';
import LeadDetails from '@/pages/LeadDetails';
import Calendar from '@/pages/Calendar';
import AppointmentForm from '@/pages/AppointmentForm';
import Documents from '@/pages/Documents';
import DocumentForm from '@/pages/DocumentForm';
import Reports from '@/pages/Reports';
import AgentPermissions from '@/pages/AgentPermissions';
import Settings from '@/pages/Settings';
import Contacts from '@/pages/Contacts';
import ContactForm from '@/pages/ContactForm';
import SalesTables from '@/pages/SalesTables';
import SalesTableForm from '@/pages/SalesTableForm';
import SalesTableSend from '@/pages/SalesTableSend';



const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="properties" element={<Properties />} />
        
        {/* Rotas para Imóveis Individuais */}
        <Route path="properties/new-property" element={<PropertyForm />} />
        <Route path="properties/edit/:id" element={<PropertyForm />} />
        <Route path="properties/:id" element={<PropertyDetails />} />
        
        {/* Rotas para Obras/Empreendimentos */}
        <Route path="properties/new-project" element={<ConstructionProjectForm />} />
        <Route path="properties/edit-project/:id" element={<ConstructionProjectForm />} />
        <Route path="properties/project/:id" element={<ConstructionProjectDetails />} />
        <Route path="properties/project/:projectId/unit/:unitId" element={<UnitDetails />} />
  <Route path="properties/project/:projectId/unit/:unitId/edit" element={<UnitEdit />} />

        <Route path="agents" element={<ProtectedRoute requiredRole="admin"><Agents /></ProtectedRoute>} />
        <Route path="agents/new" element={<ProtectedRoute requiredRole="admin"><AgentForm /></ProtectedRoute>} />
        <Route path="agents/edit/:id" element={<AgentForm />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/new" element={<LeadForm />} />
        <Route path="leads/edit/:id" element={<LeadForm />} />
        <Route path="leads/view/:id" element={<LeadDetails />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="contacts/new" element={<ContactForm />} />
        <Route path="contacts/edit/:id" element={<ContactForm />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="calendar/new" element={<AppointmentForm />} />
        <Route path="calendar/edit/:id" element={<AppointmentForm />} />
        <Route path="documents" element={<Documents />} />
        <Route path="documents/new" element={<DocumentForm />} />
        <Route path="documents/edit/:id" element={<DocumentForm />} />
        <Route path="sales-tables" element={<SalesTables />} />
        <Route path="sales-tables/new" element={<SalesTableForm />} />
        <Route path="sales-tables/edit/:id" element={<SalesTableForm />} />
        <Route path="sales-tables/send/:id" element={<SalesTableSend />} />
        <Route path="reports" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
  <Route path="settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
  <Route path="permissions" element={<ProtectedRoute requiredRole="admin"><AgentPermissions /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
};

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>ImóvelCRM - Sistema Gestor de Imóveis</title>
        <meta name="description" content="Sistema completo de gestão imobiliária com CRM, dashboard interativo e funcionalidades avançadas para imobiliárias e corretores." />
      </Helmet>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;