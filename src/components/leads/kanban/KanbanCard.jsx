import React from 'react';
import { Star, Phone, Calendar, MessageCircle, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getScoreCategory } from '@/lib/leadUtils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function KanbanCard({ lead }) {
  const score = lead?.score ?? 0;
  const scoreCat = getScoreCategory(score).name;
  const rawStatus = (lead?.status || '').toString().toLowerCase();
  const isClosed = rawStatus === 'fechamento' || rawStatus === 'fechado' || rawStatus === 'perdido';
  const closedLabel = rawStatus === 'perdido' ? 'Perdido' : 'Ganho';

  const lastAction = lead.lastAction || {}; // { label, date }
  const nextAction = lead.nextAction || {}; // { label, date }
  const tip = lead.tip || lead.recommendation || '';

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(lead.id) });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const navigate = useNavigate();

  // format dates
  const formatRelative = (d) => {
    try {
      if (!d) return '';
      const date = typeof d === 'string' ? parseISO(d) : d;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return String(d);
    }
  };

  // handlers
  const handleCall = (e) => {
    e.stopPropagation();
    // abrir o formulário de agendamento com tipo 'Ligar'
    navigate('/calendar/new', { state: { clientId: String(lead.id), type: 'Ligar', title: `Ligar: ${lead.name}` } });
  };
  const handleSchedule = (e) => {
    e.stopPropagation();
    // abrir o formulário de agendamento com prefill (Visita)
    navigate('/calendar/new', { state: { clientId: String(lead.id), propertyId: lead.relatedPropertyId ? String(lead.relatedPropertyId) : undefined, type: 'Visita', title: `Visita: ${lead.name}`, notes: '' } });
  };
  const handleMessage = (e) => {
    e.stopPropagation();
    // navegar para editar lead (como placeholder) ou abrir composer se existir
    navigate(`/leads/edit/${lead.id}`);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-slate-900/60 border border-slate-700 rounded p-2 text-sm hover:shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-white truncate">{lead.name || '—'}</div>
            <div className="text-xs text-slate-400 truncate">{lead.type ? `• ${lead.type}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${scoreCat === 'Quente' ? 'bg-red-600' : scoreCat === 'Morno' ? 'bg-amber-500 text-black' : 'bg-cyan-500'} text-white">
            <Star className="w-3 h-3 mr-1" />{Math.round(score)}
          </div>
          {isClosed && (
            <div>
              <span className={`px-2 py-0.5 rounded text-[10px] ${rawStatus === 'perdido' ? 'bg-red-600' : 'bg-green-600'} text-white`}>{closedLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mt-2 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-2">
          <Phone className="w-3 h-3 text-slate-400" />
          <span className="truncate">{lastAction.label ? `${lastAction.label} • ${formatRelative(lastAction.date)}` : 'Sem ações'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span className="truncate">{nextAction.label ? `${nextAction.label} • ${formatRelative(nextAction.date)}` : 'Sem próxima ação'}</span>
        </div>
        {tip && <div className="italic text-[11px] text-slate-400 truncate">Recomendação: {tip}</div>}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={handleCall} aria-label="Ligar" className="p-1 rounded bg-slate-800 hover:bg-slate-700">
            <Phone className="w-4 h-4 text-slate-200" />
          </button>
          <button onClick={handleSchedule} aria-label="Agendar visita" className="p-1 rounded bg-slate-800 hover:bg-slate-700">
            <Calendar className="w-4 h-4 text-slate-200" />
          </button>
          <button onClick={handleMessage} aria-label="Enviar mensagem" className="p-1 rounded bg-slate-800 hover:bg-slate-700">
            <MessageCircle className="w-4 h-4 text-slate-200" />
          </button>
        </div>
        <div>
          <button aria-label="Editar" className="p-1 rounded bg-slate-800 hover:bg-slate-700">
            <Edit3 className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>
    </div>
  );
}
