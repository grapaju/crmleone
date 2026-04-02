import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { appointmentService } from '@/services/appointmentService';

/* props:
   open, onClose, suggestion
   onCreated(appointment)
*/
export default function QuickScheduleModal({ open, onClose, suggestion, onCreated }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Ligar');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(30); // minutes
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (suggestion) {
      let inferredType = 'Ligar';
      const low = (suggestion.type || '').toLowerCase();
      if (low.includes('visita')) inferredType = 'Visita';
      else if (low.includes('email')) inferredType = 'Email';
      else if (low.includes('whatsapp') || low.includes('mensagem')) inferredType = 'Mensagem';
      else if (low.includes('proposta')) inferredType = 'Tarefa';

      setType(inferredType);

      // Título curto a partir da primeira frase ou até 40 chars
      let inferredTitle = '';
      if (inferredType === 'Visita') inferredTitle = 'Agendar visita';
      else if (inferredType === 'Mensagem') inferredTitle = 'Enviar mensagem';
      else if (inferredType === 'Email') inferredTitle = 'Enviar e-mail';
      else if (inferredType === 'Tarefa') inferredTitle = 'Preparar proposta';
      else inferredTitle = 'Contato com lead';
      // Caso a sugestão tenha description muito curta, usar ela direto
      if (suggestion.description && suggestion.description.length < 40) {
        inferredTitle = suggestion.description.replace(/\.$/, '');
      }
      setTitle(inferredTitle);

      // Próxima meia hora
      const now = new Date();
      now.setMinutes(now.getMinutes() + (30 - (now.getMinutes() % 30)));
      const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16);
      setStart(isoLocal);

      setNotes(suggestion.description || '');
    } else {
      setTitle(''); setType('Ligar'); setStart(''); setNotes(''); setDuration(30); setError(null);
    }
  }, [suggestion]);

  const handleSave = async () => {
    if (!start || !title) { setError('Preencha título e data/hora.'); return; }
    setSaving(true); setError(null);
    try {
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      const payload = {
        title,
        type,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        lead_id: suggestion?.leadId,
        client: suggestion?.leadId,
        property_id: suggestion?.propertyId,
        description: notes,
        status: 'Pendente' // sempre cria como pendente -> coluna Agendados até chegar a hora
      };
      const saved = await appointmentService.saveAppointment(payload);
      onCreated && onCreated(saved, suggestion);
      onClose && onClose();
    } catch (e) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Agendamento Rápido" onClose={() => !saving && onClose && onClose()}>
      <div className="flex flex-col gap-4 text-sm">
        {suggestion && (
          <div className="text-xs text-slate-400 -mt-2 flex flex-wrap gap-2">
            <span>Lead: <span className="text-slate-200 font-medium">{suggestion.leadName}</span></span>
            <span>Tipo sugerido: <span className="uppercase text-slate-300">{suggestion.type}</span></span>
            {suggestion.score !== undefined && <span>Score <span className="text-cyan-300">{suggestion.score}</span></span>}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-300">Título</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300">Tipo</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm">
              <option>Ligar</option>
              <option>Mensagem</option>
              <option>Email</option>
              <option>Visita</option>
              <option>Tarefa</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300">Duração (min)</label>
            <input type="number" min={5} step={5} value={duration} onChange={e=>setDuration(Number(e.target.value)||30)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300">Início</label>
            <div className="flex gap-1">
              {['+15m','+30m','+1h','+2h','+1d'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (!start) return; const base = new Date(start);
                    const apply = new Date(base);
                    if (tag === '+15m') apply.setMinutes(apply.getMinutes()+15);
                    if (tag === '+30m') apply.setMinutes(apply.getMinutes()+30);
                    if (tag === '+1h') apply.setHours(apply.getHours()+1);
                    if (tag === '+2h') apply.setHours(apply.getHours()+2);
                    if (tag === '+1d') apply.setDate(apply.getDate()+1);
                    const isoLocal = new Date(apply.getTime() - apply.getTimezoneOffset()*60000).toISOString().slice(0,16);
                    setStart(isoLocal);
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 hover:bg-slate-600 text-slate-200 border border-slate-600"
                >{tag}</button>
              ))}
            </div>
          </div>
          <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-300">Notas</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-2 text-white text-xs min-h-[80px]" />
        </div>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div className="flex justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>Duração:</span>
            {[15,30,45,60].map(min => (
              <button
                key={min}
                type="button"
                onClick={()=>setDuration(min)}
                className={`px-2 py-0.5 rounded border text-[10px] ${duration===min ? 'bg-blue-600/70 border-blue-500 text-white' : 'bg-slate-700/40 border-slate-600 text-slate-300 hover:bg-slate-600/60'}`}
              >{min}m</button>
            ))}
          </div>
          <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={saving} onClick={()=>onClose && onClose()} className="text-slate-300">Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
