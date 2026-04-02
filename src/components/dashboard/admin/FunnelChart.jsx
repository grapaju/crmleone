import React from 'react';
import { ResponsiveContainer, FunnelChart as ReFunnelChart, Funnel, Tooltip, LabelList } from 'recharts';

/*
 props:
  data: [{ stage: 'Novo', value: 12, pct: 100 }, ...]
*/
export default function FunnelChart({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-4 h-64 rounded border border-slate-700 bg-slate-800/40 flex items-center justify-center text-slate-400 text-sm">
        Sem dados de funil disponíveis.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white mb-3">Funil de Leads</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReFunnelChart>
            <Tooltip formatter={(v, n, p) => [`${v} leads (${p.payload.pct.toFixed(0)}%)`, p.payload.stage]} />
            <Funnel
              dataKey="value"
              data={data}
              isAnimationActive
              stroke="#334155"
              fill="#3b82f6"
            >
              <LabelList position="right" fill="#fff" stroke="none" dataKey="stage" className="text-xs" />
            </Funnel>
          </ReFunnelChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
