import { useEffect, useMemo, useState, useCallback } from 'react';
import { differenceInDays, parseISO, isAfter } from 'date-fns';
import { leadService } from '@/services/leadService';
import { activityService } from '@/services/activityService';
import { appointmentService } from '@/services/appointmentService';
import { generateNextActionsForLeads } from '@/lib/leadsTip';

// Thresholds configuráveis (poderemos expor no futuro via UI de configurações)
const STATUS_CONTACT_THRESHOLDS = {
  'Novo': 0,
  'Contato Inicial': 2,
  'Visita Agendada': 3,
  'Proposta': 2,
  'Fechamento': 5,
  'default': 4,
};

const STATUS_STAGE_THRESHOLDS = {
  'Novo': 2,
  'Contato Inicial': 5,
  'Visita Agendada': 7,
  'Proposta': 10,
  'Fechamento': 14,
  'default': 6,
};

function parseDate(d) {
  if (!d) return null;
  try { return typeof d === 'string' ? parseISO(d) : new Date(d); } catch { return null; }
}

function collectDates(arr, fieldCandidates) {
  return arr
    .map(o => fieldCandidates.map(f => o?.[f]).find(Boolean))
    .filter(Boolean)
    .map(parseDate)
    .filter(Boolean);
}

const SNOOZE_KEY = 'lead_action_snooze_v1';
const IGNORE_KEY = 'lead_action_ignore_v1';
// Ações (dicas) concluídas ou já agendadas para não voltar a sugerir
// Mantemos em storage separado e NÃO limpamos no resetHiddenActions para preservar histórico
const DONE_KEY = 'lead_action_done_v1';

function loadJson(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
function saveJson(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch {} }
function actionStorageKey(a){ return `${a.leadId || a.lead_id || a.id}::${a.type}`; }

export function useLeadPanorama({ onlyPrioritary = true, limit = 50, agentId } = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState({ leads: [], activities: [], appointments: [] });
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [snoozedMap, setSnoozedMap] = useState(() => loadJson(SNOOZE_KEY));
  const [ignoredMap, setIgnoredMap] = useState(() => loadJson(IGNORE_KEY));
  const [doneMap, setDoneMap] = useState(() => loadJson(DONE_KEY));

  const refresh = () => setRefreshIndex(i => i + 1);
  const softRefresh = () => { setSnoozedMap(loadJson(SNOOZE_KEY)); setIgnoredMap(loadJson(IGNORE_KEY)); };

  const snoozeAction = useCallback((action, durationMinutes = 60) => {
    if (!action) return;
    const key = actionStorageKey(action);
    const until = new Date(Date.now() + durationMinutes * 60000).toISOString();
    const next = { ...snoozedMap, [key]: { until } };
    saveJson(SNOOZE_KEY, next); setSnoozedMap(next);
  }, [snoozedMap]);

  const ignoreAction = useCallback((action) => {
    if (!action) return;
    const key = actionStorageKey(action);
    const at = new Date().toISOString();
    const next = { ...ignoredMap, [key]: { at } };
    saveJson(IGNORE_KEY, next); setIgnoredMap(next);
  }, [ignoredMap]);

  const resetHiddenActions = useCallback(() => {
    // intencionalmente NÃO limpamos doneMap (histórico permanente)
    saveJson(SNOOZE_KEY, {}); saveJson(IGNORE_KEY, {});
    setSnoozedMap({}); setIgnoredMap({});
  }, []);

  const completeAction = useCallback(async (action) => {
    // Simplificado: registra activity básica dependendo do tipo
    try {
      if (!action) return;
      const leadName = action.leadName || action.lead_name;
      const type = action.type || 'Atividade';
      await activityService.addActivity({
        title: `${type} - ${leadName}`,
        notes: action.description || '',
        activity_type: type,
        timestamp: new Date().toISOString(),
        lead_id: action.leadId,
      });
      ignoreAction(action); // após completar, ignorar sugestão
      // Marcar como concluída para não voltar (chave estável por lead + type + hash descrição)
      const key = (() => {
        const base = actionStorageKey(action);
        const desc = (action.description || '').slice(0,120);
        const hash = btoa(unescape(encodeURIComponent(desc))).slice(0,12); // hash simples curto
        return base + '::' + hash;
      })();
      const next = { ...doneMap, [key]: { at: new Date().toISOString() } };
      saveJson(DONE_KEY, next); setDoneMap(next);
    } catch (e) { console.warn('Erro ao completar ação', e); }
  }, [ignoreAction, doneMap]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [leadsRaw, activitiesRaw, appointmentsRaw] = await Promise.all([
          leadService.getLeadsWithScore(),
          activityService.getActivities().catch(() => []),
          appointmentService.getAppointments().catch(() => []),
        ]);
        if (!mounted) return;
        setRaw({ leads: leadsRaw || [], activities: activitiesRaw || [], appointments: appointmentsRaw || [] });
      } catch (e) {
        if (!mounted) return;
        setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [refreshIndex]);

  const enriched = useMemo(() => {
    const now = new Date();
    const nowTs = now.getTime();

    const isSnoozed = (a) => {
      const key = actionStorageKey(a);
      const entry = snoozedMap[key];
      if (!entry) return false;
      if (!entry.until) return false;
      if (new Date(entry.until).getTime() > nowTs) return true;
      // expirou -> limpar
      const next = { ...snoozedMap }; delete next[key]; saveJson(SNOOZE_KEY, next); setTimeout(()=>setSnoozedMap(next),0);
      return false;
    };
    const isIgnored = (a) => {
      const key = actionStorageKey(a);
      const entry = ignoredMap[key];
      if (!entry) return false;
      // ignorar por até 30 dias
      const at = entry.at ? new Date(entry.at).getTime() : 0;
      if (nowTs - at < 30*24*60*60000) return true;
      const next = { ...ignoredMap }; delete next[key]; saveJson(IGNORE_KEY, next); setTimeout(()=>setIgnoredMap(next),0);
      return false;
    };

    // Se agentId fornecido, filtrar tudo antes do enrich
    const agentMatches = (obj) => {
      if (!agentId) return true; // se não especificado, retorna todos
      const possible = [obj.agent_id, obj.agentId, obj.usuario_id, obj.user_id, obj.raw?.agent_id, obj.raw?.agentId];
      return possible.map(v => String(v)).includes(String(agentId));
    };

    const filteredLeads = (raw.leads || []).filter(l => agentMatches(l));
    const filteredActivities = (raw.activities || []).filter(a => agentMatches(a));
    const filteredAppointments = (raw.appointments || []).filter(a => agentMatches(a));

    // Indexar compromissos que vieram de dica para bloquear re-sugestões
    const dicaAppointments = (filteredAppointments || []).filter(ap => {
      const originTag = (ap.origin_tag || ap.originTag || '').toLowerCase();
      const desc = (ap.description || ap.notes || '').toLowerCase();
      return originTag.includes('dica') || desc.includes('[origem: gerado por dica]');
    });
    const dicaApptsByLead = dicaAppointments.reduce((acc, ap) => {
      const leadId = ap.lead_id || ap.leadId || ap.client_id || ap.cliente_id;
      if (!leadId) return acc;
      const idStr = String(leadId);
      if (!acc[idStr]) acc[idStr] = [];
      acc[idStr].push(ap);
      return acc;
    }, {});

    const enrichedLeads = (filteredLeads || []).map(lead => {
      const leadActivities = (filteredActivities || []).filter(a => {
        const actLeadId = a.raw?.lead_id ?? a.raw?.leadId ?? a.raw?.cliente_id;
        const actPropertyId = a.propertyId ?? a.property_id ?? a.raw?.property_id;
        const leadProperty = lead.relatedPropertyId ?? lead.propertyId ?? lead.property_id;
        return (
          String(actLeadId ?? '') === String(lead.id) ||
          (leadProperty != null && String(actPropertyId ?? '') === String(leadProperty))
        );
      });
      const leadAppointments = (filteredAppointments || []).filter(ap => {
        const apLeadId = ap.lead_id ?? ap.leadId ?? ap.client_id;
        const apPropertyId = ap.propertyId ?? ap.property_id;
        const leadProperty = lead.relatedPropertyId ?? lead.propertyId ?? lead.property_id;
        return (
          String(apLeadId ?? '') === String(lead.id) ||
          (leadProperty != null && String(apPropertyId ?? '') === String(leadProperty))
        );
      });

      const activityDates = collectDates(leadActivities, ['timestamp', 'created_at', 'createdAt', 'date']);
      const appointmentDates = collectDates(leadAppointments, ['start', 'event_date', 'data_inicio']);
      const allInteractionDates = [...activityDates, ...appointmentDates].sort((a,b) => b - a);
      const lastInteractionDate = allInteractionDates[0] || null;
      const firstInteractionDate = allInteractionDates[allInteractionDates.length - 1] || null;
      const daysSemContato = lastInteractionDate ? differenceInDays(now, lastInteractionDate) : null;
      const stageSince = parseDate(lead.statusChangedAt || lead.updated_at || lead.created_at || lead.createdAt);
      const daysNoEstagio = stageSince ? differenceInDays(now, stageSince) : null;
      const contactThreshold = STATUS_CONTACT_THRESHOLDS[lead.status] ?? STATUS_CONTACT_THRESHOLDS.default;
      const stageThreshold = STATUS_STAGE_THRESHOLDS[lead.status] ?? STATUS_STAGE_THRESHOLDS.default;
      const scoreHistoryKey = `lead_score_hist_${lead.id}`;
      let scoreHistory = [];
      try { scoreHistory = JSON.parse(localStorage.getItem(scoreHistoryKey) || '[]'); } catch {}
      if (scoreHistory.length === 0 || (scoreHistory[scoreHistory.length - 1]?.score !== lead.score)) {
        scoreHistory = [...scoreHistory.slice(-30), { date: now.toISOString().slice(0,10), score: lead.score }];
        try { localStorage.setItem(scoreHistoryKey, JSON.stringify(scoreHistory)); } catch {}
      }
      const score7dAgo = (() => {
        const target = new Date(now); target.setDate(target.getDate() - 7);
        const entry = [...scoreHistory].reverse().find(e => {
          const d = parseDate(e.date);
          return d && !isAfter(d, target); // primeiro <= target
        });
        return entry?.score ?? lead.score;
      })();
      const scoreDrop7d = score7dAgo - lead.score;
      const hasFutureAppointment = leadAppointments.some(ap => { const s = parseDate(ap.start); return s && s > now; });
      const isNew = ['Novo', 'Contato Inicial'].includes(lead.status) && !firstInteractionDate;
      const isHotIdle = lead.score >= 80 && (daysSemContato ?? 999) > 5;
      const isStagnated = (() => { if (daysSemContato !== null && daysSemContato > contactThreshold) return true; if (daysNoEstagio !== null && daysNoEstagio > stageThreshold) return true; return false; })();
      const riskDrop = scoreDrop7d > 10 && (daysSemContato ?? 0) > 5;
      const reasons = [];
      if (isNew) reasons.push('Novo sem contato');
      if (!isNew && (daysSemContato ?? 0) > contactThreshold) reasons.push(`Sem contato há ${daysSemContato}d`);
      if ((daysNoEstagio ?? 0) > stageThreshold) reasons.push(`Parado no estágio ${daysNoEstagio}d`);
      if (isHotIdle) reasons.push('Quente ocioso');
      if (riskDrop) reasons.push(`Queda score ${scoreDrop7d} pts`);
      if (hasFutureAppointment) reasons.push('Compromisso agendado');
      let priorityScore = 999;
      if (isNew) priorityScore = 1; else if (isHotIdle) priorityScore = 2; else if (isStagnated) priorityScore = 3; else if (riskDrop) priorityScore = 4; else if (hasFutureAppointment) priorityScore = 6;
      return { ...lead, isNew, isHotIdle, isStagnated, riskDrop, reasons, daysSemContato, daysNoEstagio, scoreDrop7d, hasFutureAppointment, priorityScore, lastInteractionDate: lastInteractionDate?.toISOString() || null, scoreHistory };
    }).sort((a,b)=>{ if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore; if (b.score !== a.score) return b.score - a.score; return (b.daysSemContato ?? 0) - (a.daysSemContato ?? 0); });

    const prioritarios = onlyPrioritary ? enrichedLeads.filter(l => l.priorityScore <= 4) : enrichedLeads;

    // === ACTIONS GROUPING ===
    const allActions = generateNextActionsForLeads(enrichedLeads, { max: enrichedLeads.length * 3 });
    const filteredActions = allActions
      .filter(a => !(isSnoozed(a) || isIgnored(a)))
      .map(a => {
        // Marcar disabled em vez de remover se já concluída ou já agendada
        const desc = (a.description || '').slice(0,120);
        const hash = btoa(unescape(encodeURIComponent(desc))).slice(0,12);
        const key = actionStorageKey(a) + '::' + hash;
        let disabled = false; let disabledReason = '';
        if (doneMap[key]) { disabled = true; disabledReason = 'Ação concluída'; }
        const leadId = String(a.leadId);
        if (!disabled) {
          const appts = dicaApptsByLead[leadId] || [];
          if (appts.length) {
            const needle = (a.description || '').toLowerCase().slice(0, 40).trim();
            if (needle.length > 8) {
              const match = appts.some(ap => {
                const full = ((ap.description || ap.notes || ap.title || ap.titulo || '') + ' ' + (ap.title || ''))
                  .toLowerCase();
                return full.includes(needle);
              });
              if (match) { disabled = true; disabledReason = 'Compromisso agendado'; }
            }
          }
        }
        return disabled ? { ...a, disabled, disabledReason } : a;
      });
    const actionsByLead = filteredActions.reduce((acc, a) => {
      const id = String(a.leadId);
      if (!acc[id]) acc[id] = [];
      acc[id].push(a);
      return acc;
    }, {});
  Object.keys(actionsByLead).forEach(id => { actionsByLead[id].sort((a,b)=>{ if (a.category === 'Alerta' && b.category !== 'Alerta') return -1; if (b.category === 'Alerta' && a.category !== 'Alerta') return 1; if (a.disabled !== b.disabled) return a.disabled ? 1 : -1; if (a.priority !== b.priority) return a.priority - b.priority; return b.score - a.score; }); });

    const finalList = prioritarios.slice(0, limit).map(l => {
      const list = actionsByLead[String(l.id)] || [];
      const primary = list[0] || null;
      return { ...l, nextAction: primary, otherActions: list.slice(1) };
    });

    const kpi = {
      novosPendentes: enrichedLeads.filter(l => l.isNew).length,
      estagnados: enrichedLeads.filter(l => l.isStagnated).length,
      hotOciosos: enrichedLeads.filter(l => l.isHotIdle).length,
      riscoQueda: enrichedLeads.filter(l => l.riskDrop).length,
      total: enrichedLeads.length,
      priorizados: prioritarios.length,
      sugestoesAtivas: filteredActions.length,
    };

    return { list: finalList, kpi, all: enrichedLeads, actionsByLead };
  }, [raw, onlyPrioritary, limit, agentId, snoozedMap, ignoredMap, doneMap]);

  return {
    loading,
    error,
    refresh,
    softRefresh,
    kpi: enriched.kpi,
    leads: enriched.list,
    allLeads: enriched.all,
    actionsByLead: enriched.actionsByLead,
    snoozeAction,
    ignoreAction,
    resetHiddenActions,
    completeAction,
  };
}
