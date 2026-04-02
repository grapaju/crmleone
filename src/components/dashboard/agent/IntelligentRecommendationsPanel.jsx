import React from 'react';

/**
 * IntelligentRecommendationsPanel
 * Mostra recomendações lead -> imóvel.
 * Props:
 * - recommendations: [{ leadId, propertyId, reason, score }]
 * - onSelectRecommendation(rec)
 * - resolveLeadName(id), resolvePropertyTitle(id)
 */
export default function IntelligentRecommendationsPanel({
  recommendations = [],
  onSelectRecommendation,
  onSendWhatsApp,
  resolveLeadName = (id) => 'Lead '+id,
  resolvePropertyTitle = (id) => 'Imóvel '+id,
  max = 8,
}) {
  const list = Array.isArray(recommendations) ? recommendations.slice(0, max) : [];
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          Recomendações Inteligentes
          {onSendWhatsApp && list.length>0 && (
            <button
              onClick={()=> onSendWhatsApp(list[0])}
              title="Enviar primeira recomendação via WhatsApp"
              className="text-[10px] px-2 py-1 rounded bg-green-600/60 hover:bg-green-600 text-white font-medium transition"
            >WhatsApp rápido</button>
          )}
        </h2>
        <span className="text-[11px] text-slate-500">Beta</span>
      </header>
      {list.length === 0 && (
        <div className="text-xs text-slate-500 bg-slate-900/40 border border-slate-700 rounded p-4">
          Nenhuma recomendação disponível neste momento.
        </div>
      )}
      <ul className="space-y-3">
        {list.map((r,i) => (
          <li key={i}>
            <div className="w-full group bg-slate-800/60 border border-slate-700 hover:border-indigo-500/50 rounded p-4 transition flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectRecommendation && onSelectRecommendation(r)}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors truncate">{resolveLeadName(r.leadId)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{r.score ?? '—'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">Sugerir: <b className="text-slate-300">{resolvePropertyTitle(r.propertyId)}</b></div>
                  {r.reason && <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{r.reason}</div>}
                </div>
                <span className="text-[11px] text-indigo-300 group-hover:translate-x-0.5 transition">→</span>
              </div>
              {onSendWhatsApp && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={()=> onSendWhatsApp(r)}
                    className="text-[10px] px-2 py-1 rounded bg-green-600/60 hover:bg-green-600 text-white font-medium transition flex items-center gap-1"
                    title="Enviar recomendação via WhatsApp"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.01 0C5.52 0 .26 5.26.26 11.75c0 2.07.54 4.08 1.57 5.86L0 24l6.58-1.72a11.73 11.73 0 0 0 5.43 1.35h.01c6.49 0 11.75-5.26 11.75-11.75 0-3.14-1.22-6.09-3.25-8.32ZM12 21.54a9.8 9.8 0 0 1-4.99-1.36l-.36-.21-3.9 1.02 1.04-3.8-.23-.39a9.77 9.77 0 0 1-1.47-5.13c0-5.41 4.4-9.81 9.81-9.81 2.62 0 5.08 1.02 6.93 2.87a9.72 9.72 0 0 1 2.88 6.93c-.01 5.41-4.41 9.81-9.81 9.81Zm5.34-7.36c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.06-.29-.15-1.23-.45-2.35-1.43-.87-.77-1.46-1.72-1.63-2.01-.17-.29-.02-.45.13-.6.14-.14.29-.33.43-.49.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.54-.88-2.11-.23-.55-.47-.47-.64-.48-.17-.01-.36-.01-.55-.01-.19 0-.51.07-.78.36-.26.29-1.02 1-1.02 2.44 0 1.44 1.05 2.84 1.2 3.03.14.19 2.07 3.17 5.02 4.45.7.3 1.25.48 1.68.61.71.23 1.36.2 1.87.12.57-.08 1.7-.69 1.94-1.36.24-.67.24-1.25.17-1.36-.07-.11-.26-.18-.55-.33Z"/></svg>
                    WhatsApp
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <footer className="text-[10px] text-slate-500">* Protótipo: regras simples de matching (tipo, faixa de preço). Evoluir para modelo ML.</footer>
    </div>
  );
}
