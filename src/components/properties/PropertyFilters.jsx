
import React from 'react';
import { Search, Grid, List } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PropertyFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  viewMode,
  setViewMode,
  isProjectView
}) => {
  
  const statusOptions = isProjectView ? [
    { value: 'all', label: 'Todos os Status' },
    { value: 'em construção', label: 'Em Construção' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'em fase de vendas', label: 'Em Fase de Vendas' },
    { value: 'Disponível', label: 'Disponível' },
    { value: 'Vendido', label: 'Vendido' },
    { value: 'Reservado', label: 'Reservado' },
  ] : [
    { value: 'all', label: 'Todos os Status' },
    { value: 'Disponível', label: 'Disponível' },
    { value: 'Vendido', label: 'Vendido' },
    { value: 'Alugado', label: 'Alugado' },
    { value: 'Reservado', label: 'Reservado' },
    { value: 'Indisponível', label: 'Indisponível' },
  ];

  const typeOptions = isProjectView ? [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'torres_blocos', label: 'Torres/Blocos' },
    { value: 'casas', label: 'Casas (Condomínio)' },
    { value: 'apartamento', label: 'Apartamento' },
    { value: 'casa', label: 'Casa' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'comercial', label: 'Comercial' },
  ] : [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'casa', label: 'Casa' },
    { value: 'apartamento', label: 'Apartamento' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'rural', label: 'Rural' },
    { value: 'outro', label: 'Outro' },
  ];
  
  return (
    <Card className="glass-effect border-slate-700">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, obra ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex-1 sm:flex-none">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
            
            <div className="flex-1 sm:flex-none">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
            
            <div className="hidden sm:flex border border-slate-600 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
