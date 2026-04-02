import React, { useState, useMemo, useEffect } from 'react';
import { PiggyBank, Wallet2, Building2, Layers, TrendingUp, BarChart3, Clock3, Activity, CheckCircle2, Filter, Clock, Users, X, Send } from 'lucide-react';
import KPI from '../KPI';
// Removed HotLeads & PredictiveAnalysis for streamlined executive view
import { appointmentService } from '@/services/appointmentService';
import { agentService } from '@/services/agentService';
import { useNotification } from '@/contexts/NotificationContext.jsx';

// Subcomponentes leves internos para evitar muitos arquivos agora
const MiniStat = ({ label, value, help, icon:Icon, color='text-slate-300' }) => (
  <div className="p-4 rounded bg-slate-800/40 border border-slate-700 flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wide text-slate-400 truncate">{label}</span>
      {Icon && <Icon className={`w-4 h-4 ${color}`} />}
    </div>
    <span className="text-lg font-semibold text-white leading-tight">{value}</span>
    {help && <span className="text-[10px] text-slate-500 leading-snug">{help}</span>}
  </div>
);

const SectionCard = ({ title, children, actions, className='' }) => (
  <div className={`rounded-lg bg-slate-900/50 border border-slate-700/60 backdrop-blur-sm shadow-sm flex flex-col ${className}`}>
    <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {actions}
    </div>
    <div className="p-4 overflow-auto flex-1">{children}</div>
  </div>
);

const ProgressBar = ({ value, max=100, color='emerald' }) => {
  const pct = Math.min(100, Math.round((value/max)*100));
  const colorClassMap = {
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-500'
  };
  const barClass = colorClassMap[color] || colorClassMap.emerald;

  return (
    <div className="w-full h-2 bg-slate-700/60 rounded overflow-hidden">
      <div className={`h-full ${barClass} transition-all`} style={{ width: pct+'%' }} />
      {/* Classes estáticas de salvaguarda para safelist: bg-emerald-500 bg-red-500 bg-yellow-500 bg-blue-500 bg-slate-500 */}
    </div>
  );
};

const AlertBadge = ({ severity }) => {
  const colors = { high:'bg-red-500', medium:'bg-yellow-500', low:'bg-blue-500' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[severity]||'bg-slate-500'}`}></span>;
};

const NumberFmt = ({ value, fallback='-' }) => {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  if (typeof value === 'number') return value.toLocaleString('pt-BR', { maximumFractionDigits:1 });
  return value;
};
const moneyCompact = (v) => {
  if (!v || !Number.isFinite(v) || v<=0) return 'R$ 0';
  if (v >= 1_000_000) return 'R$ ' + (v/1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return 'R$ ' + (v/1_000).toFixed(1) + 'K';
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits:0 });
};

// Componente focado na visão do administrador: KPIs consolidados, análises e ranking
export default function AdminDashboard({
  user,
  stats = [], // será descontinuado visualmente (linha antiga de KPIs removida)
  stalledDeals = [],
  nextActions = [],
  leads = [],
  propertySuggestions = [],
  pendingAppointments = [], // novo: lista completa de compromissos para painel da equipe
  loading = false,
  error = null,
  adminExtra = {},
}) {
  // Estados de colapso das seções principais (devem ficar antes de qualquer return condicional para respeitar Rules of Hooks)
  const [openFinanceiro, setOpenFinanceiro] = useState(true);
  const [openPerformance, setOpenPerformance] = useState(true);
  const [openOperacao, setOpenOperacao] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [activityTab, setActivityTab] = useState('hoje'); // hoje | amanha | atrasadas | concluidas
  // Modal notificação
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyAgent, setNotifyAgent] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const { addNotification } = useNotification?.() || { addNotification: ()=>{} };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800/60 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/40 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-800/40 rounded" />
          <div className="h-64 bg-slate-800/40 rounded" />
          <div className="h-64 bg-slate-800/40 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/40 border border-red-700 rounded text-red-200">
        Ocorreu um erro ao carregar o dashboard: {error}
      </div>
    );
  }

  const { 
    kpis = {}, 
    kpisProjetos = {}, 
    kpisPropriedades = {}, 
    projectStock = [], 
    todayActivities = [], 
    alerts = [], 
    agentRanking = [], 
    resume = {}, 
    funnelData = adminExtra.funnelData 
  } = adminExtra;

  // ================= RELATÓRIO RÁPIDO =================
  const [reportGenerating, setReportGenerating] = useState(false);
  const buildReportData = () => {
    return {
      generatedAt: new Date().toISOString(),
      user: { id: user?.id, name: user?.name, role: user?.role },
      kpis, kpisProjetos, kpisPropriedades,
      funnel: funnelData,
      alerts,
      topAgents: agentRanking,
      projectStock,
      activitiesSummary: {
        hoje: partitioned?.hoje?.length || 0,
        amanha: partitioned?.amanha?.length || 0,
        atrasadas: partitioned?.atrasadas?.length || 0,
        concluidas: partitioned?.concluidas?.length || 0,
      },
      resume,
    };
  };
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
  };
  const handleGenerateQuickReport = async () => {
    if (reportGenerating) return; setReportGenerating(true);
    try {
      const data = buildReportData();
      // JSON
      const jsonBlob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
      downloadBlob(jsonBlob, `relatorio_rapido_${Date.now()}.json`);
      // CSV simplificado (KPIs principais + resumo)
      const csvRows = [];
      csvRows.push('metric,value');
      Object.entries({ totalLeads:kpis.totalLeads, leadsHoje:kpis.leadsHoje, conversionRate:kpis.conversionRate, obras:kpisProjetos.totalObras, unidades:kpisProjetos.totalUnidades, propriedades:kpisPropriedades.totalPropriedades }).forEach(([k,v])=>{
        csvRows.push(`${k},${typeof v==='number'? v: (v||'')}`);
      });
      const csvBlob = new Blob([csvRows.join('\n')], { type:'text/csv' });
      downloadBlob(csvBlob, `relatorio_rapido_${Date.now()}.csv`);
    } catch(e) { console.warn('Falha ao gerar relatório rápido', e); }
    finally { setReportGenerating(false); }
  };

  // ===================== FETCH AGENTES =====================
  const [agentsFetched, setAgentsFetched] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState(null);
  useEffect(()=>{
    let active = true;
    const load = async () => {
      setAgentsLoading(true); setAgentsError(null);
      try {
        const list = await agentService.getAgents();
        if (!active) return; setAgentsFetched(Array.isArray(list)?list:[]);
      } catch(e) { if (active) setAgentsError(e.message||'Erro agentes'); }
      finally { if (active) setAgentsLoading(false); }
    };
    load();
    return ()=>{ active=false; };
  },[]);

  // ===================== ATIVIDADES DA EQUIPE (NOVA SEÇÃO) =====================
  const normalizeStatus = (s='') => s.toLowerCase();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(),23,59,59,999);
  const startOfTomorrow = new Date(endOfToday.getTime()+1);
  const endOfTomorrow = new Date(startOfTomorrow.getFullYear(), startOfTomorrow.getMonth(), startOfTomorrow.getDate(),23,59,59,999);

  const allActivities = Array.isArray(pendingAppointments) ? pendingAppointments : [];

  // Mapa de agentes derivado dos leads (cobre casos onde appointment não traz o nome, só o id)
  const agentNameMap = useMemo(()=>{
    const map = {};
    // Via leads
    (leads||[]).forEach(l => {
      const id = l.agent_id || l.agentId || l.usuario_id; if (!id) return;
      const name = l.agent_name || l.agent || l.agentName || l.usuario_nome || l.usuario_nome_completo;
      if (name && !map[id]) map[id] = name;
    });
    // Via fetch de agentes
    (agentsFetched||[]).forEach(a => {
      const id = a.id || a.ID; if (!id) return;
      const name = a.name || a.nome; if (name && !map[id]) map[id] = name;
    });
    return map;
  },[leads, agentsFetched]);

  const activitiesWithAgent = allActivities.map(a => {
    const rawId = a.agent_id || a.agentId || a.usuario_id || a.user_id;
    const resolvedName = a.agent_name || a.agent || agentNameMap[rawId] || (rawId ? `Agente #${rawId}` : null);
    return { ...a, agent_display: resolvedName || 'Agente não atribuído' };
  });
  try { if (process.env.NODE_ENV !== 'production') console.debug('[ATIVIDADES AGENTES MAP]', { sample: activitiesWithAgent.slice(0,3) }); } catch {}
  const agentOptions = useMemo(()=>{
    const set = new Map();
    // incluir todos agentes carregados
    (agentsFetched||[]).forEach(a=>{ const name = a.name || a.nome; if (name) set.set(name,name); });
    // incluir nomes derivados das atividades
    activitiesWithAgent.forEach(a=>{ if (a.agent_display) set.set(a.agent_display,a.agent_display); });
    return Array.from(set.keys()).sort();
  },[activitiesWithAgent, agentsFetched]);

  const partitioned = useMemo(()=>{
    const base = { hoje:[], amanha:[], atrasadas:[], concluidas:[] };
    activitiesWithAgent.forEach(a=>{
      const start = new Date(a.start || a.data_inicio || a.start_time || a.data);
      const status = normalizeStatus(a.status||'');
      const concluded = ['concluido','concluído','feito','finalizado'].includes(status);
      if (concluded) { base.concluidas.push(a); return; }
      if (start < startOfToday) { base.atrasadas.push(a); return; }
      if (start >= startOfToday && start <= endOfToday) { base.hoje.push(a); return; }
      if (start >= startOfTomorrow && start <= endOfTomorrow) { base.amanha.push(a); return; }
    });
    // Ordenações
    Object.keys(base).forEach(k=> base[k].sort((a,b)=> new Date(a.start) - new Date(b.start)) );
    return base;
  },[activitiesWithAgent]);

  const filteredCurrentList = (partitioned[activityTab]||[]).filter(a => selectedAgent==='all' || a.agent_display===selectedAgent);
  const urgentesCount = partitioned.atrasadas.length; // critério simples: atrasadas
  const proximasDuasHoras = useMemo(()=>{
    const limit = new Date(now.getTime()+2*3600*1000);
    return activitiesWithAgent.filter(a=>{
      const start = new Date(a.start || a.data_inicio);
      if (!start || isNaN(start)) return false;
      return start >= now && start <= limit;
    }).sort((a,b)=> new Date(a.start) - new Date(b.start));
  },[activitiesWithAgent]);

  const handleConcluir = async (act) => {
    try {
      await appointmentService.saveAppointment({ ...act, status:'Concluído' });
      // Mutação otimista simples: alterar localmente
      act.status = 'Concluído';
    } catch(e) { console.warn('Falha ao concluir atividade', e); }
  };

  // Modal Detalhes Atividade
  const [viewActivity, setViewActivity] = useState(null);
  const [updatingActivity, setUpdatingActivity] = useState(false);
  const closeActivityModal = () => { if(!updatingActivity) setViewActivity(null); };
  const handleUpdateActivity = async (patch) => {
    if(!viewActivity) return;
    setUpdatingActivity(true);
    try {
      const updated = { ...viewActivity, ...patch };
      await appointmentService.saveAppointment(updated);
      // Atualiza no array local
      const idx = activitiesWithAgent.findIndex(a=>a.id===updated.id);
      if(idx>-1) activitiesWithAgent[idx] = updated;
      setViewActivity(updated);
    } catch(err){ console.warn('Falha ao atualizar atividade', err);} finally { setUpdatingActivity(false);} }
  const handleQuickStatus = async (status) => {
    if(!viewActivity) return; await handleUpdateActivity({ status }); };

  const ActivityStatusBadge = ({ activity }) => {
    const status = normalizeStatus(activity.status||'');
    const start = new Date(activity.start || activity.data_inicio);
    const isLate = start < startOfToday && !['concluido','concluído'].includes(status);
    let label = activity.status || '—';
    if (isLate && !['cancelado','cancelada'].includes(status)) label = 'Atrasada';
    const colorMap = {
      atrasada:'bg-red-600/20 text-red-300 border-red-600/40',
      concluido:'bg-emerald-600/20 text-emerald-300 border-emerald-600/40',
      concluído:'bg-emerald-600/20 text-emerald-300 border-emerald-600/40',
      pendente:'bg-slate-600/20 text-slate-300 border-slate-600/40',
      confirmado:'bg-blue-600/20 text-blue-300 border-blue-600/40',
    };
    const key = label.toLowerCase();
    const cls = colorMap[key] || (label==='Atrasada' ? colorMap.atrasada : 'bg-slate-700/30 text-slate-300 border-slate-600/40');
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>;
  };

  const ActivitiesTeamSection = () => (
    <>
    <SectionCard title="Atividades da Equipe" actions={(
      <div className="flex items-center gap-3">
        <div className="relative">
          <select value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value)} className="bg-slate-800/60 text-xs pr-6 pl-7 py-1 rounded border border-slate-600/60 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="all">Todos os agentes</option>
            {agentOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <Users className="w-3.5 h-3.5 absolute left-1.5 top-1.5 text-slate-500" />
        </div>
  {agentsLoading && <span className="text-[10px] text-slate-500">Carregando agentes...</span>}
  {agentsError && <span className="text-[10px] text-red-400">{agentsError}</span>}
  {urgentesCount>0 && <span className="text-[10px] font-semibold bg-red-700/30 text-red-200 px-3 py-1 rounded-full border border-red-600/40">{urgentesCount} urgente{urgentesCount>1?'s':''}</span>}
      </div>
    )} className="xl:col-span-12">
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          {key:'hoje', label:`Hoje (${partitioned.hoje.length})`},
          {key:'amanha', label:`Amanhã (${partitioned.amanha.length})`},
          {key:'atrasadas', label:`Atrasadas (${partitioned.atrasadas.length})`},
          {key:'concluidas', label:`Concluídas (${partitioned.concluidas.length})`},
        ].map(t => (
          <button key={t.key} onClick={()=>setActivityTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border transition ${activityTab===t.key ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/40 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'}`}>{t.label}</button>
        ))}
      </div>
      <div className="space-y-4">
        {filteredCurrentList.map(act => {
          const start = act.start ? new Date(act.start) : null;
            return (
            <div key={act.id} className="rounded border border-slate-700/60 bg-slate-800/40 p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200 truncate" title={act.title||act.type}>{act.title || act.type || 'Atividade'}</span>
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{act.description || act.notes || '—'}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500">
                    <span>{act.agent_display}</span>
                    {act.lead_name && <span>Lead: {act.lead_name}</span>}
                    {act.property_title && <span>Imóvel: {act.property_title}</span>}
                    {start && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>}
                  </div>
                </div>
                <ActivityStatusBadge activity={act} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {normalizeStatus(act.status) !== 'concluido' && normalizeStatus(act.status) !== 'concluído' && (
                  <button onClick={()=>handleConcluir(act)} className="text-xs flex items-center gap-1 px-3 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como concluída
                  </button>
                )}
                <button onClick={()=>setViewActivity(act)} className="text-xs px-3 py-1 rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 border border-slate-600/50">Ver detalhes</button>
              </div>
            </div>
          );
        })}
        {!filteredCurrentList.length && <div className="text-xs text-slate-500">Nenhuma atividade nesta categoria.</div>}
      </div>
      <div className="mt-8 border-t border-slate-700/50 pt-4">
        <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Próximas 2 horas</h4>
        {proximasDuasHoras.length ? (
          <ul className="space-y-2 text-[11px]">
            {proximasDuasHoras.map(p=>{
              const st = p.start ? new Date(p.start) : null;
              return (
                <li key={p.id} className="flex items-center justify-between bg-slate-800/30 px-2 py-1.5 rounded border border-slate-700/40">
                  <span className="text-slate-300 truncate max-w-[60%]" title={p.title||p.type}>{p.title||p.type||'Atividade'}</span>
                  <span className="text-slate-500">{st? st.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : ''}</span>
                </li>
              );
            })}
          </ul>
        ) : <div className="text-[11px] text-slate-500">Nenhuma atividade nas próximas 2 horas</div>}
      </div>
    </SectionCard>
    {viewActivity && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeActivityModal} />
        <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-6 flex flex-col gap-5 text-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Activity className="w-4 h-4 text-slate-500" /> {viewActivity.title || viewActivity.type || 'Atividade'}</h3>
              <p className="text-[11px] text-slate-500 mt-1">ID: {viewActivity.id}</p>
            </div>
            <button onClick={closeActivityModal} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Título</span>
                <input disabled={updatingActivity} value={viewActivity.title||''} onChange={e=>setViewActivity(v=>({...v,title:e.target.value}))} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-200" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Descrição / Notas</span>
                <textarea disabled={updatingActivity} value={viewActivity.description||viewActivity.notes||''} onChange={e=>setViewActivity(v=>({...v, description:e.target.value}))} rows={4} className="resize-none bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-200" />
              </label>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400">Status</span>
                <select disabled={updatingActivity} value={viewActivity.status||''} onChange={e=>setViewActivity(v=>({...v,status:e.target.value}))} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-200">
                  {['Pendente','Confirmado','Concluído','Cancelado'].map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-400">Agente</span>
                <input disabled value={viewActivity.agent_display||'-'} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-400" />
              </div>
              {viewActivity.lead_name && <div className="flex flex-col gap-1"><span className="text-slate-400">Lead</span><input disabled value={viewActivity.lead_name} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-400" /></div>}
              {viewActivity.property_title && <div className="flex flex-col gap-1"><span className="text-slate-400">Imóvel</span><input disabled value={viewActivity.property_title} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-400" /></div>}
              <div className="flex flex-col gap-1">
                <span className="text-slate-400">Início</span>
                <input type="datetime-local" disabled={updatingActivity} value={viewActivity.start ? new Date(viewActivity.start).toISOString().slice(0,16) : ''} onChange={e=>setViewActivity(v=>({...v,start:new Date(e.target.value).toISOString()}))} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-200" />
              </div>
              {viewActivity.end && <div className="flex flex-col gap-1"><span className="text-slate-400">Fim</span><input disabled value={new Date(viewActivity.end).toLocaleString('pt-BR')} className="bg-slate-800/60 border border-slate-600/60 rounded px-2 py-1 text-slate-400" /></div>}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-slate-400">Ações Rápidas</span>
            <div className="flex flex-wrap gap-2">
              <button disabled={updatingActivity} onClick={()=>handleQuickStatus('Concluído')} className="px-3 py-1.5 text-[11px] rounded bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40">Concluir</button>
              <button disabled={updatingActivity} onClick={()=>handleQuickStatus('Cancelado')} className="px-3 py-1.5 text-[11px] rounded bg-red-600/30 hover:bg-red-600/40 text-red-200 border border-red-500/40">Cancelar</button>
              <button disabled={updatingActivity} onClick={()=>handleQuickStatus('Confirmado')} className="px-3 py-1.5 text-[11px] rounded bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40">Confirmar</button>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
            <button onClick={closeActivityModal} className="text-[11px] px-3 py-1.5 rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 border border-slate-600/50 disabled:opacity-50" disabled={updatingActivity}>Fechar</button>
            <div className="flex gap-3 items-center">
              {updatingActivity && <span className="text-[10px] text-emerald-400 animate-pulse">Salvando...</span>}
              <button disabled={updatingActivity} onClick={()=>handleUpdateActivity({ title:viewActivity.title, description:viewActivity.description, status:viewActivity.status, start:viewActivity.start })} className="text-[11px] px-4 py-1.5 rounded bg-emerald-600/50 hover:bg-emerald-600/60 text-emerald-100 border border-emerald-500/40 disabled:opacity-50">Salvar Alterações</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );

  // ================= EXECUTIVE SUMMARY COMPONENT (escopo superior) =================
  const ExecutiveSummary = ({ funnelData = [], resume = {}, kpis = {}, kpisProjetos = {}, kpisPropriedades = {}, agentRanking = [], projectStock = [] }) => {
    const [tab, setTab] = useState('funnel');
    const avgFunnelTime = resume.avgFunnelTimeDays || 0;
    const conversionPct = (kpis.conversionRate || 0) * 100;
    const unitsRemaining = kpisProjetos.unidadesDisponiveis || 0;
    const leadSources = resume.leadSources || [];
    const forecastMonth = resume.forecastMonth || 0;
    const closedThisMonth = resume.closedThisMonth || 0; // fechamentos realizados
    const ticketMedioGeral = (() => {
      const a = kpisProjetos.ticketMedioUnidade || 0;
      const b = kpisPropriedades.ticketMedioDisponivel || 0;
      if (a && b) return (a + b) / 2;
      return a || b || 0;
    })();
    const valorPrevistoMes = forecastMonth * ticketMedioGeral;
    const valorFechadoAteAgora = closedThisMonth * ticketMedioGeral;
    const goalPct = forecastMonth ? (closedThisMonth / forecastMonth) * 100 : 0;
    const weeklyActivity = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => ({ day: d, value: Math.round(Math.random() * 80) }));
    return (
      <section className="rounded-lg bg-slate-900/50 border border-slate-700/60 backdrop-blur-sm shadow-sm p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { k: 'funnel', label: 'Tempo no Funil' },
              { k: 'sources', label: 'Origens de Leads' },
              { k: 'forecast', label: 'Forecast de Vendas' },
              { k: 'performance', label: 'Performance' },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-4 py-2 rounded-md text-xs font-medium transition ${tab===t.k ? 'bg-blue-600/80 text-white shadow border border-blue-400/40' : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 border border-slate-600/40'}`}>{t.label}</button>
            ))}
          </div>
          <hr className="border-slate-700/60" />
        </div>
        {tab === 'funnel' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-semibold text-slate-200">{avgFunnelTime.toFixed(1)}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">Dias médios total</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-emerald-400">{conversionPct.toFixed(1)}%</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">Taxa de conversão</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-amber-300">{funnelData.reduce((a, f) => a + f.value, 0)}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">Leads ativos no funil</div>
              </div>
            </div>
            <div className="space-y-2">
              {(funnelData || []).map((f, i) => {
                const colors = ['text-blue-400', 'text-cyan-400', 'text-fuchsia-400', 'text-amber-400', 'text-emerald-400', 'text-rose-400'];
                return (
                  <div key={f.stage} className="flex items-center justify-between bg-slate-800/40 rounded px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${colors[i % colors.length].replace('text', 'bg')}`}></span>
                      <span className="text-slate-200 truncate">{f.stage}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-200 text-sm">{(Math.random() * 7 + 1).toFixed(1)} dias</span>
                      <span className="text-[10px] text-slate-500">em média</span>
                    </div>
                  </div>
                );
              })}
              {!funnelData?.length && <div className="text-xs text-slate-500">Sem dados de funil.</div>}
            </div>
            {funnelData?.length > 3 && (
              <div className="text-xs bg-blue-900/30 border border-blue-700/40 rounded px-4 py-3 text-blue-200">💡 <span className="font-semibold">Dica:</span> Revise etapas com tempo acima do esperado para acelerar conversões.</div>
            )}
          </div>
        )}
        {tab === 'sources' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Distribuição por Canal</h4>
              <div className="space-y-2">
                {(leadSources || []).map(src => (
                  <div key={src.source} className="flex items-center gap-3 bg-slate-800/40 rounded px-4 py-2 text-xs">
                    <span className="flex-1 text-slate-300 truncate">{src.source}</span>
                    <span className="text-slate-400">{src.count} <span className="text-[10px] text-slate-500">({src.pct.toFixed(1)}%)</span></span>
                  </div>
                ))}
                {!leadSources?.length && <div className="text-xs text-slate-500">Sem origens suficientes.</div>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Performance por Canal</h4>
              <div className="space-y-2">
                {(leadSources || []).map(src => (
                  <div key={src.source} className="flex items-center justify-between bg-slate-800/30 rounded px-4 py-2 text-xs">
                    <span className="text-slate-300 truncate max-w-[60%]">{src.source}</span>
                    <span className="text-slate-400">{src.count} leads</span>
                  </div>
                ))}
                {!leadSources?.length && <div className="text-xs text-slate-500">Sem dados.</div>}
              </div>
            </div>
          </div>
        )}
        {tab === 'forecast' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-slate-800/40 rounded p-4 flex flex-col gap-1"><span className="text-[10px] text-slate-500">Forecast (fechamentos)</span><span className="text-lg font-semibold text-slate-200">{forecastMonth}</span></div>
              <div className="bg-slate-800/40 rounded p-4 flex flex-col gap-1"><span className="text-[10px] text-slate-500">Fechados no mês</span><span className="text-lg font-semibold text-emerald-400">{closedThisMonth}</span></div>
              <div className="bg-slate-800/40 rounded p-4 flex flex-col gap-1"><span className="text-[10px] text-slate-500">Ticket Médio</span><span className="text-lg font-semibold text-sky-300">{moneyCompact(ticketMedioGeral)}</span></div>
              <div className="bg-slate-800/40 rounded p-4 flex flex-col gap-1"><span className="text-[10px] text-slate-500">Valor Previsto</span><span className="text-lg font-semibold text-slate-200">{moneyCompact(valorPrevistoMes)}</span></div>
              <div className="bg-slate-800/40 rounded p-4 flex flex-col gap-1"><span className="text-[10px] text-slate-500">Valor Real</span><span className="text-lg font-semibold text-emerald-400">{moneyCompact(valorFechadoAteAgora)}</span></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-slate-700/40 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(100, goalPct).toFixed(1)}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                  <span>{goalPct.toFixed(1)}% da meta</span>
                  <span>Restante: {Math.max(0, forecastMonth - closedThisMonth)}</span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 w-40">
                <div><span className="text-slate-300">Unid. disp.:</span> {unitsRemaining}</div>
                <div><span className="text-slate-300">Ticket mix:</span> {ticketMedioGeral ? moneyCompact(ticketMedioGeral) : '—'}</div>
              </div>
            </div>
            <div className="h-56 bg-slate-800/30 border border-slate-700/40 rounded flex items-center justify-center text-slate-500 text-xs">(Placeholder gráfico 6 meses forecast)</div>
          </div>
        )}
        {tab === 'performance' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Leads Captados', value: kpis.totalLeads || 0, goal: 200 },
                { label: 'Ligações Realizadas', value: 1240, goal: 1500 },
                { label: 'E-mails Enviados', value: 890, goal: 1000 },
                { label: 'Visitas Agendadas', value: 45, goal: 60 },
              ].map(card => {
                const pct = card.goal ? (card.value / card.goal) * 100 : 0;
                return (
                  <div key={card.label} className="bg-slate-800/40 rounded p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{card.label}</span>
                      <span className="text-slate-200 text-sm font-semibold">{card.value}</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct).toFixed(1)}%` }} /></div>
                    <span className="text-[10px] text-slate-500">Meta: {card.goal} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Atividade Semanal</h4>
                <div className="grid grid-cols-7 gap-2">
                  {weeklyActivity.map(a => (
                    <div key={a.day} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
                      <div className="w-full h-28 bg-slate-800/40 rounded flex items-end overflow-hidden"><div className="w-full bg-blue-500/70" style={{ height: `${Math.max(4, (a.value / 80) * 100)}%` }} /></div>
                      <span>{a.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Ranking Corretores</h4>
                <div className="space-y-2 text-xs">
                  {agentRanking.map(a => (
                    <div key={a.agentId} className="flex items-center justify-between bg-slate-800/40 rounded px-3 py-2">
                      <span className="text-slate-300 truncate max-w-[55%]">{a.agentName}</span>
                      <span className="text-emerald-400 font-medium">{a.performanceScore}</span>
                    </div>
                  ))}
                  {!agentRanking.length && <div className="text-slate-500 text-xs">Sem dados.</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };
  // ========================================================================

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white">Visão Administrativa</h1>
        <p className="text-slate-400 text-sm">Panorama consolidado de operação, performance e riscos.</p>
      </header>

      {/* KPIs Principais */}
      <div className="space-y-6">
        <div>
          <button onClick={()=>setOpenFinanceiro(o=>!o)} className="mb-2 text-xs tracking-wide font-semibold text-emerald-300 hover:text-emerald-200 transition">
            {openFinanceiro? '▾':'▸'} Indicadores Financeiros
          </button>
          {openFinanceiro && (
            <div className="space-y-5">
              {/* Linha 1: Obras & Unidades */}
              <div>
                <div className="text-[10px] tracking-wide uppercase text-slate-500 font-medium mb-2">Obras e Unidades</div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9 gap-4">
                  <MiniStat icon={Wallet2} color="text-emerald-400" label="Valor Disponível" value={moneyCompact(kpisProjetos.valorDisponivel||0)} help="Somente unidades disp." />
                  <MiniStat icon={PiggyBank} color="text-emerald-300" label="Ticket Médio" value={moneyCompact(kpisProjetos.ticketMedioUnidade||0)} help="Unidade disp." />
                  <MiniStat icon={Building2} color="text-sky-300" label="Obras / Unid." value={`${kpisProjetos.totalObras||0} / ${kpisProjetos.totalUnidades||0}`} help={moneyCompact(kpisProjetos.valorTotal||0)} />
                  <MiniStat icon={Layers} color="text-sky-400" label="Unid. Disponíveis" value={<NumberFmt value={kpisProjetos.unidadesDisponiveis} />} help={`${((kpisProjetos.absorcaoPct||0)*100).toFixed(1)}% absorção`} />
                  <MiniStat icon={Wallet2} color="text-emerald-400" label="Representatividade" value={`${((kpisProjetos.representatividadeValor||0)*100).toFixed(1)}%`} help="Valor portfólio" />
                </div>
              </div>
              {/* Linha 2: Propriedades Avulsas */}
              <div>
                <div className="text-[10px] tracking-wide uppercase text-slate-500 font-medium mb-2">Propriedades Avulsas</div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9 gap-4">
                  <MiniStat icon={Wallet2} color="text-amber-300" label="Valor Disponível" value={moneyCompact(kpisPropriedades.valorDisponivel||0)} help="Somente disp." />
                  <MiniStat icon={PiggyBank} color="text-amber-200" label="Ticket Médio" value={moneyCompact(kpisPropriedades.ticketMedioDisponivel||0)} help="Propr. disp." />
                  <MiniStat icon={Building2} color="text-amber-300" label="Total Propr." value={<NumberFmt value={kpisPropriedades.totalPropriedades} />} help={`${kpisPropriedades.disponiveis||0} D / ${kpisPropriedades.reservadas||0} R / ${kpisPropriedades.vendidas||0} V`} />
                  <MiniStat icon={Layers} color="text-amber-400" label="Disponíveis" value={<NumberFmt value={kpisPropriedades.disponiveis} />} help={moneyCompact(kpisPropriedades.valorTotal||0)} />
                  <MiniStat icon={Wallet2} color="text-amber-300" label="Representatividade" value={`${((kpisPropriedades.representatividadeValor||0)*100).toFixed(1)}%`} help="Valor portfólio" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <button onClick={()=>setOpenPerformance(o=>!o)} className="mb-2 text-xs tracking-wide font-semibold text-fuchsia-300 hover:text-fuchsia-200 transition">
            {openPerformance? '▾':'▸'} Performance Comercial
          </button>
          {openPerformance && (
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9 gap-4">
              <MiniStat icon={BarChart3} color="text-fuchsia-300" label="Total de Leads" value={<NumberFmt value={kpis.totalLeads} />} />
              <MiniStat icon={Activity} color="text-fuchsia-300" label="Leads Hoje" value={<NumberFmt value={kpis.leadsHoje} />} />
              <MiniStat icon={TrendingUp} color="text-fuchsia-300" label="Taxa Conversão" value={`${(kpis.conversionRate*100||0).toFixed(1)}%`} />
              <MiniStat icon={BarChart3} color="text-fuchsia-300" label="Forecast Fech." value={<NumberFmt value={resume.forecastMonth} />} help="Est. mês" />
              <MiniStat icon={Clock3} color="text-fuchsia-300" label="Tempo Funil" value={`${(resume.avgFunnelTimeDays||0).toFixed(1)}d`} />
            </section>
          )}
        </div>
        <div>
          <button onClick={()=>setOpenOperacao(o=>!o)} className="mb-2 text-xs tracking-wide font-semibold text-sky-300 hover:text-sky-200 transition">
            {openOperacao? '▾':'▸'} Operação & Atividade
          </button>
          {openOperacao && (
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9 gap-4">
              <MiniStat label="Top Origem" value={(resume.leadSources?.[0]?.source)||'-'} help={`${resume.leadSources?.[0]?.pct?.toFixed?.(1)||0}%`} />
              <MiniStat label="Atividades Hoje" value={<NumberFmt value={todayActivities.length} />} />
            </section>
          )}
        </div>
      </div>

      {/* Linha removida: KPIs antigos (Valor em Venda, etc.) substituída por painel de Atividades da Equipe */}

      {/* Nova Seção: Atividades da Equipe */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <ActivitiesTeamSection />
      </section>

      {/* Atalhos Rápidos (reposicionado para após Atividades) */}
      <section className="grid grid-cols-1">
        <SectionCard title="Atalhos Rápidos" className="col-span-1">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <button className="h-16 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition">Redistribuir Leads Sem Corretor</button>
            <button onClick={handleGenerateQuickReport} disabled={reportGenerating} className="h-16 rounded bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">{reportGenerating? 'Gerando...' : 'Gerar Relatório Rápido'}</button>
            <button className="h-16 rounded bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-medium transition">Criar Atividade em Massa</button>
            <button className="h-16 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition">Exportar CSV</button>
            <button onClick={()=>setNotifyOpen(true)} className="h-16 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition">Notificar Agente</button>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">(Próximo: adicionar modal para notificação e handlers reais)</p>
        </SectionCard>
      </section>

      {notifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={()=>!notifySending && setNotifyOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Enviar Notificação a um Agente</h3>
              <button onClick={()=>!notifySending && setNotifyOpen(false)} className="text-slate-400 hover:text-slate-200" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Agente</span>
                <select disabled={notifySending} value={notifyAgent} onChange={e=>setNotifyAgent(e.target.value)} className="bg-slate-800/60 border border-slate-600/60 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="">Selecione...</option>
                  {Object.entries(agentNameMap).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Mensagem</span>
                <textarea disabled={notifySending} value={notifyMessage} onChange={e=>setNotifyMessage(e.target.value)} rows={4} className="resize-none bg-slate-800/60 border border-slate-600/60 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500" placeholder="Ex: Por favor priorize o follow-up dos leads de ontem."></textarea>
              </label>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{notifyMessage.length}/500</span>
                {notifySending && <span className="text-emerald-400 animate-pulse">Enviando...</span>}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button disabled={notifySending} onClick={()=>setNotifyOpen(false)} className="text-xs px-3 py-2 rounded border border-slate-600/50 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 disabled:opacity-50">Cancelar</button>
              <button disabled={notifySending || !notifyAgent || !notifyMessage.trim()} onClick={async()=>{
                setNotifySending(true);
                try {
                  const agentId = notifyAgent;
                  const agentName = agentNameMap[agentId] || `Agente #${agentId}`;
                  addNotification?.({
                    type:'manual',
                    title:`Mensagem do Admin`,
                    description: notifyMessage.trim(),
                    agentName,
                    agentId
                  });
                  setNotifyMessage(''); setNotifyAgent(''); setNotifyOpen(false);
                } catch(e){ console.warn('Falha ao enviar notificação manual', e);} finally { setNotifySending(false);} }} className="text-xs px-4 py-2 rounded bg-indigo-600/60 hover:bg-indigo-600/70 text-indigo-100 border border-indigo-500/40 disabled:opacity-50 flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumo Executivo */}
      <ExecutiveSummary 
        funnelData={funnelData}
        resume={resume}
        kpis={kpis}
        kpisProjetos={kpisProjetos}
        kpisPropriedades={kpisPropriedades}
        agentRanking={agentRanking}
        projectStock={projectStock}
      />
    </div>
  );
}

// ============================================================================
// Notas Internas / Próximos Passos
// - Integrar pendingDocuments usando documentService para popular alertas de docs.
// - Implementar handlers reais dos botões de atalhos (redistribuir leads, etc.).
// - Possível extra: gráfico de origem de leads (pie / bar) usando lib leve.
// - Adicionar drill-down ao clicar em obra no estoque para abrir modal detalhado.
// - Considerar memoização externa se performance degradar com muitos registros.
// - Internacionalização futura: extrair strings para arquivo de i18n.
// - Acessibilidade: adicionar aria-labels e roles em botões e tabelas.
// ============================================================================
