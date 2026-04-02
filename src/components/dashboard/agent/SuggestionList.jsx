import React, { useMemo, useState } from 'react';
import { Lightbulb, Clock, Slash, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* props:
   suggestions: [{ leadId, leadName, type, description, score, status, daysSinceContact, priority }]
   onSchedule(suggestion)
   onSnooze(suggestion, days)
   onIgnore(suggestion)
   onOpenLead(leadId)
*/
export default function SuggestionList({
  suggestions = [],
  onSchedule,
  onSnooze,
  onIgnore,
  onOpenLead,
  max = 8,
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(() => {
    return showAll ? suggestions : suggestions.slice(0, max);
  }, [suggestions, showAll, max]);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 text-xs text-slate-400 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-slate-500" /> Nenhuma sugestão gerada no momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" /> Sugestões de Próxima Ação</h2>
        {suggestions.length > max && (
          <button onClick={() => setShowAll(s => !s)} className="text-xs text-slate-400 hover:text-white">
            {showAll ? 'Mostrar menos' : `Ver todas (${suggestions.length})`}
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(s => {
          const urgente = s.daysSinceContact !== null && s.daysSinceContact > 7;
          return (
            <div key={`${s.leadId}-${s.type}`} className={`group relative p-4 rounded-lg border bg-slate-900/60 border-slate-700 hover:border-slate-500/60 transition ${urgente ? 'ring-1 ring-red-500/60' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-white truncate">{s.leadName}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">{s.type.replace(/_/g,' ')}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">P{String(s.priority)}</span>
              </div>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed line-clamp-4">{s.description}</p>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mb-3">
                {s.daysSinceContact !== null && <span className={urgente ? 'text-red-400 font-semibold' : ''}>{s.daysSinceContact}d sem contato</span>}
                <span>Score: <b className={s.score >= 80 ? 'text-red-300' : s.score >=65 ? 'text-amber-300' : 'text-cyan-300'}>{s.score}</b></span>
                {s.status && <span>Status: {s.status}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="secondary" onClick={() => onSchedule && onSchedule(s)} className="h-7 px-2 bg-blue-600/80 hover:bg-blue-600 border border-blue-500/40 text-white text-[11px] font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Agendar
                </Button>
                <Button size="xs" variant="ghost" onClick={() => onOpenLead && onOpenLead(s.leadId)} className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Lead
                </Button>
                <Button size="xs" variant="ghost" onClick={() => onSnooze && onSnooze(s, 3)} className="h-7 px-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> +3d
                </Button>
                <Button size="xs" variant="ghost" onClick={() => onIgnore && onIgnore(s)} className="h-7 px-2 text-slate-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1">
                  <Slash className="w-3.5 h-3.5" /> Ignorar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
