
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Building, Table, Grid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusColor, getStatusColorDetails } from '@/lib/propertyUtils';
import { unitService } from '@/services/unitService'; // Crie esse service para consumir a API de units


const ProjectUnitsView = ({ project }) => {
    const navigate = useNavigate();
    // normalize units to support both English (API) and Portuguese (UI) keys
    const normalizeUnit = (u) => {
        if (!u || typeof u !== 'object') return u;
        const unit = { ...u };
        // tower id
        if (unit.torre_id == null && unit.tower_id != null) unit.torre_id = unit.tower_id;
        if (unit.tower_id == null && unit.torre_id != null) unit.tower_id = unit.torre_id;
        // unit number
        if (unit.numero_unidade == null && unit.unit_number != null) unit.numero_unidade = String(unit.unit_number);
        if (unit.unit_number == null && unit.numero_unidade != null) unit.unit_number = unit.numero_unidade;
        // floor / pavimento
        if ((unit.pavimento == null || unit.pavimento === '') && unit.floor != null) unit.pavimento = String(unit.floor) + 'º andar';
        if ((unit.floor == null || unit.floor === '') && unit.pavimento != null) {
            const parsed = parseInt(String(unit.pavimento).replace(/[^0-9]/g, ''));
            if (!Number.isNaN(parsed)) unit.floor = parsed;
        }
        // type
        if (unit.tipo == null && unit.type != null) unit.tipo = unit.type;
        if (unit.type == null && unit.tipo != null) unit.type = unit.tipo;
        // area
        if (unit.area_privativa == null && unit.area_private != null) unit.area_privativa = unit.area_private;
        if (unit.area_private == null && unit.area_privativa != null) unit.area_private = unit.area_privativa;
        if (unit.area_total == null && unit.area_total == null && unit.area_total == null) {
            // noop
        }
        // price/valor
        if (unit.valor == null && unit.price != null) unit.valor = unit.price;
        if (unit.price == null && unit.valor != null) unit.price = unit.valor;
        // status
        if (unit.status_venda == null && unit.sale_status != null) unit.status_venda = unit.sale_status;
        if (unit.sale_status == null && unit.status_venda != null) unit.sale_status = unit.status_venda;
        // specific features
        if (unit.caracteristicas_especificas == null && unit.specific_features != null) unit.caracteristicas_especificas = unit.specific_features;
        if (unit.specific_features == null && unit.caracteristicas_especificas != null) unit.specific_features = unit.caracteristicas_especificas;
        // bedrooms/bathrooms
        if (unit.quartos == null && unit.bedrooms != null) unit.quartos = unit.bedrooms;
        if (unit.bedrooms == null && unit.quartos != null) unit.bedrooms = unit.quartos;
        return unit;
    };
    const [units, setUnits] = useState(Array.isArray(project.units) ? project.units.map(normalizeUnit) : []);
    const [loading, setLoading] = useState(false);
    const towersSafe = Array.isArray(project.towers) ? project.towers : [];
    // default to showing all units; allow filtering by tower if towers exist
    const [activeTab, setActiveTab] = useState('all-units');
    const [viewMode, setViewMode] = useState('grid');
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        floor: 'all'
    });

    useEffect(() => {
        let mounted = true;
        async function fetchUnits() {
            setLoading(true);
            try {
                const data = await unitService.getUnitsByProject(project.id);
                if (mounted && Array.isArray(data)) setUnits(data.map(normalizeUnit));
            } catch (e) {
                // Trate erro
            }
            if (mounted) setLoading(false);
        }
        // Só buscar se não houver units embutidas
        if (!Array.isArray(project.units) || project.units.length === 0) {
            fetchUnits();
        }
        return () => { mounted = false };
    }, [project.id, project.units]);

    const getUnitsForTab = () => {
        if (activeTab === 'all-units') return units;
        return units.filter(u => String(u.torre_id) === String(activeTab) || String(u.tower_id) === String(activeTab));
    };

    // Filters
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const filteredUnits = getUnitsForTab().filter(u => {
        const matchesSearch = filters.search === '' || (u.numero_unidade && String(u.numero_unidade).toLowerCase().includes(filters.search.toLowerCase()));
        const matchesStatus = filters.status === 'all' || (u.status_venda === filters.status || u.sale_status === filters.status);
        const matchesFloor = filters.floor === 'all' || String(u.pavimento) === String(filters.floor) || String(u.floor) === String(filters.floor);
        return matchesSearch && matchesStatus && matchesFloor;
    });


    const floors = [...new Set(units.map(u => u.pavimento).filter(Boolean))].sort((a, b) => parseInt(String(a).replace(/[^0-9]/g, '')) - parseInt(String(b).replace(/[^0-9]/g, '')));

    const UnitCard = ({ unit }) => {
        const statusColor = getStatusColorDetails(unit.status_venda);
        const handleUnitClick = () => {
            navigate(`/properties/project/${project.id}/unit/${unit.id}`);
        };

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div 
                            onClick={handleUnitClick}
                            className={`p-2 rounded text-center cursor-pointer transition-all border-2 ${statusColor.bg} ${statusColor.border} hover:scale-105 hover:shadow-lg`}
                        >
                            <p className={`font-bold text-sm ${statusColor.text}`}>{unit.numero_unidade}</p>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white border-slate-700">
                        <p>Unidade: {unit.numero_unidade}</p>
                        <p>Tipo: {unit.tipo}</p>
                        <p>Status: <span className="capitalize">{unit.status_venda}</span></p>
                        <p>Valor: R$ {Number(unit.valor).toLocaleString('pt-BR')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    const renderUnits = () => {
        if (viewMode === 'grid') {
            return (
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {filteredUnits.map(unit => <UnitCard key={unit.id} unit={unit} />)}
                </div>
            )
        }
        return (
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left p-2">Unidade</th>
                            <th className="text-left p-2">Andar</th>
                            <th className="text-left p-2">Tipo</th>
                            <th className="text-right p-2">Área (m²)</th>
                            <th className="text-right p-2">Valor (R$)</th>
                            <th className="text-center p-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUnits.map(unit => (
                            <tr key={unit.id} className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer" onClick={() => navigate(`/properties/project/${project.id}/unit/${unit.id}`)}>
                                <td className="p-2 font-semibold">{unit.numero_unidade}</td>
                                <td className="p-2">{unit.pavimento}</td>
                                <td className="p-2">{unit.tipo}</td>
                                <td className="p-2 text-right">{unit.area_privativa}</td>
                                <td className="p-2 text-right font-bold text-blue-400">{Number(unit.valor).toLocaleString('pt-BR')}</td>
                                <td className="p-2 text-center"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(unit.status_venda)} capitalize`}>{unit.status_venda}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        )
    }

    return (
        <Card className="glass-effect border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">Unidades do Empreendimento</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={String(activeTab)} onValueChange={(val) => setActiveTab(Number(val) || val)} className="w-full">
                    <TabsList>
                        <TabsTrigger value="all-units"><Building className="w-4 h-4 mr-2"/>Todas as Unidades</TabsTrigger>
                        {towersSafe.length > 0 && towersSafe.map(tower => (
                            <TabsTrigger key={tower.id} value={String(tower.id)}><Building className="w-4 h-4 mr-2"/>{tower.name || `Torre ${tower.id}`}</TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <div className="my-4 p-4 rounded-lg bg-slate-900/50 flex flex-wrap gap-4 items-center">
                        <div className="relative flex-grow min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><Input placeholder="Buscar unidade..." className="pl-10" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)}/></div>
                        <Select value={filters.status} onValueChange={val => handleFilterChange('status', val)}><SelectTrigger className="flex-grow min-w-[150px]"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="disponível">Disponível</SelectItem>
                                <SelectItem value="em negociação">Em Negociação</SelectItem>
                                <SelectItem value="reservado">Reservado</SelectItem>
                                <SelectItem value="vendido">Vendido</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filters.floor} onValueChange={val => handleFilterChange('floor', val)}><SelectTrigger className="flex-grow min-w-[150px]"><SelectValue/></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="all">Todos os Andares</SelectItem>
                                {floors.map(floor => <SelectItem key={floor} value={String(floor)}>{floor}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="flex border border-slate-600 rounded-md">
                            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}><Grid className="w-4 h-4"/></Button>
                            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('table')}><Table className="w-4 h-4"/></Button>
                        </div>
                    </div>

                    <TabsContent value={String(activeTab)} className="mt-4">
                        {filteredUnits.length > 0 ? renderUnits() : <p className="text-center text-slate-400 py-8">Nenhuma unidade encontrada com os filtros atuais.</p>}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default ProjectUnitsView;
  