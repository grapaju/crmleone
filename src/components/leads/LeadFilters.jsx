import React from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LeadFilters = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, sourceFilter, setSourceFilter }) => (
  <Card className="glass-effect border-slate-700">
    <CardContent className="p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-600"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex-1 sm:flex-none">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-800 border-slate-600"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Novo">Novo</SelectItem>
                <SelectItem value="Contato Inicial">Contato Inicial</SelectItem>
                <SelectItem value="Visita Agendada">Visita Agendada</SelectItem>
                <SelectItem value="Proposta">Proposta</SelectItem>
                <SelectItem value="Fechamento">Fechamento</SelectItem>
                <SelectItem value="Perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 sm:flex-none">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-800 border-slate-600"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="Site">Site</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default LeadFilters;