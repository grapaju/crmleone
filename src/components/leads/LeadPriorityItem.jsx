import React, { useMemo, useState } from 'react';
import { getStatusColor, getScoreCategory } from '@/lib/leadUtils';

export function LeadPriorityItem({ lead, onOpen = () => {}, onSchedule = () => {}, onLogActivity = () => {}, onUpdateStatus = () => {}, onSnoozeAction = () => {}, onIgnoreAction = () => {}, onCompleteAction = () => {}, tall = false }) {
  const scoreCat = getScoreCategory(lead.score);
  const scoreHistoryPoints = (lead.scoreHistory || []).slice(-14);
  const sparkData = useMemo(() => scoreHistoryPoints.map(p => p.score), [scoreHistoryPoints]);
  const max = Math.max(...sparkData, 100);
  const min = Math.min(...sparkData, 0);
  const [showOthers, setShowOthers] = useState(false);

  const primaryAction = lead.nextAction;
  const secondaryActions = lead.otherActions || [];

  const actionIcon = (a) => {
    if (!a) return '⚡';
    const t = (a.type || '').toLowerCase();
    if (t.includes('nutri')) return '🌱';
    if (t.includes('email')) return '✉️';
    if (t.includes('whats') || t.includes('zap')) return '💬';
    if (t.includes('visita')) return '📍';
    if (t.includes('proposta')) return '📄';
    if (t.includes('lig') || t.includes('call')) return '📞';
    return '⚡';
  };

  const priorityBadge = (a) => {
    if (!a) return null;
    const p = a.priority || 0;
    if (p >= 90) return 'bg-pink-600/25 text-pink-300 border-pink-500/30';
    if (p >= 70) return 'bg-amber-500/25 text-amber-300 border-amber-400/30';
    if (p >= 50) return 'bg-sky-500/25 text-sky-300 border-sky-400/30';
    return 'bg-slate-600/25 text-slate-300 border-slate-500/30';
  };

  const leadTemperature = (() => {
    const s = lead.score || 0;
    // Bandas mais granulares e discretas
    if (s >= 90) return { label: 'Quente+', tone: 'hot-plus' };
    if (s >= 75) return { label: 'Quente', tone: 'hot' };
    if (s >= 60) return { label: 'Morno+', tone: 'warm-plus' };
    if (s >= 45) return { label: 'Morno', tone: 'warm' };
    if (s >= 30) return { label: 'Frio+', tone: 'cool-plus' };
    return { label: 'Frio', tone: 'cool' };
  })();

  const actionPrefix = (a) => {
    if (!a) return 'Sugestão';
    const t = (a.type || '').toLowerCase();
    const cat = (a.category || '').toLowerCase();
    if (cat.includes('nutri') || t.includes('nutri') || t.includes('email')) return 'Dica';
    return 'Sugestão';
  };

  const buildTooltip = (a) => {
    if (!a) return '';
    const parts = [];
    parts.push(`${actionPrefix(a)}: ${a.description}`);
    if (a.priority != null) parts.push(`Prioridade: ${a.priority}`);
    if (a.dueInMinutes != null) parts.push(`Prazo aprox: ${a.dueInMinutes} min`);
    // Heurística simples de impacto
    if (a.priority >= 90) parts.push('Impacto estimado: Muito Alto');
    else if (a.priority >= 70) parts.push('Impacto estimado: Alto');
    else if (a.priority >= 50) parts.push('Impacto estimado: Médio');
    else parts.push('Impacto estimado: Baixo');
    return parts.join('\n');
  };

  // Detectar ignorado direto do localStorage (mesmo namespace do hook) para efeito visual
  const ignoredMap = (() => { try { return JSON.parse(localStorage.getItem('lead_action_ignore_v1') || '{}'); } catch { return {}; } })();
  const currentPrimaryIgnored = primaryAction ? !!ignoredMap[`${primaryAction.leadId || primaryAction.lead_id || primaryAction.id}::${primaryAction.type}`] : false;
  const expanded = showOthers;
  // Variação percentual 7d (se histórico presente)
  const score7dAgo = (() => {
    // procurar entrada mais antiga na janela de 7 dias (já vem do hook via scoreHistory inclusive, mas fallback simples)
    const hist = lead.scoreHistory || [];
    if (!hist.length) return lead.score;
    // hist items: {date, score}
    const target = new Date(); target.setDate(target.getDate() - 7);
    const found = [...hist].reverse().find(e => {
      const d = new Date(e.date);
      return d <= target;
    });
    return found?.score ?? hist[0].score ?? lead.score;
  })();
  const deltaPts = score7dAgo - lead.score; // queda em pontos (positivo = caiu)
  const deltaPct = score7dAgo ? (deltaPts / score7dAgo) * 100 : 0;

  return (
    <div className={`group relative rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-800/70 to-slate-900/70 ${tall ? 'p-5 min-h-[260px]' : 'p-4'} flex flex-col gap-4 hover:border-slate-500/60 transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <button onClick={() => onOpen(lead)} className="text-left font-semibold text-slate-100 hover:text-white leading-snug break-words">
            {lead.name || lead.nome || 'Sem nome'}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={`px-2 py-0.5 rounded-full ${getStatusColor(lead.status)} bg-opacity-30`}>{lead.status || '—'}</span>
            {lead.reasons?.slice(0,5).map(r => {
              const isLongScheduled = r === 'Compromisso agendado';
              return (
                <span
                  key={r}
                  className={
                    `px-2 py-0.5 rounded-full bg-slate-700/40 text-[10px] text-slate-300 ` +
                    (isLongScheduled ? 'whitespace-nowrap' : 'max-w-[110px] truncate')
                  }
                  title={r}
                >
                  {r}
                </span>
              );
            })}
            {lead.reasons?.length > 5 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-700/40 text-[10px] text-slate-400">+{lead.reasons.length - 5}</span>
            )}
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-400 leading-tight w-40 flex-shrink-0 space-y-2">
          <div>
            {lead.lastInteractionDate ? (
              <span>Último contato: {new Date(lead.lastInteractionDate).toLocaleDateString()}</span>
            ) : (
              <span>Sem contato ainda</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500">
              <span>{leadTemperature.label}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 flex items-center gap-1">
                <span>{lead.score}</span>
                {lead.scoreDrop7d > 0 && (
                  <span className="flex items-center gap-0.5 text-rose-300" title={`Queda de ${lead.scoreDrop7d} pts nos últimos 7 dias`}>
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" strokeWidth="1.5" stroke="currentColor"><path d="M2 3.5 6 8.5 10 3.5" /></svg>
                    -{lead.scoreDrop7d}
                  </span>
                )}
              </span>
            </div>
            <div className="group relative h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden cursor-help">
              <div className={
                (() => {
                  const pct = Math.min(100, Math.max(0, lead.score));
                  let grad = 'from-slate-500/60 via-slate-400/50 to-slate-300/40';
                  if (leadTemperature.tone === 'hot-plus') grad = 'from-rose-500/70 via-rose-400/60 to-rose-300/50';
                  else if (leadTemperature.tone === 'hot') grad = 'from-rose-400/60 via-rose-300/50 to-rose-200/40';
                  else if (leadTemperature.tone === 'warm-plus') grad = 'from-amber-400/60 via-amber-300/50 to-amber-200/40';
                  else if (leadTemperature.tone === 'warm') grad = 'from-amber-300/50 via-amber-200/40 to-amber-100/30';
                  else if (leadTemperature.tone === 'cool-plus') grad = 'from-sky-400/60 via-sky-300/50 to-sky-200/40';
                  else grad = 'from-slate-500/50 via-slate-400/40 to-slate-300/30';
                  return `h-full rounded-full bg-gradient-to-r ${grad}` + ` relative after:absolute after:inset-0 after:backdrop-blur-[1px]` + ` w-[${pct}%]`;
                })()
              } />
              <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-600/60 bg-slate-800/90 px-3 py-2 text-[10.5px] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                <div className="flex flex-col gap-0.5 text-slate-200 text-[11px]">
                  <span className="font-medium tracking-wide">Score detalhado</span>
                  <span className="text-slate-400">Atual: <span className="text-slate-200">{lead.score}</span></span>
                  <span className="text-slate-400">Há 7d: <span className="text-slate-200">{score7dAgo}</span></span>
                  {deltaPts > 0 && (
                    <span className="text-rose-300">Queda: -{deltaPts} pts ({deltaPct.toFixed(1)}%)</span>
                  )}
                  {deltaPts <= 0 && deltaPts !== 0 && (
                    <span className="text-emerald-300">Alta: +{Math.abs(deltaPts)} pts ({Math.abs(deltaPct).toFixed(1)}%)</span>
                  )}
                  {deltaPts === 0 && (
                    <span className="text-slate-400">Estável (0%)</span>
                  )}
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-slate-800/90 border-l border-t border-slate-600/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Block */}
      {primaryAction && (
        <div className={`relative rounded-lg border px-4 py-4 flex flex-col gap-3 transition-colors ${currentPrimaryIgnored ? 'border-slate-600 bg-slate-800/40 opacity-60' : 'border-slate-700/60 bg-slate-800/60'} ${expanded && !currentPrimaryIgnored ? 'ring-1 ring-emerald-500/30 shadow-inner' : ''} ${primaryAction.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-emerald-600/30 to-emerald-500/20 text-lg">
              {actionIcon(primaryAction)}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${priorityBadge(primaryAction)} font-medium tracking-wide`}>Prioridade {primaryAction.priority}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-300 border border-emerald-500/20">{primaryAction.category}</span>
                {primaryAction.disabled && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${primaryAction.disabledReason === 'Compromisso agendado' ? 'bg-sky-600/20 text-sky-300 border-sky-500/30' : 'bg-violet-600/20 text-violet-300 border-violet-500/30'}`}>{primaryAction.disabledReason === 'Compromisso agendado' ? 'Compromisso Agendado' : 'Concluída'}</span>
                )}
                {primaryAction.dueInMinutes != null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300">em ~{primaryAction.dueInMinutes}m</span>
                )}
              </div>
              <div className="text-[13px] leading-snug text-slate-200 break-words" title={buildTooltip(primaryAction)}><span className="font-semibold">{actionPrefix(primaryAction)}:</span> {primaryAction.description}</div>
              {primaryAction.context && (
                <div className="text-[11px] text-slate-400 line-clamp-2" title={primaryAction.context}>{primaryAction.context}</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 gap-4">
            <div className="flex items-center gap-2">
              <IconOnlyButton disabled={primaryAction.disabled} onClick={() => !primaryAction.disabled && onSchedule(lead, primaryAction)} title={primaryAction.disabled ? 'Já há compromisso agendado/concluído' : 'Agendar compromisso'} icon={CalendarIcon} />
              <IconOnlyButton disabled={primaryAction.disabled} onClick={() => !primaryAction.disabled && onIgnoreAction(primaryAction)} title={primaryAction.disabled ? 'Ação desabilitada' : 'Ignorar esta sugestão'} icon={IgnoreIcon} />
              {secondaryActions.length > 0 && (
                <IconOnlyButton onClick={() => setShowOthers(v => !v)} title={showOthers ? 'Ocultar outras sugestões' : 'Ver outras sugestões'} icon={showOthers ? CollapseIcon : ExpandIcon} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <IconOnlyButton disabled={primaryAction.disabled} onClick={() => !primaryAction.disabled && onLogActivity(lead, primaryAction)} title={primaryAction.disabled ? 'Ação desabilitada' : 'Novo Compromisso'} icon={LightningIcon} />
            </div>
          </div>
        </div>
      )}

      {/* Secondary Actions Inline */}
      {showOthers && secondaryActions.length > 0 && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 space-y-3">
          {secondaryActions.map(a => (
            <div key={a.type+':'+a.priority} className="flex items-start gap-3 group/act">
              <div className="w-7 h-7 flex items-center justify-center rounded bg-slate-700/60 text-sm flex-shrink-0">{actionIcon(a)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityBadge(a)}`}>P{a.priority}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-300">{a.category}</span>
                </div>
                <div className="text-[12px] leading-snug text-slate-200" title={buildTooltip(a)}><span className="font-semibold">{actionPrefix(a)}:</span> {a.description}</div>
                {a.context && <div className="text-[11px] text-slate-400 line-clamp-2" title={a.context}>{a.context}</div>}
              </div>
              <div className="flex gap-1 flex-shrink-0 mt-0.5">
                <MiniAction onClick={() => onSchedule(lead, a)} title="Agendar">📅</MiniAction>
                <MiniAction onClick={() => onLogActivity(lead, a)} title="Novo Compromisso">⚡</MiniAction>
                <MiniAction onClick={() => onIgnoreAction(a)} title="Ignorar">🙈</MiniAction>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics / Sparkline */}
      <div className="mt-auto flex items-end gap-4 pt-1">
        <div className="flex-1 min-w-0">
          <Sparkline data={sparkData} min={min} max={max} />
          <div className="mt-1 text-[10px] text-slate-500 flex justify-between">
            <span>Histórico Score (14 pts)</span>
            {lead.daysSemContato != null && <span>{lead.daysSemContato}d sem contato</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
    >
      <span role="img" aria-label={label}>{icon}</span>
    </button>
  );
}

function PrimaryActionButton({ children, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600 text-[11px] text-slate-200 font-medium transition-colors shadow-inner border border-slate-600/60 hover:border-slate-500/60"
    >
      <span className="text-sm leading-none" role="img" aria-hidden>{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function IconOnlyButton({ onClick, title, icon: Icon, disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${disabled ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700/60 hover:bg-slate-600 border-slate-600/50 hover:border-slate-500/60 text-slate-200'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

const baseStroke = 'stroke-current';
function CalendarIcon({ className='' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className + ' ' + baseStroke} strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="16" rx="2" className="stroke-slate-300" />
      <path d="M3 10h18" className="stroke-slate-400" />
      <path d="M8 3v4M16 3v4" className="stroke-emerald-400" />
      <circle cx="12" cy="15" r="3" className="stroke-emerald-300" />
    </svg>
  );
}
function LightningIcon({ className='' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" className="stroke-amber-300" />
    </svg>
  );
}
function IgnoreIcon({ className='' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" className="stroke-slate-400" />
      <path d="m8 8 8 8M16 8l-8 8" className="stroke-pink-400" />
    </svg>
  );
}
function ExpandIcon({ className='' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10l6 6 6-6" className="stroke-slate-300" />
    </svg>
  );
}
function CollapseIcon({ className='' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14l6-6 6 6" className="stroke-slate-300" />
    </svg>
  );
}

function MiniAction({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} className="h-6 w-6 flex items-center justify-center rounded bg-slate-700/60 hover:bg-slate-600 text-[11px] text-slate-200">{children}</button>
  );
}

function Sparkline({ data, min, max }) {
  if (!data || data.length === 0) return <div className="h-8" />;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = max === min ? 50 : 100 - ((v - min) / (max - min)) * 100;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-full">
      <polyline fill="none" strokeWidth="2" stroke="url(#gradScore)" points={points} />
      <defs>
        <linearGradient id="gradScore" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
