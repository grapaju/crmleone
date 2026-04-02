import React from 'react';

/* props:
   data: [{ agentId, agentName, avgHours }]
*/
export default function ResponseSla({ data = [] }) {
  const sorted = [...data].sort((a,b) => a.avgHours - b.avgHours);
  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white mb-3">SLA Médio de Resposta</h3>
      {sorted.length === 0 && (
        <div className="text-slate-400 text-xs">Sem dados suficientes.</div>
      )}
      <div className="space-y-2">
        {sorted.map(row => {
          const color = row.avgHours <= 4 ? 'text-green-400' : row.avgHours <= 12 ? 'text-yellow-300' : 'text-red-400';
          return (
            <div key={row.agentId} className="flex items-center justify-between text-xs bg-slate-900/40 px-3 py-2 rounded border border-slate-700/60">
              <span className="text-slate-200 font-medium truncate mr-2">{row.agentName || row.agentId}</span>
              <span className={`font-mono ${color}`}>{row.avgHours.toFixed(1)}h</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
        Métrica baseada em lead.history.responseTime (horas). Valores altos indicam necessidade de melhoria no tempo de primeira resposta.
      </p>
    </div>
  );
}
