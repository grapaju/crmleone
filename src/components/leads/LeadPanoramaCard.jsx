import React, { useState } from 'react';
import { useLeadPanorama } from '@/hooks/useLeadPanorama';
import { LeadPanoramaKPIs } from './LeadPanoramaKPIs';
import { LeadPriorityItem } from './LeadPriorityItem';
import { ScheduleSuggestionModal } from './ScheduleSuggestionModal';

const variantClasses = {
  glass: 'backdrop-blur-md bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/80',
  solid: 'bg-slate-900/90',
  neon: 'bg-slate-950/90 ring-1 ring-indigo-500/30 shadow-[0_0_25px_-10px_rgba(99,102,241,0.6)]',
};

export function LeadPanoramaCard({ initialOnlyPrioritary = true, limit = 12, onOpenLead, agentId, onScheduleAction, styleVariant = 'glass' }) {
  const [onlyPrioritary, setOnlyPrioritary] = useState(initialOnlyPrioritary);
  const { loading, error, refresh, kpi, leads, snoozeAction, ignoreAction, resetHiddenActions, completeAction } = useLeadPanorama({ onlyPrioritary, limit: 200, agentId });
  const visible = leads.slice(0, limit);
  const wrapperClass = variantClasses[styleVariant] || variantClasses.glass;
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  // Placeholders de ações rápidas (mantidos; poderão ser integrados com modal global)
  const handleSchedule = (lead, action) => {
    if (onScheduleAction) return onScheduleAction(lead, action);
    setSelectedLead(lead);
    setSelectedAction(action || lead.nextAction || null);
    setModalOpen(true);
  };
  const handleLogActivity = (lead, action) => {
    // Agora abre modal em modo manual (sem action) para agendar outro tipo de compromisso
    setSelectedLead(lead);
    setSelectedAction(null); // manual mode
    setModalOpen(true);
  };
  const handleUpdateStatus = (lead) => {
    console.log('[LeadPanorama] Atualizar status do lead', lead.id);
    alert('Atualizar status (placeholder) para lead '+ lead.name);
  };

  return (
    <div className={`relative rounded-2xl border border-slate-700/60 ${wrapperClass} p-7 shadow-xl overflow-hidden`}> 
      {/* gradient ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/5" />
      <div className="absolute inset-0 opacity-50 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,rgba(120,119,198,0.15),transparent_60%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.12),transparent_55%)]" />
      <div className="absolute -inset-px rounded-2xl border border-transparent [background:linear-gradient(var(--tw-gradient-stops))_padding-box,_linear-gradient(120deg,rgba(99,102,241,0.35),rgba(236,72,153,0.25),rgba(14,165,233,0.25))_border-box] from-slate-800/40 via-slate-900/40 to-slate-950/50 opacity-40" />
      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-6 flex-wrap pb-2 border-b border-slate-700/60">
          <div className="space-y-1 max-w-xl">
            <h3 className="text-xl font-semibold tracking-tight text-slate-100 flex items-center gap-3">Panorama de Leads <span className="text-[11px] font-normal text-slate-500">Sugestões ativas: {kpi?.sugestoesAtivas ?? 0}</span></h3>
            <p className="text-xs md:text-[13px] leading-relaxed text-slate-400">Priorize leads novos, estagnados e riscos. Ações sugeridas aparecem diretamente dentro de cada card — execute, adie ou ignore para focar no que importa.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer select-none px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 hover:border-slate-600/60">
              <input type="checkbox" className="accent-emerald-500" checked={onlyPrioritary} onChange={e => setOnlyPrioritary(e.target.checked)} />
              Só prioritários
            </label>
            <button onClick={refresh} className="px-3 py-1.5 rounded-md bg-slate-800/70 hover:bg-slate-700/70 text-[11px] font-medium text-slate-200 border border-slate-600/50 hover:border-slate-500/60">Atualizar</button>
            <button onClick={resetHiddenActions} className="px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-600/70 to-emerald-500/60 hover:from-emerald-500/80 hover:to-emerald-400/70 text-[11px] font-medium text-emerald-50 shadow-inner border border-emerald-400/30">Resetar Ações</button>
          </div>
        </div>
        <LeadPanoramaKPIs kpi={kpi} loading={loading} />
        {error && <div className="text-sm text-red-400">Erro ao carregar: {String(error.message || error)}</div>}
        <div className="flex flex-col gap-4">
          {loading && visible.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_,i) => <div key={i} className="h-40 rounded-xl bg-slate-800/60 animate-pulse" />)}
            </div>
          )}
          {!loading && visible.length === 0 && <div className="text-sm text-slate-400 py-10 text-center">Nenhum lead prioritário ou sugestão ativa no momento 🎉</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map(lead => (
              <LeadPriorityItem
                key={lead.id}
                lead={lead}
                onOpen={(l) => onOpenLead && onOpenLead(l.id || l)}
                onSchedule={(l, action) => handleSchedule(l, action)}
                onLogActivity={(l, action) => handleLogActivity(l, action)}
                onUpdateStatus={handleUpdateStatus}
                onSnoozeAction={(action, minutes)=> snoozeAction(action, minutes)}
                onIgnoreAction={(action)=> ignoreAction(action)}
                onCompleteAction={(action)=> completeAction(action)}
                tall
              />
            ))}
          </div>
          {leads.length > limit && (
            <div className="pt-4 text-center">
              <button disabled className="text-xs text-slate-500">Exibindo {visible.length} de {leads.length}</button>
            </div>
          )}
        </div>
      </div>
      {modalOpen && (
        <ScheduleSuggestionModal
          open={modalOpen}
            onClose={() => { setModalOpen(false); setSelectedLead(null); setSelectedAction(null); }}
          action={selectedAction}
          lead={selectedLead}
          onScheduled={(appt)=>{ completeAction(selectedAction); refresh(); }}
        />
      )}
    </div>
  );
}
