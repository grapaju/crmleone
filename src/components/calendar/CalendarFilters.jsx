import React from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CalendarFilters = ({ filterType, setFilterType }) => (
  <Card className="glass-effect border-slate-700">
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="Visita">Visitas</SelectItem>
            <SelectItem value="Reunião">Reuniões</SelectItem>
            <SelectItem value="Vistoria">Vistorias</SelectItem>
            <SelectItem value="Assinatura">Assinaturas</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
);

export default CalendarFilters;