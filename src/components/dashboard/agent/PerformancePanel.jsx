import React, { useMemo } from 'react';

/**
 * PerformancePanel
 * Mostra progresso vs metas e pequenas métricas de execução.
 * Props:
 * Estrutura esperada:
 * goals: {
 *   monthlyActivitiesTarget: number,
 *   monthlyDealsTarget: number,
 *   monthlyContactsTarget: number,
 *   workingDaysInMonth?: number (fallback 22)
 * }
 * metrics: {
 *   activitiesDone: number,
 *   activitiesScheduled: number,
 *   contactsMade: number,
 *   dealsClosed: number,
 *   prevMonthActivitiesDone?: number,
 *   prevMonthDealsClosed?: number,
 *   prevMonthContactsMade?: number,
 *   todayDayIndex?: number (1..n dia útil corrente) ou será inferido,
 * }
 * Regras novas:
 * - Exibe delta (% vs mês anterior) quando disponível.
 * - Forecast linear baseado em ritmo médio diário.
 * - Badge de status refinado: On Track / Risco / Atraso / Superando (>110%).
 * - Pipeline mostra capacidade restante vs meta (meta - done - scheduled).
 */
export default function PerformancePanel({
  goals = {},
  metrics = {},
}) {
  const rows = useMemo(() => buildRows(goals, metrics), [goals, metrics]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">Metas & Performance</h2>
        <p className="text-[11px] text-slate-400">Acompanhe seu ritmo em relação às metas definidas.</p>
      </header>
      <div className="space-y-5">
        {rows.map(r => {
          const { key: rowKey, ...rest } = r;
          return <ProgressRow key={rowKey} {...rest} />;
        })}
      </div>
      <footer className="text-[10px] text-slate-500 space-y-1">
        <p>* Forecast linear: (current / diaÚtilAtual) * totalDiasÚteis.</p>
  <p>* Status: Superando &gt;110%, On Track &ge;90%, Risco &ge;60%, Atraso &lt;60%.</p>
      </footer>
    </div>
  );
}

function buildRows(goals, metrics) {
  const {
    monthlyActivitiesTarget = 100,
    monthlyDealsTarget = 8,
    monthlyContactsTarget = 60,
    workingDaysInMonth = 22,
  } = goals || {};
  const {
    activitiesDone = 0,
    activitiesScheduled = 0,
    contactsMade = 0,
    dealsClosed = 0,
    prevMonthActivitiesDone = null,
    prevMonthDealsClosed = null,
    prevMonthContactsMade = null,
    todayDayIndex = null,
  } = metrics || {};

  // Inferir dia útil corrente se não fornecido (simplificação: assume 22 dias úteis => proporcional ao dia do mês)
  const now = new Date();
  const inferredDay = Math.min(workingDaysInMonth, Math.max(1, Math.round((now.getDate() / 30) * workingDaysInMonth)));
  const dayIndex = todayDayIndex || inferredDay;

  function buildEntry({ key, label, current, total, prev, color }) {
    const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    const avgDaily = dayIndex > 0 ? current / dayIndex : 0;
    const forecast = avgDaily * workingDaysInMonth; // linear simples
    const forecastPct = total > 0 ? (forecast / total) * 100 : 0;
    const delta = prev != null && prev > 0 ? ((current - prev) / prev) * 100 : null;
    const remaining = Math.max(0, total - current);
    const status = forecastPct > 110 ? 'Superando' : pct >= 90 ? 'On Track' : pct >= 60 ? 'Risco' : 'Atraso';
    return { key, label, current, total, pct: Math.round(pct), forecast: Math.round(forecast), forecastPct: Math.round(forecastPct), delta: delta != null ? Math.round(delta) : null, remaining, color, status };
  }

  return [
    buildEntry({ key: 'activities', label: 'Atividades Concluídas', current: activitiesDone, total: monthlyActivitiesTarget, prev: prevMonthActivitiesDone, color: 'bg-emerald-500' }),
    buildEntry({ key: 'contacts', label: 'Novos Contatos', current: contactsMade, total: monthlyContactsTarget, prev: prevMonthContactsMade, color: 'bg-indigo-500' }),
    buildEntry({ key: 'deals', label: 'Negócios Fechados', current: dealsClosed, total: monthlyDealsTarget, prev: prevMonthDealsClosed, color: 'bg-amber-500' }),
    // Pipeline tratamos como capacidade em andamento (scheduled). Meta de referência = total para visual.
    buildEntry({ key: 'pipeline', label: 'Atividades no Pipeline', current: activitiesScheduled, total: monthlyActivitiesTarget, prev: null, color: 'bg-blue-500' }),
  ];
}

function ProgressRow({ label, current, total, pct, forecast, forecastPct, delta, remaining, color, status }) {
  const statusColor = status === 'Superando' ? 'text-indigo-300' : status === 'On Track' ? 'text-emerald-300' : status === 'Risco' ? 'text-amber-300' : 'text-red-300';
  const deltaColor = delta == null ? '' : delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-slate-400';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <span className="font-medium text-slate-300">{label}</span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-300">{current}/{total} ({pct}%)</span>
          <span className={`font-semibold ${statusColor}`}>{status}</span>
          {forecast != null && <span className="text-slate-500">Forecast: <span className="text-slate-300">{forecast}</span> <span className="text-[10px] text-slate-500">({Math.min(999, forecastPct)}%)</span></span>}
          {delta != null && <span className={deltaColor}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {Math.abs(delta)}%</span>}
          {remaining != null && <span className="text-slate-500">Resta: <span className="text-slate-300">{remaining}</span></span>}
        </div>
      </div>
      <div className="h-3 rounded bg-slate-700/60 overflow-hidden relative">
        <div className={`h-full ${color} transition-all`} style={{ width: pct + '%' }} />
        {/* Linha de forecast se maior que pct */}
        {forecastPct > pct && (
          <div className="absolute inset-y-0" style={{ left: Math.min(100, forecastPct) + '%' }}>
            <div className="w-px h-full bg-white/30" title={`Forecast ${forecastPct}%`} />
          </div>
        )}
        {/* Marcador 100% */}
        <div className="absolute inset-y-0" style={{ left: '100%' }}>
          <div className="w-px h-full bg-slate-500/40" />
        </div>
      </div>
    </div>
  );
}
