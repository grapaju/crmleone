import React, { useMemo } from 'react';
import { differenceInDays, differenceInHours } from 'date-fns';

/**
 * LeadPanorama
 * Objetivo: Dar ao agente um panorama rápido de priorização de leads.
 * Mostra dois blocos principais: Novos Atribuídos e Em Acompanhamento.
 * Inclui pequenos indicadores de saúde e rapidez de resposta.
 *
 * Heurísticas (documentadas para futura centralização em leadService se desejado):
 * - "Novo Atribuído":
 *    a) status em ['Novo','new','novo'] OU
 *    b) assignedAt <= 3 dias atrás E (SEM lastContactAt)
 * - "Em Acompanhamento":
 *    a) possui lastContactAt OU
 *    b) status em ['Contato Inicial','Visita Agendada','Proposta','Negociação','Follow-up','Acompanhamento']
 * - Lead "estagnado": sem contato há > 7 dias (daysSinceContact > 7)
 * - Lead "quente": score >= 80
 * - SLA de reação: horas entre assignedAt e primeiro lastContactAt (se existir)
 *
 * Props:
 * - leads: Array de leads (id, name, status, assignedAt, lastContactAt, score)
 * - maxNew, maxWorking: limites de exibição
 * - onSelectLead(id)
 */
export default function LeadPanorama({
  leads = [],
  maxNew = 6,
  maxWorking = 6,
  onSelectLead,
  now = new Date(),
}) {
  const {
    newLeads,
    workingLeads,
    stats,
  } = useMemo(() => classifyLeads(leads, { now }), [leads, now]);

  const newSlice = newLeads.slice(0, maxNew);
  const workingSlice = workingLeads.slice(0, maxWorking);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">Panorama de Leads
          <span className="text-xs font-normal text-slate-400">(Priorize primeiro os novos e estagnados)</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Novos" value={stats.newCount} color="text-indigo-300" tooltip="Leads atribuídos recentemente sem primeiro contato." />
            <Stat label="Em Acomp." value={stats.workingCount} color="text-blue-300" tooltip="Leads já em relacionamento ativo." />
            <Stat label="Quentes" value={stats.hotCount} color="text-amber-300" tooltip="Score >= 80." />
            <Stat label="Estagnados" value={stats.staleCount} color="text-red-300" tooltip=">7 dias sem contato." />
        </div>
        <ReactionSLAIndicator avgFirstReactionHours={stats.avgFirstReactionHours} sample={stats.reactionSamples} />
        <ProgressBar
          label="Novos já contatados"
          current={stats.newContacted}
          total={stats.newCount || 0}
          color="bg-indigo-500"
        />
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <LeadList
          title="Novos Atribuídos"
          emptyMessage="Sem novos leads pendentes"
          leads={newSlice}
          variant="new"
          onSelectLead={onSelectLead}
        />
        <LeadList
          title="Em Acompanhamento"
          emptyMessage="Nenhum lead em acompanhamento"
          leads={workingSlice}
          variant="working"
          onSelectLead={onSelectLead}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-white', tooltip }) {
  return (
    <div className="bg-slate-900/40 border border-slate-700/70 rounded-lg p-3 flex flex-col" title={tooltip}>
      <span className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-semibold leading-none ${color}`}>{value ?? 0}</span>
    </div>
  );
}

function ProgressBar({ label, current, total, color = 'bg-blue-500' }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span>{current}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 rounded bg-slate-700/60 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function ReactionSLAIndicator({ avgFirstReactionHours, sample }) {
  if (avgFirstReactionHours === null) return null;
  let statusColor = 'text-slate-400';
  if (avgFirstReactionHours <= 2) statusColor = 'text-emerald-400';
  else if (avgFirstReactionHours <= 6) statusColor = 'text-amber-300';
  else statusColor = 'text-red-300';
  return (
    <div className="text-[11px] text-slate-400 flex items-center gap-2">
      <span>Média de primeira reação:</span>
      <span className={`font-semibold ${statusColor}`}>{avgFirstReactionHours.toFixed(1)}h</span>
      <span className="opacity-60">(amostra {sample})</span>
    </div>
  );
}

function LeadList({ title, leads = [], emptyMessage, variant, onSelectLead }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white tracking-wide uppercase">{title}</h3>
        <span className="text-[11px] text-slate-500">{leads.length}</span>
      </div>
      {leads.length === 0 && (
        <div className="text-xs text-slate-500 italic">{emptyMessage}</div>
      )}
      <ul className="divide-y divide-slate-700/60">
        {leads.map(l => <LeadRow key={l.id} lead={l} variant={variant} onClick={() => onSelectLead && onSelectLead(l.id, l)} />)}
      </ul>
    </div>
  );
}

function LeadRow({ lead, variant, onClick }) {
  const daysSinceAssign = lead.assignedAt ? differenceInDays(new Date(), new Date(lead.assignedAt)) : null;
  const daysSinceContact = lead.lastContactAt ? differenceInDays(new Date(), new Date(lead.lastContactAt)) : null;
  const stale = daysSinceContact !== null && daysSinceContact > 7;
  const hot = (lead.score ?? 0) >= 80;
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <button onClick={onClick} className="w-full text-left group">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{lead.name || '—'}</span>
              {hot && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">HOT</span>}
              {stale && <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">+7d</span>}
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {variant === 'new' && daysSinceAssign !== null && <span>Atrib. há {daysSinceAssign}d</span>}
              {variant === 'working' && daysSinceContact !== null && <span>Últ. contato {daysSinceContact}d</span>}
              {lead.status && <span>Status: {lead.status}</span>}
              {lead.score !== undefined && <span>Score: {lead.score}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lead.priorityScore !== undefined && (
              <span className="text-[10px] font-mono text-slate-400">P:{lead.priorityScore}</span>
            )}
            <span className="text-[11px] text-indigo-300 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </div>
      </button>
    </li>
  );
}

/**
 * classifyLeads: retorna coleções e estatísticas agregadas para priorização.
 */
function classifyLeads(leads = [], { now = new Date() } = {}) {
  const NEW_STATUSES = ['novo','new','novo atribuido','novo atribuído'];
  const WORKING_STATUSES = ['contato inicial','visita agendada','proposta','negociação','follow-up','acompanhamento','working'];
  const nowDate = new Date(now);
  const newLeads = [];
  const workingLeads = [];
  let hotCount = 0;
  let staleCount = 0;
  let reactionSamples = 0;
  let reactionHoursAccumulator = 0;
  let newContacted = 0;

  for (const lead of (leads || [])) {
    if (!lead || !lead.id) continue;
    const statusRaw = (lead.status || '').toString().trim().toLowerCase();
    const assignedAt = lead.assignedAt ? new Date(lead.assignedAt) : null;
    const lastContactAt = lead.lastContactAt || lead.lastContact || lead.lastContactDate;
    const lastContactDate = lastContactAt ? new Date(lastContactAt) : null;
    const daysSinceContact = lastContactDate ? differenceInDays(nowDate, lastContactDate) : null;
    const daysSinceAssign = assignedAt ? differenceInDays(nowDate, assignedAt) : null;

    const isHot = (Number(lead.score) || 0) >= 80;
    if (isHot) hotCount += 1;
    const isStale = daysSinceContact !== null && daysSinceContact > 7;
    if (isStale) staleCount += 1;

    const isExplicitNew = NEW_STATUSES.includes(statusRaw);
    const recentAssign = assignedAt && daysSinceAssign !== null && daysSinceAssign <= 3;
    const hasContact = !!lastContactDate;
    const isWorkingStatus = WORKING_STATUSES.includes(statusRaw);

    if ((isExplicitNew || (recentAssign && !hasContact)) && !hasContact) {
      // Novo e ainda não contatado
      const priorityScore = computePriorityScore({ score: lead.score, daysSinceAssign, daysSinceContact, hot: isHot });
      newLeads.push({ ...lead, daysSinceAssign, priorityScore });
    } else if (hasContact || isWorkingStatus) {
      const priorityScore = computePriorityScore({ score: lead.score, daysSinceAssign, daysSinceContact, hot: isHot, working: true });
      workingLeads.push({ ...lead, daysSinceContact, priorityScore });
      if (!hasContact && isWorkingStatus) {
        // edge case: working status mas sem lastContact definido
      }
    } else {
      // fallback: se não classificou, tratar como novo
      const priorityScore = computePriorityScore({ score: lead.score, daysSinceAssign, hot: isHot });
      newLeads.push({ ...lead, daysSinceAssign, priorityScore });
    }

    // SLA primeira reação (tempo até primeiro contato)
    if (assignedAt && lastContactDate) {
      const hours = differenceInHours(lastContactDate, assignedAt);
      if (hours >= 0) {
        reactionSamples += 1;
        reactionHoursAccumulator += hours;
      }
    }
    if (lastContactDate && (isExplicitNew || (recentAssign))) newContacted += 1;
  }

  // Ordenar por priorityScore (desc) e depois score desc
  newLeads.sort((a,b) => (b.priorityScore - a.priorityScore) || ((b.score||0)-(a.score||0)));
  workingLeads.sort((a,b) => (b.priorityScore - a.priorityScore) || ((b.score||0)-(a.score||0)));

  const stats = {
    newCount: newLeads.length,
    workingCount: workingLeads.length,
    hotCount,
    staleCount,
    avgFirstReactionHours: reactionSamples > 0 ? reactionHoursAccumulator / reactionSamples : null,
    reactionSamples,
    newContacted,
  };
  return { newLeads, workingLeads, stats };
}

function computePriorityScore({ score = 0, daysSinceAssign, daysSinceContact, hot, working }) {
  let p = 0;
  // Base: score
  p += (Number(score) || 0);
  // Urgência por ausência de contato
  if (daysSinceContact === null || daysSinceContact === undefined) p += 15; else p += Math.min(20, daysSinceContact * 2);
  // Recência de atribuição (quanto mais recente sem contato, mais prioridade)
  if (daysSinceAssign !== null && daysSinceAssign !== undefined) {
    if (daysSinceAssign <= 1) p += 20; else if (daysSinceAssign <= 3) p += 10; else p += 2;
  }
  if (hot) p += 25;
  if (working) p += 5; // pequeno peso para manter relacionamento
  return Math.round(p);
}
