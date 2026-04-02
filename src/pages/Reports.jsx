import React, { useState } from 'react';
import { 
  TrendingUp,
  DollarSign,
  Building2,
  UserPlus
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import ReportsHeader from '@/components/reports/ReportsHeader';
import ReportsFilters from '@/components/reports/ReportsFilters';
import KPIReportCard from '@/components/reports/KPIReportCard';
import SalesRevenueChart from '@/components/reports/SalesRevenueChart';
import PropertyTypesChart from '@/components/reports/PropertyTypesChart';
import LeadSourcesChart from '@/components/reports/LeadSourcesChart';
import MonthlyTrendsChart from '@/components/reports/MonthlyTrendsChart';
import AgentPerformanceTable from '@/components/reports/AgentPerformanceTable';
import QuickInsights from '@/components/reports/QuickInsights';

const Reports = () => {
  const [dateRange, setDateRange] = useState('last30days');
  const [reportType, setReportType] = useState('overview');

  // Mock data for charts
  const salesData = [
    { month: 'Jan', vendas: 12, locacoes: 8, faturamento: 2400000 },
    { month: 'Fev', vendas: 15, locacoes: 12, faturamento: 3200000 },
    { month: 'Mar', vendas: 18, locacoes: 10, faturamento: 3800000 },
    { month: 'Abr', vendas: 22, locacoes: 15, faturamento: 4500000 },
    { month: 'Mai', vendas: 20, locacoes: 18, faturamento: 4200000 },
    { month: 'Jun', vendas: 25, locacoes: 20, faturamento: 5100000 }
  ];

  const propertyTypesData = [
    { name: 'Apartamentos', value: 45, color: '#3b82f6' },
    { name: 'Casas', value: 30, color: '#8b5cf6' },
    { name: 'Terrenos', value: 15, color: '#06b6d4' },
    { name: 'Comerciais', value: 10, color: '#10b981' }
  ];

  const leadSourcesData = [
    { source: 'Site', leads: 45, conversao: 12 },
    { source: 'WhatsApp', leads: 38, conversao: 15 },
    { source: 'Facebook', leads: 32, conversao: 8 },
    { source: 'Google', leads: 28, conversao: 10 },
    { source: 'Indicação', leads: 25, conversao: 18 },
    { source: 'Telefone', leads: 20, conversao: 14 }
  ];

  const agentPerformanceData = [
    { name: 'Carlos Silva', vendas: 8, faturamento: 450000, leads: 23 },
    { name: 'Ana Santos', vendas: 6, faturamento: 380000, leads: 18 },
    { name: 'João Oliveira', vendas: 5, faturamento: 320000, leads: 15 },
    { name: 'Maria Costa', vendas: 3, faturamento: 180000, leads: 8 }
  ];

  const monthlyTrendsData = [
    { month: 'Jan', visitas: 120, propostas: 45, fechamentos: 12 },
    { month: 'Fev', visitas: 145, propostas: 52, fechamentos: 15 },
    { month: 'Mar', visitas: 160, propostas: 58, fechamentos: 18 },
    { month: 'Abr', visitas: 180, propostas: 65, fechamentos: 22 },
    { month: 'Mai', visitas: 175, propostas: 62, fechamentos: 20 },
    { month: 'Jun', visitas: 195, propostas: 72, fechamentos: 25 }
  ];

  const handleExportReport = (type) => {
    toast({
      title: `📊 Exportar Relatório ${type}`,
      description: "🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  const handleViewDetails = (section) => {
    toast({
      title: `👁️ Ver Detalhes - ${section}`,
      description: "🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  return (
    <div className="space-y-6">
      <ReportsHeader onExport={handleExportReport} />

      <ReportsFilters 
        dateRange={dateRange}
        setDateRange={setDateRange}
        reportType={reportType}
        setReportType={setReportType}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIReportCard
          title="Faturamento Total"
          value="R$ 2.4M"
          change="+15.3%"
          icon={DollarSign}
          color="bg-green-500/20 text-green-400"
          trend="up"
        />
        <KPIReportCard
          title="Vendas Realizadas"
          value="25"
          change="+8.2%"
          icon={Building2}
          color="bg-blue-500/20 text-blue-400"
          trend="up"
        />
        <KPIReportCard
          title="Novos Leads"
          value="156"
          change="+12.5%"
          icon={UserPlus}
          color="bg-purple-500/20 text-purple-400"
          trend="up"
        />
        <KPIReportCard
          title="Taxa de Conversão"
          value="16.8%"
          change="-2.1%"
          icon={TrendingUp}
          color="bg-yellow-500/20 text-yellow-400"
          trend="down"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesRevenueChart data={salesData} onDetailsClick={handleViewDetails} />
        <PropertyTypesChart data={propertyTypesData} onDetailsClick={handleViewDetails} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadSourcesChart data={leadSourcesData} onDetailsClick={handleViewDetails} />
        <MonthlyTrendsChart data={monthlyTrendsData} onDetailsClick={handleViewDetails} />
      </div>

      <AgentPerformanceTable data={agentPerformanceData} onDetailsClick={handleViewDetails} />
      
      <QuickInsights />
    </div>
  );
};

export default Reports;