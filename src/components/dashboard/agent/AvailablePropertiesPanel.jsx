import React, { useMemo, useState } from 'react';

/**
 * AvailablePropertiesPanel
 * Exibe uma lista compacta de imóveis disponíveis priorizados por destaque ou atualização recente.
 * Props:
 * - properties: [{ id, title, price, type, bedrooms, highlightScore, updatedAt }]
 * - max (default 6)
 * - onSelectProperty(id)
 */
export default function AvailablePropertiesPanel({ properties = [], max = 6, onSelectProperty, onSendWhatsApp }) {
  const [filter, setFilter] = useState('all');
  const list = useMemo(() => {
    const arr = Array.isArray(properties) ? [...properties] : [];
    // Filtrar por tipo se filtro ativo
    let filtered = filter === 'all' ? arr : arr.filter(p => (p.type || '').toLowerCase() === filter);
    filtered.sort((a,b) => (Number(b.highlightScore||0) - Number(a.highlightScore||0)) || new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
    return filtered.slice(0, max);
  }, [properties, max, filter]);

  const types = useMemo(() => {
    const set = new Set();
    (properties||[]).forEach(p => { if (p?.type) set.add(p.type.toLowerCase()); });
    return Array.from(set).sort();
  }, [properties]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          Imóveis Disponíveis
          {onSendWhatsApp && list.length>0 && (
            <button
              onClick={()=> onSendWhatsApp(list[0].id)}
              title="Enviar primeiro imóvel via WhatsApp"
              className="text-[10px] px-2 py-1 rounded bg-green-600/60 hover:bg-green-600 text-white font-medium transition"
            >
              WhatsApp rápido
            </button>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="bg-slate-900/70 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1">
            <option value="all">Todos</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </header>
      <ul className="divide-y divide-slate-700/50">
        {list.map(p => <PropertyRow key={p.id} property={p} onClick={() => onSelectProperty && onSelectProperty(p.id, p)} />)}
        {list.length === 0 && <li className="text-xs text-slate-500 py-4">Nenhum imóvel encontrado.</li>}
      </ul>
      <footer className="text-[10px] text-slate-500">* Ordenado por relevância (destaque recente).</footer>
    </div>
  );
}

function PropertyRow({ property, onClick, onSendWhatsApp }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0"> 
      <div className="group w-full flex items-start gap-3">
        <button onClick={onClick} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{property.title || 'Imóvel'}</span>
            {property.highlightScore && <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{property.highlightScore}</span>}
          </div>
          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {property.type && <span>{property.type}</span>}
            {property.bedrooms && <span>{property.bedrooms}q</span>}
            {property.price && <span>R$ {formatNumber(property.price)}</span>}
          </div>
        </button>
        {onSendWhatsApp && (
          <button
            onClick={()=> onSendWhatsApp(property.id)}
            title="Enviar este imóvel via WhatsApp"
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-600/60 hover:bg-green-600 text-white font-medium transition"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.01 0C5.52 0 .26 5.26.26 11.75c0 2.07.54 4.08 1.57 5.86L0 24l6.58-1.72a11.73 11.73 0 0 0 5.43 1.35h.01c6.49 0 11.75-5.26 11.75-11.75 0-3.14-1.22-6.09-3.25-8.32ZM12 21.54a9.8 9.8 0 0 1-4.99-1.36l-.36-.21-3.9 1.02 1.04-3.8-.23-.39a9.77 9.77 0 0 1-1.47-5.13c0-5.41 4.4-9.81 9.81-9.81 2.62 0 5.08 1.02 6.93 2.87a9.72 9.72 0 0 1 2.88 6.93c-.01 5.41-4.41 9.81-9.81 9.81Zm5.34-7.36c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.06-.29-.15-1.23-.45-2.35-1.43-.87-.77-1.46-1.72-1.63-2.01-.17-.29-.02-.45.13-.6.14-.14.29-.33.43-.49.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.54-.88-2.11-.23-.55-.47-.47-.64-.48-.17-.01-.36-.01-.55-.01-.19 0-.51.07-.78.36-.26.29-1.02 1-1.02 2.44 0 1.44 1.05 2.84 1.2 3.03.14.19 2.07 3.17 5.02 4.45.7.3 1.25.48 1.68.61.71.23 1.36.2 1.87.12.57-.08 1.7-.69 1.94-1.36.24-.67.24-1.25.17-1.36-.07-.11-.26-.18-.55-.33Z"/></svg>
            WPP
          </button>
        )}
      </div>
    </li>
  );
}

function formatNumber(v) {
  try { return Number(v).toLocaleString('pt-BR'); } catch { return v; }
}
