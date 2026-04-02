import React, { useEffect, useState, useCallback } from 'react';
import { appointmentService } from '@/services/appointmentService';
import { format } from 'date-fns';

/*
  ScheduleSuggestionModal
  Props:
    open: boolean
    onClose: () => void
    action: objeto da sugestão (primaryAction)
    lead: lead relacionado
    onScheduled: (appointment) => void

  Pré-preenche:
    - Título: `${action.category}: ${action.description}` (cortado)
    - Data/hora: próxima meia hora (start) com duração padrão 30min
    - Nota: action.description + (context se houver)
    - Tipo: mapeia categoria -> tipo permitido (fallback 'Tarefa')
*/

const categoryToType = (cat = '') => {
  const c = cat.toLowerCase();
  if (c.includes('lig') || c.includes('call')) return 'Ligar';
  if (c.includes('email')) return 'Email';
  if (c.includes('visita')) return 'Visita';
  if (c.includes('reuni')) return 'Reunião';
  if (c.includes('mens') || c.includes('whats') || c.includes('zap')) return 'Mensagem';
  return 'Tarefa';
};

export function ScheduleSuggestionModal({ open, onClose, action, lead, onScheduled }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(''); // yyyy-MM-dd
  const [time, setTime] = useState(''); // HH:mm
  const [duration, setDuration] = useState(30); // minutes
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState('Ligar'); // for manual mode
  const [markAsTip, setMarkAsTip] = useState(false); // manual origin tag
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  // Intelligent slot suggestion state
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [suggestions, setSuggestions] = useState([]); // array of Date (start)
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Load appointments when modal opens to compute free slots
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingSlots(true);
      try {
        const all = await appointmentService.getAppointments().catch(()=>[]);
        // Try detect current user to filter by agent
        let userName = null; let userId = null;
        try { const u = JSON.parse(localStorage.getItem('user')||'null'); userName = u?.name || u?.nome; userId = u?.id; } catch {}
        const filtered = (all||[]).filter(a => {
          if (!userId && !userName) return true; // fallback
          const aid = a.agent_id ?? a.agentId ?? a.usuario_id; if (userId && String(aid) === String(userId)) return true;
          const an = a.agent_name || a.agent || a.usuario_nome; if (userName && an && an.toLowerCase() === userName.toLowerCase()) return true;
          return false;
        });
        setAppointments(filtered.map(a => ({
          start: a.start || a.event_date || a.data_inicio,
          end: a.end || a.event_time || a.data_fim,
          duration: (() => {
            try {
              const s = new Date(a.start || a.event_date || a.data_inicio);
              const e = a.end || a.event_time || a.data_fim ? new Date(a.end || a.event_time || a.data_fim) : null;
              if (e && !isNaN(s) && !isNaN(e)) return Math.max(5, Math.round((e - s)/60000));
            } catch {}
            return 30;
          })()
        })));
      } catch (_) {
        setAppointments([]);
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [open]);

  const computeSuggestions = useCallback((dur) => {
    if (!open) return [];
    const result = [];
    const now = new Date();
    // first candidate: next half hour boundary
    let cursor = new Date(now.getTime());
    const m = cursor.getMinutes();
    cursor.setMinutes(m < 30 ? 30 : 60, 0, 0);
    // Work hour boundaries (08:00 - 20:00)
    const WORK_START_H = 8; const WORK_END_H = 20; // last slot must start before 20:00
    const MAX_DAYS_AHEAD = 14; // don't suggest beyond 2 weeks

    const overlaps = (start, end) => appointments.some(ap => {
      try {
        const s = new Date(ap.start); if (isNaN(s)) return false;
        const e = ap.end ? new Date(ap.end) : new Date(s.getTime() + ap.duration*60000);
        return s < end && e > start; // overlapping
      } catch { return false; }
    });

    while (result.length < 8) { // gather up to 8 suggestions
      // Reset to work start if outside window
      if (cursor.getHours() < WORK_START_H) { cursor.setHours(WORK_START_H, 0, 0, 0); }
      if (cursor.getHours() >= WORK_END_H) { // advance to next day 08:00
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(WORK_START_H, 0, 0, 0);
      }
      const daysDiff = (cursor - now)/(24*3600*1000);
      if (daysDiff > MAX_DAYS_AHEAD) break;
      const candidateStart = new Date(cursor.getTime());
      const candidateEnd = new Date(candidateStart.getTime() + dur*60000);
      if (!overlaps(candidateStart, candidateEnd)) {
        result.push(candidateStart);
      }
      // advance 30min grid
      cursor = new Date(cursor.getTime() + 30*60000);
    }
    return result;
  }, [appointments, open]);

  // Recompute suggestions when duration or appointments change or when opening
  useEffect(() => {
    if (!open) return;
    const s = computeSuggestions(duration);
    setSuggestions(s);
    setSuggestionIndex(0);
  }, [open, duration, appointments, computeSuggestions]);

  const applyCurrentSuggestion = () => {
    if (!suggestions.length) return;
    const d = suggestions[suggestionIndex];
    const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
    const HH = String(d.getHours()).padStart(2,'0'); const MM = String(d.getMinutes()).padStart(2,'0');
    setDate(`${yyyy}-${mm}-${dd}`); setTime(`${HH}:${MM}`);
  };
  const nextSuggestion = () => {
    if (!suggestions.length) return;
    setSuggestionIndex(i => (i + 1) % suggestions.length);
  };

  // build initial values when open or action changes
  useEffect(() => {
    if (!open) return;
    setSuccess(false);
    setError(null);
    if (action) {
      const baseTitle = `${action.category || 'Ação'}: ${action.description || ''}`.trim();
      setTitle(baseTitle.slice(0, 120));
      const n = new Date();
      const nextHalf = new Date(n.getTime());
      nextHalf.setMinutes(n.getMinutes() < 30 ? 30 : 60, 0, 0);
      const yyyy = nextHalf.getFullYear();
      const mm = String(nextHalf.getMonth() + 1).padStart(2, '0');
      const dd = String(nextHalf.getDate()).padStart(2, '0');
      const HH = String(nextHalf.getHours()).padStart(2, '0');
      const MM = String(nextHalf.getMinutes()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setTime(`${HH}:${MM}`);
      let baseNotes = action.description || '';
      if (action.context) baseNotes += `\nContexto: ${action.context}`;
      // append tag origem
      if (!/Gerado por Dica/i.test(baseNotes)) baseNotes += "\n[Origem: Gerado por Dica]";
      setNotes(baseNotes.slice(0, 1200));
      setSelectedType(categoryToType(action.category || action.type || ''));
      setMarkAsTip(true);
    } else {
      // Manual mode defaults
      const now = new Date();
      const next = new Date(now.getTime());
      next.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
      const yyyy = next.getFullYear();
      const mm = String(next.getMonth() + 1).padStart(2,'0');
      const dd = String(next.getDate()).padStart(2,'0');
      const HH = String(next.getHours()).padStart(2,'0');
      const MM = String(next.getMinutes()).padStart(2,'0');
      setDate(`${yyyy}-${mm}-${dd}`); setTime(`${HH}:${MM}`);
      setTitle(lead ? `Contato com ${lead.name || lead.nome || 'Lead'}` : 'Novo Compromisso');
      setNotes('');
      setSelectedType('Ligar');
      setMarkAsTip(false);
    }
  }, [open, action]);

  const disabled = saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(false);
    try {
      if (!date || !time) throw new Error('Selecione data e horário.');
      const startIso = new Date(`${date}T${time}:00`);
      if (isNaN(startIso.getTime())) throw new Error('Data/hora inválida.');
      const endIso = new Date(startIso.getTime() + duration * 60000);
      let finalNotes = notes.trim();
      let originTag = null;
      if (action) { // suggestion mode always mark
        if (!/Gerado por Dica/i.test(finalNotes)) finalNotes += "\n[Origem: Gerado por Dica]";
        originTag = 'Gerado por Dica';
      } else if (markAsTip) {
        if (!/Gerado por Dica/i.test(finalNotes)) finalNotes += "\n[Origem: Gerado por Dica]";
        originTag = 'Gerado por Dica';
      }
      const payload = {
        title: title.trim(),
        description: finalNotes,
        type: action ? categoryToType(action?.category || action?.type || '') : selectedType,
        start: startIso.toISOString(),
        end: endIso.toISOString(),
        lead_id: lead?.id || action?.leadId || null,
        agent_id: undefined, // set by service via localStorage user
        status: 'Pendente',
        origin_tag: originTag,
      };
      setSaving(true);
      const saved = await appointmentService.saveAppointment(payload);
      setSaving(false);
      setSuccess(true);
      onScheduled && onScheduled(saved);
      try {
        // Dispatch global event so Calendar can highlight & scroll
        window.dispatchEvent(new CustomEvent('appointment:created', { detail: saved }));
      } catch {}
      // slight delay then close
      setTimeout(() => { onClose && onClose(); }, 700);
    } catch (err) {
      console.error(err);
      setSaving(false);
      setError(err.message || 'Erro ao salvar');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 md:p-10">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => !saving && onClose && onClose()} />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 to-slate-950/90 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{action ? 'Agendar Dica' : 'Novo Compromisso'}</h2>
            {lead && <p className="text-xs text-slate-400 mt-1">Lead: <span className="text-slate-200 font-medium">{lead.name || lead.nome}</span></p>}
          </div>
          <button className="h-8 w-8 flex items-center justify-center rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-300" onClick={() => !saving && onClose && onClose()} aria-label="Fechar">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!action && (
            <div className="text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-md px-3 py-2 leading-relaxed">
              <span className="font-medium text-slate-300">Modo manual –</span> não vinculado a uma dica. Use este formulário para criar qualquer compromisso ad-hoc para o lead.
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-slate-400">Título</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={140} required className="w-full rounded-md bg-slate-800/70 border border-slate-600/60 focus:border-emerald-500/60 focus:ring-emerald-500/30 px-3 py-2 text-sm text-slate-100 placeholder-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">Data</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} required className="w-full rounded-md bg-slate-800/70 border border-slate-600/60 focus:border-emerald-500/60 focus:ring-emerald-500/30 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">Horário</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} required className="w-full rounded-md bg-slate-800/70 border border-slate-600/60 focus:border-emerald-500/60 focus:ring-emerald-500/30 px-3 py-2 text-sm text-slate-100" />
            </div>
          </div>
          {/* Intelligent suggestion bar */}
          <div className="space-y-2">
            {loadingSlots && <div className="text-[11px] text-slate-400">Calculando horários livres…</div>}
            {!loadingSlots && suggestions.length > 0 && (
              <div className="flex items-center gap-3 text-[11px] bg-emerald-600/10 border border-emerald-500/30 rounded-md px-3 py-2 text-emerald-300">
                <span className="uppercase tracking-wide text-emerald-400">Sugestão inteligente:</span>
                <button type="button" onClick={applyCurrentSuggestion} className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-medium">
                  {format(suggestions[suggestionIndex], 'dd/MM HH:mm')}
                </button>
                {suggestions.length > 1 && (
                  <button type="button" onClick={nextSuggestion} className="ml-auto text-emerald-400 hover:text-emerald-300 underline decoration-dotted">Outro horário</button>
                )}
              </div>
            )}
            {!loadingSlots && suggestions.length === 0 && (
              <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">Não foi possível sugerir um horário livre nos próximos dias.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">Duração (min)</label>
              <select value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-full rounded-md bg-slate-800/70 border border-slate-600/60 focus:border-emerald-500/60 focus:ring-emerald-500/30 px-3 py-2 text-sm text-slate-100">
                {[15,30,45,60,90].map(d=> <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">Tipo</label>
              {action ? (
                <input disabled value={categoryToType(action?.category || action?.type || '')} className="w-full rounded-md bg-slate-800/50 border border-slate-600/50 px-3 py-2 text-sm text-slate-300" />
              ) : (
                <select value={selectedType} onChange={e=>setSelectedType(e.target.value)} className="w-full rounded-md bg-slate-800/70 border border-slate-600/60 focus:border-emerald-500/60 focus:ring-emerald-500/30 px-3 py-2 text-sm text-slate-100">
                  {['Ligar','Email','Reunião','Tarefa','Mensagem','Visita'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
          </div>
          {!action && (
            <div className="flex items-center gap-2">
              <input id="markTip" type="checkbox" checked={markAsTip} onChange={e=>setMarkAsTip(e.target.checked)} className="accent-emerald-500" />
              <label htmlFor="markTip" className="text-[11px] text-slate-300 select-none">Marcar como Gerado por Dica</label>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-slate-400">Notas</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className="w-full resize-y rounded-md bg-slate-800/70 border border-slate-600/60 focus:border-emerald-500/60 focus:ring-emerald-500/30 px-3 py-2 text-sm text-slate-100" />
          </div>
          {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2">{error}</div>}
          {success && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">Agendado com sucesso!</div>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={()=>onClose&&onClose()} disabled={saving} className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600/60 border border-slate-600/60">Cancelar</button>
            <button type="submit" disabled={disabled} className="px-5 py-2 rounded-md text-sm font-medium bg-emerald-600/80 hover:bg-emerald-500/80 text-emerald-50 border border-emerald-400/40 shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {saving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-200 border-t-transparent" />}
              Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
