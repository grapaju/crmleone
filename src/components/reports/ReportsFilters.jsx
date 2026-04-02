import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

const ReportsFilters = ({ dateRange, setDateRange, reportType, setReportType }) => {
  return (
    <Card className="glass-effect border-slate-700">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300">Filtros:</span>
          </div>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="last30days">Últimos 30 dias</SelectItem>
              <SelectItem value="last3months">Últimos 3 meses</SelectItem>
              <SelectItem value="last6months">Últimos 6 meses</SelectItem>
              <SelectItem value="lastyear">Último ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Visão Geral</SelectItem>
              <SelectItem value="sales">Vendas</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
              <SelectItem value="agents">Corretores</SelectItem>
              <SelectItem value="properties">Imóveis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsFilters;