import React from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AgentFilters = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter }) => {
    return (
        <Card className="glass-effect border-slate-700">
            <CardContent className="p-4 sm:p-6">
                 <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Buscar por nome, e-mail ou document..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-800 border-slate-600"
                            />
                        </div>
                    </div>
                    <div className="flex-1 sm:flex-none">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-600">
                                <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 </div>
            </CardContent>
        </Card>
    );
};

export default AgentFilters;