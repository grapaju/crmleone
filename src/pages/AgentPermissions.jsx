import React, { useEffect, useState } from 'react';
import { propertyService } from '@/services/propertyService';
import { propertyAccessService } from '@/services/propertyAccessService';
import { projectService } from '@/services/projectService';
import { projectAccessService } from '@/services/projectAccessService';
import { unitAccessService } from '@/services/unitAccessService';
import { unitService } from '@/services/unitService';
import { agentService } from '@/services/agentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Save, Search, Filter, RefreshCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AgentPermissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [unitsByProject, setUnitsByProject] = useState({}); // {projectId: units[]}
  const [selectedAgent, setSelectedAgent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grantedProps, setGrantedProps] = useState(new Set());
  const [grantedProjects, setGrantedProjects] = useState(new Set());
  const [grantedUnits, setGrantedUnits] = useState(new Set());
  const [search, setSearch] = useState('');
  const [selectAllState, setSelectAllState] = useState(false);
  const [activeTab, setActiveTab] = useState('properties'); // properties | projects
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [loadingUnits, setLoadingUnits] = useState(new Set()); // ids de projetos carregando unidades

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [agentsRes, propsRes, projRes] = await Promise.all([
          agentService.getAgents?.() || fetch('/api/agents.php').then(r=>r.json()),
          propertyService.getProperties(),
          projectService.getProjects().catch(()=>[])
        ]);
        const ag = Array.isArray(agentsRes) ? agentsRes : (agentsRes?.data || agentsRes?.agents || []);
        const pr = Array.isArray(propsRes) ? propsRes : (propsRes?.data || propsRes?.properties || []);
        const pjOuter = Array.isArray(projRes) ? projRes : (projRes?.data || projRes?.projects || []);
        const pj = pjOuter.filter(p => (p.propertyType||p.property_type)==='project' || p.projectName || p.project_name);
        setAgents(ag.filter(a => a.role !== 'admin')); // ocultar admin
        setProperties(pr);
        setProjects(pj);
      } catch(e) {
        toast({ title: 'Erro ao carregar dados', description: e.message, variant: 'destructive'});
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadAllPerms = async () => {
      if(!selectedAgent){
        setGrantedProps(new Set());
        setGrantedProjects(new Set());
        setGrantedUnits(new Set());
        return;
      }
      setLoadingPerms(true);
      try {
        const [propIds, projIds, unitIds] = await Promise.all([
          propertyAccessService.getAccessiblePropertyIds(selectedAgent).catch(()=>[]),
          projectAccessService.get(selectedAgent).catch(()=>[]),
          unitAccessService.get(selectedAgent).catch(()=>[])
        ]);
        setGrantedProps(new Set((propIds||[]).map(Number)));
  setGrantedProjects(new Set((projIds||[]).map(Number)));
  setGrantedUnits(new Set((unitIds||[]).map(Number)));
      } catch(e) {
        toast({ title: 'Erro ao carregar permissões', description: e.message, variant: 'destructive'});
      }
      setLoadingPerms(false);
    };
    loadAllPerms();
  }, [selectedAgent]);

  const toggleProperty = (id) => {
    setGrantedProps(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };
  const toggleProject = (id) => {
    setGrantedProjects(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };
  const toggleUnit = (id) => {
    setGrantedUnits(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };

  const handleSave = async () => {
    if(!selectedAgent) return;
    setSaving(true);
    try {
      await Promise.all([
        propertyAccessService.setAccessiblePropertyIds(selectedAgent, Array.from(grantedProps)),
        projectAccessService.set(selectedAgent, Array.from(grantedProjects)),
        unitAccessService.set(selectedAgent, Array.from(grantedUnits))
      ]);
      toast({ title: 'Permissões salvas', description: 'Todas as permissões foram atualizadas.' });
    } catch(e) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive'});
    }
    setSaving(false);
  };

  const baseList = activeTab==='properties' ? properties : projects;

  const filtered = baseList.filter(p => {
    const q = search.toLowerCase();
    const title = (p.title || '').toLowerCase();
    const addr = (p.address || '').toLowerCase();
    return title.includes(q) || addr.includes(q);
  });

  const handleSelectAll = () => {
    if (selectAllState) {
      if(activeTab==='properties') setGrantedProps(new Set());
      else setGrantedProjects(new Set());
      setSelectAllState(false);
    } else {
      const ids = filtered.map(p => Number(p.id));
      if(activeTab==='properties') setGrantedProps(new Set(ids));
      else setGrantedProjects(new Set(ids));
      setSelectAllState(true);
    }
  };

  useEffect(() => {
    const allIds = filtered.map(p => Number(p.id));
    if(allIds.length === 0) { setSelectAllState(false); return; }
    const setRef = activeTab==='properties' ? grantedProps : grantedProjects;
    const allSelected = allIds.every(id => setRef.has(id));
    setSelectAllState(allSelected);
  }, [filtered, grantedProps, grantedProjects, activeTab]);

  const loadUnitsForProject = async (projectId) => {
    if(unitsByProject[projectId] || loadingUnits.has(projectId)) return; // cached ou carregando
    setLoadingUnits(prev => new Set(prev).add(projectId));
    try {
      const units = await unitService.getUnitsByProject(projectId);
      setUnitsByProject(prev => ({...prev, [projectId]: units}));
    } catch(e) {
      // silencioso
    } finally {
      setLoadingUnits(prev => { const n=new Set(prev); n.delete(projectId); return n; });
    }
  };

  const toggleExpandProject = (projectId) => {
    setExpandedProjects(prev => {
      const n = new Set(prev);
      if (n.has(projectId)) n.delete(projectId); else n.add(projectId);
      return n;
    });
    loadUnitsForProject(projectId);
  };

  const tabButton = (id,label) => (
    <button onClick={()=>setActiveTab(id)} className={`px-4 py-2 rounded-md text-sm font-medium border ${activeTab===id? 'bg-blue-600 text-white border-blue-500':'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>{label}</button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Permissões de Acesso</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSelectAll} disabled={!selectedAgent || loading} className="border-slate-600 text-slate-300 hover:text-white">
            {selectAllState ? 'Limpar Seleção' : 'Selecionar Todos'}
          </Button>
          <Button onClick={handleSave} disabled={!selectedAgent || saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
            Salvar
          </Button>
        </div>
      </div>
      <Card className="glass-effect border-slate-700">
        <CardContent className="p-6 space-y-6">
          <div className="flex gap-2 flex-wrap">
            {tabButton('properties','Imóveis Avulsos')}
            {tabButton('projects','Empreendimentos / Unidades')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Agente</label>
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full rounded bg-slate-800 border border-slate-600 text-white p-2 focus:outline-none focus:ring focus:ring-blue-600/30">
                <option value="">Selecione um agente...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-slate-300">Buscar {activeTab==='properties'?'Imóveis':'Empreendimentos / Unidades'}</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Título ou endereço..." className="w-full pl-9 rounded bg-slate-800 border border-slate-600 text-white p-2 focus:outline-none focus:ring focus:ring-blue-600/30" />
              </div>
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {(loading || loadingPerms) && <p className="text-slate-400 text-sm">Carregando...</p>}
            {!(loading||loadingPerms) && selectedAgent && filtered.length === 0 && (
              <p className="text-slate-400 text-sm">Nenhum item encontrado com o filtro.</p>
            )}
            {!(loading||loadingPerms) && !selectedAgent && (
              <p className="text-slate-500 text-sm">Selecione um agente para visualizar e editar permissões.</p>
            )}
            {!(loading||loadingPerms) && selectedAgent && activeTab==='properties' && filtered.map(p => {
              const checked = grantedProps.has(Number(p.id));
              return (
                <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${checked ? 'border-blue-500/40 bg-blue-600/10' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}> 
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-sm">{p.title}</span>
                    <span className="text-xs text-slate-400">{p.address}</span>
                  </div>
                  <button onClick={() => toggleProperty(Number(p.id))} className={`w-6 h-6 rounded border flex items-center justify-center ${checked ? 'bg-blue-600 border-blue-500' : 'border-slate-500 bg-slate-700 hover:bg-slate-600'}`} aria-label={checked ? 'Remover acesso' : 'Conceder acesso'}>
                    {checked && <Check className="w-4 h-4 text-white" />}
                  </button>
                </div>
              );
            })}
            {!(loading||loadingPerms) && selectedAgent && activeTab==='projects' && filtered.map(p => {
              const projectId = Number(p.id);
              const checkedProject = grantedProjects.has(projectId);
              const expanded = expandedProjects.has(projectId);
              const units = unitsByProject[projectId] || [];
              const projectMatchesSearch = true; // já filtrado
              // Se busca contém algo e quiser filtrar por unidades também, já foi tratado antes ao incluir projeto quando qualquer campo casa (simplificado).
              // Botão expandir
              return (
                <div key={projectId} className="border border-slate-700 rounded-lg bg-slate-800/50">
                  <div className={`flex items-center justify-between px-4 py-3 cursor-pointer ${expanded? 'bg-slate-800':'hover:bg-slate-800/70'}`} onClick={()=>toggleExpandProject(projectId)}>
                    <div className="flex flex-col pr-4">
                      <span className="text-white font-medium text-sm">{p.title || p.projectName || p.project_name}</span>
                      <span className="text-xs text-slate-400">{p.address || `${p.cidade||p.city||''}`}</span>
                      <span className="text-[10px] text-slate-500">{units.length>0? `${units.length} unidades` : loadingUnits.has(projectId)? 'Carregando unidades...' : 'Clique para visualizar unidades'}</span>
                    </div>
                    <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>toggleProject(projectId)} className={`w-6 h-6 rounded border flex items-center justify-center ${checkedProject ? 'bg-blue-600 border-blue-500' : 'border-slate-500 bg-slate-700 hover:bg-slate-600'}`} aria-label={checkedProject ? 'Remover acesso a empreendimento' : 'Conceder acesso a empreendimento'}>
                        {checkedProject && <Check className="w-4 h-4 text-white" />}
                      </button>
                      <button className="text-xs text-slate-300 border border-slate-600 px-2 py-1 rounded hover:bg-slate-700" onClick={()=>toggleExpandProject(projectId)}>{expanded? 'Fechar':'Unidades'}</button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-4 pb-3 space-y-2 mt-1">
                      {loadingUnits.has(projectId) && <p className="text-slate-400 text-xs">Carregando unidades...</p>}
                      {!loadingUnits.has(projectId) && units.length === 0 && <p className="text-slate-500 text-xs">Nenhuma unidade encontrada.</p>}
                      {!loadingUnits.has(projectId) && units.length>0 && units
                        .filter(u => {
                          if(!search) return true; // search aplicado antes só a projetos; opcional filtrar unidades aqui
                          const q = search.toLowerCase();
                          return String(u.numero_unidade||u.unit_number||u.id).toLowerCase().includes(q);
                        })
                        .map(u => {
                          const unitId = Number(u.id);
                          const checkedUnit = grantedUnits.has(unitId);
                          return (
                            <div key={unitId} className={`flex items-center justify-between pl-2 pr-2 py-2 rounded-md border text-xs ${checkedUnit ? 'border-blue-500/40 bg-blue-600/10' : 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'}`}> 
                              <div className="flex flex-col">
                                <span className="text-white font-medium">Unidade {u.numero_unidade||u.unit_number||unitId}</span>
                                {u.status_venda && <span className="text-[10px] text-slate-400">Status: {u.status_venda}</span>}
                              </div>
                              <button onClick={()=>toggleUnit(unitId)} className={`w-5 h-5 rounded border flex items-center justify-center ${checkedUnit ? 'bg-blue-600 border-blue-500' : 'border-slate-500 bg-slate-700 hover:bg-slate-600'}`} aria-label={checkedUnit ? 'Remover acesso a unidade' : 'Conceder acesso a unidade'}>
                                {checkedUnit && <Check className="w-3 h-3 text-white" />}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPermissions;
