import React, { useState, useEffect } from 'react';
import { DollarSign, FileCheck, Hourglass, UserPlus } from 'lucide-react';
import AdminDashboard from '@/components/dashboard/admin/AdminDashboard';
import AgentDashboard from '@/components/dashboard/agent/AgentDashboard';
import FunnelChart from '@/components/dashboard/admin/FunnelChart';
import ResponseSla from '@/components/dashboard/admin/ResponseSla';
import { leadService } from '@/services/leadService';
import { propertyService } from '@/services/propertyService';
import { projectService } from '@/services/projectService';
import { unitService } from '@/services/unitService';
import { appointmentService } from '@/services/appointmentService';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext.jsx';
import { differenceInDays } from 'date-fns';
import { generateNextActionsForLeads } from '@/lib/leadsTip.js';

// Dashboard reconstruído após corrupção do arquivo anterior
const Dashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [leads, setLeads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);
  const [rawUnits, setRawUnits] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);

  // Carrega leads e propriedades
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsResp, propsResp, projectsResp, unitsResp] = await Promise.all([
          leadService.getLeadsWithScore(),
          propertyService.getProperties(),
          projectService.getProjects(),
          unitService.getUnits(),
        ]);
        let allLeads = Array.isArray(leadsResp) ? leadsResp : (Array.isArray(leadsResp?.value) ? leadsResp.value : []);
        let allProperties = propsResp;
        if (!Array.isArray(allProperties)) {
          allProperties = Array.isArray(allProperties?.data) ? allProperties.data : (Array.isArray(allProperties?.properties) ? allProperties.properties : []);
        }
        const allProjects = Array.isArray(projectsResp) ? projectsResp : [];
        const allUnits = Array.isArray(unitsResp) ? unitsResp : [];
        setLeads(allLeads);
        setProperties(allProperties);
        setRawProjects(allProjects);
        setRawUnits(allUnits);
        if (user?.role === 'admin') {
          setFilteredLeads(allLeads);
        } else {
          setFilteredLeads(allLeads.filter(l => String(l.agent_id ?? l.agentId ?? l.usuario_id) === String(user?.id)));
        }
      } catch (e) {
        console.warn('Erro ao carregar dados do dashboard:', e);
        setLeads([]); setProperties([]); setFilteredLeads([]); setRawProjects([]); setRawUnits([]);
      }
    };
    fetchData();
  }, [user]);

  // Carrega compromissos
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const all = await appointmentService.getAppointments();
        console.log('DASHBOARD appointments:', all);
        const filtered = (all || []).filter(a => user?.role === 'admin' || String(a.agent_id) === String(user?.id));
        setPendingAppointments(filtered);
      } catch (e) {
        console.warn('Erro ao buscar agendamentos:', e);
        setPendingAppointments([]);
      }
    };
    fetchAppointments();
  }, [user]);

  const safeProperties = Array.isArray(properties) ? properties : [];
  const safeFilteredLeads = Array.isArray(filteredLeads) ? filteredLeads : [];

  // Métricas
  // Helper para normalizar preço (evita concatenar string com número)
  const normalizePrice = (raw) => {
    if (raw === null || raw === undefined) return 0;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    if (typeof raw === 'string') {
      let s = raw.trim();
      if (!s) return 0;
      // Remove símbolos de moeda e espaços
      s = s.replace(/[^0-9.,-]/g, '');
      // Casos simples: só dígitos
      if (/^\d+$/.test(s)) return Number(s);
      // Heurística: identificar separador decimal como o último '.' ou ',' que tenha 1-2 dígitos após
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      let decimalSep = null;
      if (lastComma !== -1 && lastDot !== -1) {
        // Ambos existem: decimal é o que estiver mais à direita
        decimalSep = lastComma > lastDot ? ',' : '.';
      } else if (lastComma !== -1) {
        // Só vírgula existe e há 1-2 dígitos depois -> decimal
        if (/,[0-9]{1,2}$/.test(s)) decimalSep = ',';
      } else if (lastDot !== -1) {
        if (/\.[0-9]{1,2}$/.test(s)) decimalSep = '.';
      }
      // Remove separadores de milhar assumindo que qualquer '.' ou ',' que não seja decimal é milhar
      if (decimalSep) {
        if (decimalSep === ',') {
          // remove todos os '.' e todas as ',' exceto a última (decimal)
          s = s.replace(/\./g, '');
          const parts = s.split(',');
            if (parts.length > 1) {
              const dec = parts.pop();
              s = parts.join('') + '.' + dec; // converte decimal para ponto
            }
        } else if (decimalSep === '.') {
          s = s.replace(/,/g, '');
          // já está em formato com ponto decimal, apenas remover milhares restantes
          const splits = s.split('.');
          if (splits.length > 2) {
            const dec = splits.pop();
            s = splits.join('') + '.' + dec;
          }
        }
      } else {
        // Sem decimal claro: remover todos separadores
        s = s.replace(/[.,]/g,'');
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };
  const statusDisponivel = (s) => {
    if (!s) return false; const sl = s.toLowerCase();
    return sl === 'disponível' || sl === 'disponivel' || sl === 'ativo';
  };
  const statusVendido = (s) => { if (!s) return false; const sl=s.toLowerCase(); return sl.startsWith('vend'); };
  const statusReservado = (s) => { if (!s) return false; const sl=s.toLowerCase(); return sl.startsWith('reserv'); };
    // Algumas unidades usam sale_status em vez de status
    const resolveStatus = (p) => (p.status || p.sale_status || p.projectStatus || '').trim();

  const totalPropertyValue = safeProperties
    .filter(p => statusDisponivel(p.status) || (p.projectStatus && p.projectStatus.toLowerCase().includes('venda')))
    .reduce((acc, p) => acc + normalizePrice(p.valor ?? p.price), 0);
  const soldPropertyValue = safeProperties
    .filter(p => statusVendido(p.status))
    .reduce((a, p) => a + normalizePrice(p.valor ?? p.price), 0);
  const reservedPropertiesCount = safeProperties.filter(p => statusReservado(p.status)).length;
  const brMoney = (val) => {
    if (!Number.isFinite(val) || val <= 0) return 'R$ 0';
    if (val >= 1_000_000) return 'R$ ' + (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return 'R$ ' + (val / 1_000).toFixed(1) + 'K';
    return 'R$ ' + val.toLocaleString('pt-BR');
  };
  const stats = [
    { title: 'Valor em Venda', value: brMoney(totalPropertyValue), icon: DollarSign, color: 'text-green-500', trend: 'up' },
    { title: 'Total Vendido', value: brMoney(soldPropertyValue), icon: FileCheck, color: 'text-blue-500', trend: 'up' },
    { title: 'Meus Leads Quentes', value: safeFilteredLeads.filter(l => l.score >= 80).length, icon: UserPlus, color: 'text-red-500', trend: 'up' },
    { title: 'Imóveis Reservados', value: reservedPropertiesCount, icon: Hourglass, color: 'text-yellow-500', trend: 'down' },
  ];

  const stalledDeals = safeFilteredLeads
    .filter(lead => {
      const lastContactDays = differenceInDays(new Date(), new Date(lead.lastContact));
      return lastContactDays > 7 && lead.score > 50 && !['Fechamento','Perdido'].includes(lead.status);
    })
    .map(lead => ({ leadId: lead.id, leadName: lead.name, days: differenceInDays(new Date(), new Date(lead.lastContact)) }))
    .sort((a,b) => b.days - a.days);

  console.log('DASHBOARD safeFilteredLeads:', safeFilteredLeads);
  safeFilteredLeads.forEach((lead, idx) => console.log(`DASHBOARD lead[${idx}]:`, lead));
  const nextActions = generateNextActionsForLeads(safeFilteredLeads, { max: 6, now: new Date() });
  console.log('DASHBOARD nextActions:', nextActions);

  // Sugestões
  const [snoozedMap, setSnoozedMap] = useState(() => { try { return JSON.parse(localStorage.getItem('crm_suggestions_snoozed')||'{}'); } catch { return {}; } });
  const [ignoredSet, setIgnoredSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem('crm_suggestions_ignored')||'[]')); } catch { return new Set(); } });
  const persistSnooze = (m) => { try { localStorage.setItem('crm_suggestions_snoozed', JSON.stringify(m)); } catch {} };
  const persistIgnored = (s) => { try { localStorage.setItem('crm_suggestions_ignored', JSON.stringify(Array.from(s))); } catch {} };

  const effectiveSuggestions = React.useMemo(() => {
    const nowTs = Date.now();
    return (nextActions||[]).filter(s => {
      const key = `${s.leadId}:${s.type}`;
      if (ignoredSet.has(key)) return false;
      const snoozedUntil = snoozedMap[key];
      if (snoozedUntil && snoozedUntil > nowTs) return false;
      return true;
    });
  }, [nextActions, snoozedMap, ignoredSet]);

  const hiddenSuggestionCount = React.useMemo(() => {
    const nowTs = Date.now();
    return (nextActions||[]).reduce((acc,s) => {
      const key = `${s.leadId}:${s.type}`;
      const snoozedUntil = snoozedMap[key];
      if (ignoredSet.has(key)) return acc+1;
      if (snoozedUntil && snoozedUntil > nowTs) return acc+1;
      return acc;
    },0);
  }, [nextActions, snoozedMap, ignoredSet]);

  const handleSuggestionSchedule = (s) => { try { sessionStorage.setItem('pre_schedule_context', JSON.stringify(s)); } catch {} };
  const handleSuggestionSnooze = (s,days) => { const key=`${s.leadId}:${s.type}`; const nextTs=Date.now()+days*86400000; setSnoozedMap(m=>{ const nm={...m,[key]:nextTs}; persistSnooze(nm); return nm;}); };
  const handleSuggestionIgnore = (s) => { const key=`${s.leadId}:${s.type}`; setIgnoredSet(set=>{ const n=new Set(set); n.add(key); persistIgnored(n); return n;}); };
  const handleSuggestionResetAll = () => { setSnoozedMap({}); setIgnoredSet(new Set()); try { localStorage.removeItem('crm_suggestions_snoozed'); } catch {}; try { localStorage.removeItem('crm_suggestions_ignored'); } catch {}; };

  // Construção das atividades do Kanban
  const kanbanActivities = React.useMemo(() => {
    if (!Array.isArray(pendingAppointments) || !Array.isArray(safeFilteredLeads)) return [];
    const leadMap = {}; safeFilteredLeads.forEach(l => { leadMap[String(l.id)] = l; });
    const propertyMap = {}; safeProperties.forEach(p => { propertyMap[String(p.id)] = p; });
    const cards = (pendingAppointments||[]).map(a => {
      const statusLower = (a.status||'').toLowerCase();
      if (['não realizado','nao realizado'].includes(statusLower)) return null;
      const lead = leadMap[String(a.lead_id)] || {};
      let propertyName = a.property_title || a.property_name || a.propertyTitle || a.propertyName || '';
      if (!propertyName && a.property_id && propertyMap[String(a.property_id)]) {
        const pr = propertyMap[String(a.property_id)];
        propertyName = pr.title || pr.name || pr.titulo || `ID: ${a.property_id}`;
      }
      let kanbanStatus = 'scheduled';
      if (['concluído','concluido'].includes(statusLower)) kanbanStatus='done';
      else if (statusLower === 'pendente') kanbanStatus='scheduled';
      else if (statusLower === 'confirmado') kanbanStatus='inprogress';
      const startDate = a.start ? new Date(a.start) : null;
      const nowRef = new Date();
      if (kanbanStatus==='inprogress' && startDate && startDate>nowRef) kanbanStatus='scheduled';
      let label = a.title || a.type;
      if (a.type) label = `${a.type} agendado para ${startDate ? startDate.toLocaleString('pt-BR') : ''}`;
      const diffMs = startDate ? (startDate - new Date()) : null;
      let timeLeftMinutes=null, overdueMinutes=null;
      if (diffMs!==null) { if (diffMs>0) timeLeftMinutes=Math.round(diffMs/60000); else overdueMinutes=Math.abs(Math.round(diffMs/60000)); }
      return {
        id: `appt-${a.id}`,
        leadId: a.lead_id,
        leadName: lead.name || a.lead_name || a.client,
        type: a.type,
        label,
        status: kanbanStatus,
        propertyName,
        phone: lead.phone || a.client_phone || a.phone || '',
        interest: lead.interest || a.interest || '',
        nextActionDate: a.start || '',
        score: lead.score || 0,
        timeLeftMinutes,
        overdueMinutes,
      };
    }).filter(Boolean);
    return cards;
  }, [pendingAppointments, safeFilteredLeads, safeProperties]);

  // Reclassificação periódica (força rerender para atualizar timers)
  useEffect(() => {
    const id = setInterval(() => setPendingAppointments(prev => [...prev]), 60000);
    return () => clearInterval(id);
  }, []);

  // Funil de leads
  const funnelData = React.useMemo(() => {
    if (!Array.isArray(leads) || leads.length === 0) return [];
    const order = ['Novo','Qualificação','Contato','Proposta','Negociação','Fechamento','Perdido'];
    const counts = {};
    leads.forEach(l => { const st = l.status || 'Sem Status'; counts[st]=(counts[st]||0)+1; });
    const totalTopo = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
    const arr = Object.keys(counts).map(k => ({ stage:k, value:counts[k], pct:(counts[k]/totalTopo)*100 }));
    arr.sort((a,b)=>{ const ia=order.indexOf(a.stage), ib=order.indexOf(b.stage); if (ia===-1&&ib===-1) return a.stage.localeCompare(b.stage); if (ia===-1) return 1; if (ib===-1) return -1; return ia-ib; });
    return arr;
  }, [leads]);

  // SLA médio
  const responseSlaData = React.useMemo(() => {
    if (!Array.isArray(leads) || leads.length === 0) return [];
    const map = {};
    leads.forEach(l => {
      const agentId = l.agent_id || l.agentId || l.usuario_id || 'unknown';
      const agentName = l.agent_name || l.agent || l.agentName || l.usuario_nome || 'Sem Agente';
      const rt = l.history?.responseTime;
      if (rt !== undefined && rt !== null && !Number.isNaN(Number(rt))) {
        if (!map[agentId]) map[agentId] = { agentId, agentName, sum:0, count:0 };
        map[agentId].sum += Number(rt); map[agentId].count += 1;
      }
    });
    return Object.values(map).map(v => ({ agentId: v.agentId, agentName: v.agentName, avgHours: v.count ? v.sum / v.count : 0 }));
  }, [leads]);

  const handleKanbanStatusChange = async (activity, newStatus, motivo) => {
    try { console.debug('[KANBAN STATUS CHANGE]', { activity, newStatus, motivo }); } catch(_) {}
    if (newStatus === 'reschedule' && motivo?.newDate) newStatus = 'scheduled';

    if (newStatus === 'scheduled' && motivo && (motivo.rescheduled || motivo.undo)) {
      const agendamentoId = activity.id.replace('appt-','');
      const original = pendingAppointments.find(a => String(a.id) === agendamentoId);
      if (!original) return;
      const newStart = motivo.newDate || original.start; if (!newStart) return;
      const startDateObj = new Date(newStart);
      const buildPayload = (startISO) => {
        const baseStartDate = new Date(startISO);
        const p = { ...original, start: startISO };
        let endCandidate = p.end || original.end;
        if (endCandidate) {
          const endObj = new Date(endCandidate);
          if (isNaN(endObj.getTime()) || endObj.getTime() <= baseStartDate.getTime()) {
            const fixed = new Date(baseStartDate.getTime() + 30*60000);
            p.end = fixed.toISOString();
          } else {
            p.end = endObj.toISOString();
          }
        } else {
          const fixed = new Date(baseStartDate.getTime() + 30*60000);
          p.end = fixed.toISOString();
        }
        return p;
      };
      let payload = buildPayload(startDateObj.toISOString());
      try {
        console.debug('[KANBAN RESCHEDULE BEFORE SAVE]', { id: original.id, prevStart: original.start, newStart, prevEnd: original.end, newEnd: payload.end, payload });
        const saved = await appointmentService.saveAppointment(payload);
        console.debug('[KANBAN RESCHEDULE AFTER SAVE]', { id: original.id, savedStart: saved.start, savedEnd: saved.end, payloadSent: payload });
        setPendingAppointments(prev => prev.map(a => String(a.id)===agendamentoId ? { ...a, start: saved.start || newStart, end: saved.end || payload.end } : a));
        try {
          const refreshed = await appointmentService.getAppointments();
            console.debug('[KANBAN RESCHEDULE REFETCH]', { count: refreshed?.length, sample: refreshed?.find(r=> String(r.id)===String(original.id))});
            setPendingAppointments(refreshed);
        } catch(e) { console.warn('Refetch após reagendamento falhou', e); }
        addNotification({ type:'success', message: motivo.undo ? 'Reagendamento desfeito.' : 'Compromisso reagendado.' });
      } catch(e) {
        console.warn('Falha ao salvar reagendamento', e);
        const msg = (e && e.message) ? e.message : '';
        if (/horário fora do horário comercial/i.test(msg)) {
          // Sugerir novo horário automático dentro da janela 08:00-22:00
            const adjustSuggestion = () => {
              const d = new Date(startDateObj);
              const hour = d.getHours();
              if (hour < 8) {
                d.setHours(8, 0, 0, 0);
              } else if (hour > 22 || (hour === 22 && (d.getMinutes()>0 || d.getSeconds()>0))) {
                // próximo dia 08:00
                d.setDate(d.getDate() + 1);
                d.setHours(8, 0, 0, 0);
              } else if (hour === 22) {
                // exatamente 22:00 é permitido; se minutos >0 já tratado acima
                d.setMinutes(0,0,0);
              }
              return d;
            };
            const suggested = adjustSuggestion();
            const suggestedISO = suggested.toISOString();
            const suggestedPayload = buildPayload(suggestedISO);
            // Perguntar ao usuário (fallback simples). Em UI futura usar toast com ação.
            const confirmText = `Horário rejeitado pelo backend (fora de 08:00-22:00). Sugerir ${suggested.toLocaleString('pt-BR')}?`;
            const accepted = window.confirm(confirmText);
            if (accepted) {
              try {
                console.debug('[KANBAN RESCHEDULE RETRY WITH SUGGESTED]', { originalStart:newStart, suggestedStart:suggestedISO, payload: suggestedPayload });
                const saved2 = await appointmentService.saveAppointment(suggestedPayload);
                setPendingAppointments(prev => prev.map(a => String(a.id)===agendamentoId ? { ...a, start: saved2.start || suggestedISO, end: saved2.end || suggestedPayload.end } : a));
                try { const refreshed = await appointmentService.getAppointments(); setPendingAppointments(refreshed); } catch(_) {}
                addNotification({ type:'success', message:`Reagendado para horário válido: ${suggested.toLocaleString('pt-BR')}` });
              } catch(e2) {
                console.warn('Retry reagendamento falhou', e2);
                addNotification({ type:'error', message:'Falha ao reagendar com horário sugerido.' });
              }
            } else {
              addNotification({ type:'error', message:'Reagendamento cancelado (horário inválido).' });
            }
        } else {
          addNotification({ type:'error', message:'Falha ao salvar reagendamento.' });
        }
      }
      return;
    }

    // Undo manual
    if (newStatus === 'undo_scheduled') {
      const agId = activity.id.replace('appt-','');
      const originalUndo = pendingAppointments.find(a => String(a.id) === agId);
      if (!originalUndo) return;
      try { await appointmentService.saveAppointment({ ...originalUndo, status:'Pendente' }); setPendingAppointments(prev => prev.map(a => String(a.id)===agId ? { ...a, status:'Pendente'} : a)); addNotification({ type:'success', message:'Atividade retornou para Agendados.' }); }
      catch(e) { addNotification({ type:'error', message:'Falha ao reverter atividade.' }); }
      return;
    }

    if (newStatus === 'reativar_dica') { setPendingAppointments(prev=>[...prev]); addNotification({ type:'success', message:'Dica reativada para o lead!' }); return; }

    const agendamentoId = activity.id.replace('appt-','');
    const original = pendingAppointments.find(a => String(a.id) === agendamentoId); if (!original) return;
    const isVisita = (activity.type||'').toLowerCase().includes('visita');

    try {
      if (newStatus === 'inprogress' && ['Pendente','Confirmado'].includes(original.status)) {
        const startedAt = new Date().toISOString();
        await appointmentService.saveAppointment({ ...original, status:'Confirmado', started_at: startedAt });
        try { const raw = localStorage.getItem('crm_started_appointments'); const map = raw ? JSON.parse(raw) : {}; map[agendamentoId] = startedAt; localStorage.setItem('crm_started_appointments', JSON.stringify(map)); } catch {}
        setPendingAppointments(prev => prev.map(a => String(a.id)===agendamentoId ? { ...a, status:'Confirmado', started_at: startedAt } : a));
        addNotification({ type:'success', message:'Atividade iniciada.' });
        return;
      }
      if (isVisita && newStatus === 'inprogress') {
        await appointmentService.saveAppointment({ ...original, status:'Confirmado' });
        setPendingAppointments(prev => prev.map(a => String(a.id)===agendamentoId ? { ...a, status:'Confirmado'} : a));
      } else if (newStatus === 'done') {
        await appointmentService.saveAppointment({ ...original, status:'Concluído' });
        setPendingAppointments(prev => prev.map(a => String(a.id)===agendamentoId ? { ...a, status:'Concluído'} : a));
      } else if (isVisita && newStatus === 'cancelado') {
        await appointmentService.saveAppointment({ ...original, status:'Cancelado' });
        setPendingAppointments(prev => prev.map(a => String(a.id)===agendamentoId ? { ...a, status:'Cancelado'} : a));
      } else if (newStatus === 'nao_realizado') {
        await appointmentService.saveAppointment({ ...original, status:'Não Realizado', description: (original.description ? original.description + '\n' : '') + 'Motivo não realizado: ' + (motivo || '') });
        setPendingAppointments(prev => prev.filter(a => String(a.id) !== agendamentoId));
        addNotification({ type:'success', message:'Ação marcada como não realizada.' });
      }
    } catch (e) {
      console.warn('Erro ao atualizar atividade', e);
      addNotification({ type:'error', message:'Erro ao atualizar atividade.' });
    }
  };

  // --- Métricas adicionais para visão admin ---
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23,59,59,999);

  const leadsWithDates = leads.map(l => ({
    ...l,
    created_at: l.created_at || l.createdAt || l.data_criacao || l.inserted_at,
    updated_at: l.updated_at || l.updatedAt,
    stage: l.status || l.stage || 'Novo',
    source: l.source || l.origem || l.lead_source || 'Indefinido',
  }));

  const leadsToday = leadsWithDates.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d >= startOfDay && d <= endOfDay;
  });

  const totalLeads = leadsWithDates.length;
  const totalClosed = leadsWithDates.filter(l => ['Fechamento','Fechado','Ganho','Vendido'].includes((l.stage||'').toLowerCase()) ).length;
  const conversionRate = totalLeads ? (totalClosed / totalLeads) : 0;

  // Tempo médio no funil: diferença entre created_at e fechamento
  const closedLeads = leadsWithDates.filter(l => ['fechamento','fechado','ganho','vendido'].includes((l.stage||'').toLowerCase()));
  const avgFunnelTimeDays = closedLeads.length ? (
    closedLeads.reduce((acc,l)=>{
      const start = new Date(l.created_at);
      const end = new Date(l.closed_at || l.updated_at || Date.now());
      const diff = (end - start)/(86400000);
      return acc + (Number.isFinite(diff)? diff : 0);
    },0) / closedLeads.length
  ) : 0;

  // Origem de leads
  const leadSourcesAgg = leadsWithDates.reduce((map,l)=>{
    const src = l.source || 'Indefinido';
    map[src] = (map[src]||0)+1; return map;
  },{});
  const leadSources = Object.entries(leadSourcesAgg).map(([source,count])=>({source,count, pct: totalLeads? (count/totalLeads)*100 : 0}))
    .sort((a,b)=>b.count-a.count)
    .slice(0,6);

  // Forecast de vendas simples: média de fechamentos últimos 30 dias * (restante do mês / dias transcorridos)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30*86400000);
  const closedLast30 = closedLeads.filter(l => {
    const end = new Date(l.closed_at || l.updated_at || Date.now());
    return end >= thirtyDaysAgo && end <= now;
  });
  const avgPerDay = closedLast30.length / 30;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1,0).getDate();
  const dayOfMonth = now.getDate();
  const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
  const forecastMonth = Math.round(closedLast30.length + avgPerDay * remainingDays);

  // Fechamentos efetivos no mês corrente (para progresso da previsão)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
  const closedThisMonth = closedLeads.filter(l => {
    const end = new Date(l.closed_at || l.updated_at || Date.now());
    return end >= monthStart && end <= monthEnd;
  }).length;

  // ================= NOVA AGREGAÇÃO: Projetos + Unidades =================
  const propriedadesAvulsas = safeProperties.filter(p => (p.property_type || p.type || '').toLowerCase() !== 'project');
  const unidadesPorProjeto = {};
  (rawUnits || []).forEach(u => {
    if (!u.project_id) return;
    const pid = String(u.project_id);
    if (!unidadesPorProjeto[pid]) unidadesPorProjeto[pid] = [];
    unidadesPorProjeto[pid].push(u);
  });
  const projectStock = (rawProjects || []).map(pr => {
    const units = unidadesPorProjeto[String(pr.id)] || [];
    let disponivel=0,reservado=0,vendido=0; let valorDisponivel=0, valorReservado=0, valorVendido=0;
    units.forEach(u => {
      const st = (u.sale_status || u.status || '').toLowerCase();
      const price = normalizePrice(u.price || u.valor || u.unit_price);
      if (st.startsWith('vend')) { vendido++; valorVendido += price; }
      else if (st.startsWith('reserv')) { reservado++; valorReservado += price; }
      else { disponivel++; valorDisponivel += price; }
    });
    return {
      project_id: pr.id,
      project_name: pr.project_name || pr.nome || pr.title || `Projeto ${pr.id}`,
      disponivel, reservado, vendido,
      valorDisponivel, valorReservado, valorVendido,
      valorTotal: valorDisponivel + valorReservado + valorVendido,
      raw: pr,
    };
  });
  // =======================================================================

  const kpisProjetos = (() => {
    const totalObrasCalc = projectStock.length;
    const totalUnidadesCalc = projectStock.reduce((a,p)=> a + p.disponivel + p.reservado + p.vendido, 0);
    const unidadesDisponiveisCalc = projectStock.reduce((a,p)=> a + p.disponivel, 0);
    const valorDisponivelCalc = projectStock.reduce((a,p)=> a + p.valorDisponivel, 0);
    const valorTotalCalc = projectStock.reduce((a,p)=> a + p.valorTotal, 0);
    const valorVendidoCalc = projectStock.reduce((a,p)=> a + p.valorVendido, 0);
    const ticketMedio = unidadesDisponiveisCalc ? (valorDisponivelCalc / unidadesDisponiveisCalc) : 0;
    const absorcaoPct = totalUnidadesCalc ? (valorVendidoCalc / totalUnidadesCalc) : 0;
    return { totalObras: totalObrasCalc, totalUnidades: totalUnidadesCalc, unidadesDisponiveis: unidadesDisponiveisCalc, valorDisponivel: valorDisponivelCalc, valorTotal: valorTotalCalc, ticketMedioUnidade: ticketMedio, absorcaoPct };
  })();

  const kpisPropriedades = (() => {
    const disponiveis = propriedadesAvulsas.filter(p => statusDisponivel(resolveStatus(p)));
    const reservadas = propriedadesAvulsas.filter(p => statusReservado(resolveStatus(p)));
    const vendidas = propriedadesAvulsas.filter(p => statusVendido(resolveStatus(p)));
    const valorDisponivel = disponiveis.reduce((a,p)=> a + normalizePrice(p.valor ?? p.price), 0);
    const valorTotal = propriedadesAvulsas.reduce((a,p)=> a + normalizePrice(p.valor ?? p.price), 0);
    const ticketMedioDisponivel = disponiveis.length ? (valorDisponivel / disponiveis.length) : 0;
    return { totalPropriedades: propriedadesAvulsas.length, disponiveis: disponiveis.length, reservadas: reservadas.length, vendidas: vendidas.length, valorDisponivel, valorTotal, ticketMedioDisponivel };
  })();

  // Representatividade de valor dentro do portfólio total
  const valorTotalPortfolio = (kpisProjetos.valorTotal || 0) + (kpisPropriedades.valorTotal || 0);
  if (valorTotalPortfolio > 0) {
    kpisProjetos.representatividadeValor = kpisProjetos.valorTotal / valorTotalPortfolio;
    kpisPropriedades.representatividadeValor = kpisPropriedades.valorTotal / valorTotalPortfolio;
  } else {
    kpisProjetos.representatividadeValor = 0;
    kpisPropriedades.representatividadeValor = 0;
  }
  try { if (process.env.NODE_ENV !== 'production') console.debug('[SEPARACAO KPIS]', { kpisProjetos, kpisPropriedades }); } catch {}
  // ================================================================================================

  const totalObras = kpisProjetos.totalObras;
  const totalUnidades = kpisProjetos.totalUnidades;
  const valorTotalObrasDisponiveis = kpisProjetos.valorTotal;
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[ADMIN DASH AGG]', { projectStock, totalUnidades, valorTotalObrasDisponiveis });
    }
  } catch {}

  // Atividades do dia (compromissos) - usa pendingAppointments que já está filtrado por agente se não admin
  const todayActivities = pendingAppointments.filter(a => {
    if (!a.start && !a.data_inicio) return false;
    const start = new Date(a.start || a.data_inicio);
    return start >= startOfDay && start <= endOfDay;
  }).sort((a,b)=> new Date(a.start) - new Date(b.start)).slice(0,25);

  // Alertas: leads sem corretor, unidades quase esgotando (<10% disponíveis), documentos pendentes (placeholder)
  const leadsSemCorretor = leadsWithDates.filter(l => !l.agent_id && !l.agentId && !l.usuario_id);
  const lowInventoryProjects = projectStock.filter(ps => {
    const total = ps.disponivel + ps.reservado + ps.vendido;
    if (!total) return false;
    const pctDisp = ps.disponivel / total;
    return pctDisp < 0.1 && ps.disponivel > 0; // quase esgotando
  });
  const pendingDocuments = []; // TODO: integrar documentService se disponível
  const alerts = [
    ...(leadsSemCorretor.length ? [{ type:'lead_sem_corretor', severity:'medium', message:`${leadsSemCorretor.length} lead(s) sem corretor atribuído.`}] : []),
    ...(lowInventoryProjects.length ? [{ type:'estoque_baixo', severity:'high', message:`${lowInventoryProjects.length} obra(s) com estoque quase esgotado.`}] : []),
    ...(pendingDocuments.length ? [{ type:'docs_pendentes', severity:'low', message:`${pendingDocuments.length} documento(s) aguardando aprovação.`}] : []),
  ];

  // Ranking de corretores (por fechamentos, propostas e total leads)
  const agentAgg = {};
  leadsWithDates.forEach(l => {
    const agentId = l.agent_id || l.agentId || l.usuario_id || 'sem_agente';
    const agentName = l.agent_name || l.agent || l.agentName || l.usuario_nome || 'Sem Agente';
    if (!agentAgg[agentId]) agentAgg[agentId] = { agentId, agentName, leads:0, closed:0, proposals:0 };
    agentAgg[agentId].leads += 1;
    const stLower = (l.stage||'').toLowerCase();
    if (['fechamento','fechado','ganho','vendido'].includes(stLower)) agentAgg[agentId].closed += 1;
    if (['proposta','proposal'].includes(stLower)) agentAgg[agentId].proposals += 1;
  });
  const agentRanking = Object.values(agentAgg).map(a => ({ ...a, performanceScore: (a.closed*3)+(a.proposals*2)+a.leads*0.5 }))
    .sort((a,b)=> b.performanceScore - a.performanceScore)
    .slice(0,10);

  const adminExtra = {
    kpis: {
      totalLeads,
      leadsHoje: leadsToday.length,
      conversionRate,
      unidadesDisponiveis: projectStock.reduce((acc,p)=> acc + p.disponivel,0),
      valorEstoqueDisponivel: projectStock.reduce((acc,p)=> acc + (p.valorDisponivel||0),0), // somente disponíveis
      totalObras,
      totalUnidades,
      valorTotalObrasDisponiveis,
      ticketMedioDisponivel: (() => {
        const unidadesDisp = projectStock.reduce((acc,p)=> acc + p.disponivel,0) || 0;
        const valorDisp = projectStock.reduce((acc,p)=> acc + (p.valorDisponivel||0),0) || 0;
        if (!unidadesDisp || !valorDisp) return 0;
        return valorDisp / unidadesDisp;
      })(),
    },
    funnelData,
    projectStock,
    todayActivities,
    alerts,
    agentRanking,
    resume: {
      avgFunnelTimeDays,
      leadSources,
      forecastMonth,
      closedThisMonth,
    },
    // Novos blocos calculados (opção 2 - só cálculo):
    kpisProjetos,
    kpisPropriedades,
  };

  const commonProps = { stats, stalledDeals, nextActions, leads: safeFilteredLeads, propertySuggestions: [], funnelData, responseSlaData, adminExtra, pendingAppointments };

  return user?.role === 'admin' ? (
    <div className='space-y-8'>
  <AdminDashboard user={user} loading={false} error={null} {...commonProps} />
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'><FunnelChart data={funnelData} /></div>
        <div><ResponseSla data={responseSlaData} /></div>
      </div>
    </div>
  ) : (
    <AgentDashboard
      user={user}
      loading={false}
      error={null}
      {...commonProps}
      kanbanActivities={kanbanActivities}
      onKanbanStatusChange={handleKanbanStatusChange}
      pendingAppointments={pendingAppointments}
      suggestions={effectiveSuggestions}
      onSuggestionSchedule={handleSuggestionSchedule}
      onSuggestionSnooze={handleSuggestionSnooze}
      onSuggestionIgnore={handleSuggestionIgnore}
      onSuggestionResetAll={handleSuggestionResetAll}
      hiddenSuggestionCount={hiddenSuggestionCount}
      layoutVariant='priorities'
      performanceGoals={{ monthlyActivitiesTarget:120, monthlyDealsTarget:10, monthlyContactsTarget:80 }}
      performanceMetrics={{
        activitiesDone: pendingAppointments.filter(a=>['concluído','concluido'].includes((a.status||'').toLowerCase())).length,
        activitiesScheduled: pendingAppointments.filter(a=> (a.status||'').toLowerCase()==='pendente').length,
        contactsMade: nextActions.length,
        dealsClosed: leads.filter(l => ['fechamento','ganho'].includes((l.status||'').toLowerCase())).length,
      }}
      propertiesAvailable={properties}
    />
  );
};

export default Dashboard;
