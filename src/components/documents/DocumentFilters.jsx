import React, { useState, useEffect } from 'react';
import { Search, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { propertyService } from '@/services/propertyService';

const DocumentFilters = ({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  propertyFilter,
  setPropertyFilter,
}) => {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const load = async () => {
      const props = await propertyService.getProperties();
      setProperties(props || []);
    };
    load();
  }, []);

  return (
    <Card className="glass-effect border-slate-700">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome do documento ou imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-600">
                <SelectValue placeholder="Filtrar por imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Imóveis</SelectItem>
                {properties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id.toString()}>{prop.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-600">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="Matrícula">Matrícula</SelectItem>
                <SelectItem value="Escritura">Escritura</SelectItem>
                <SelectItem value="Contrato">Contrato</SelectItem>
                <SelectItem value="Fiscal">Fiscal</SelectItem>
                <SelectItem value="Técnico">Técnico</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-slate-800 border-slate-600">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Válido">Válido</SelectItem>
                <SelectItem value="Vencendo">Vencendo</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentFilters;