import React from 'react';

export function LeadPanoramaKPIs({ kpi = {}, loading }) {
  const items = [
    { key: 'novosPendentes', label: 'Novos pendentes', desc: 'Leads novos sem contato inicial', color: 'from-blue-600 to-blue-800' },
    { key: 'estagnados', label: 'Estagnados', desc: 'Sem contato ou parados acima do limite', color: 'from-amber-600 to-amber-800' },
    { key: 'hotOciosos', label: 'Quentes ociosos', desc: 'Score alto e inativos', color: 'from-red-600 to-red-800' },
    { key: 'riscoQueda', label: 'Risco de queda', desc: 'Score caiu >10 pts em 7d', color: 'from-pink-600 to-pink-800' },
    { key: 'priorizados', label: 'Priorizados', desc: 'Total na lista filtrada', color: 'from-violet-600 to-violet-800' },
    { key: 'total', label: 'Total leads', desc: 'Total carregado', color: 'from-slate-600 to-slate-800' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {items.map(it => (
        <div key={it.key} className="group relative overflow-hidden rounded-xl bg-gradient-to-br p-[1px] from-slate-600/40 to-slate-800/40">
          <div className="relative rounded-xl h-full w-full bg-slate-900/80 backdrop-blur-sm p-3 flex flex-col gap-1">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${it.color} mix-blend-overlay`} />
            <span className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{it.label}</span>
            <div className="text-2xl font-semibold text-slate-100 tabular-nums">
              {loading ? <span className="animate-pulse text-slate-500">--</span> : (kpi[it.key] ?? 0)}
            </div>
            <p className="text-[10px] leading-tight text-slate-500 line-clamp-2">{it.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
