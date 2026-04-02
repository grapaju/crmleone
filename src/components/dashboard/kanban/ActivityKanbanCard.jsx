import { useState, useEffect, useRef } from 'react';
import ContextMenu from '@/components/ui/ContextMenu';
import { CheckCircle, XCircle, AlertTriangle, Info, Calendar, User, Phone, Clock, RotateCcw, MessageSquare, Mail } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export default function ActivityKanbanCard({ activity, onStatusChange }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Estado local para refletir instantaneamente alterações (reagendamento)
  const [localActivity, setLocalActivity] = useState(activity);
  useEffect(() => { setLocalActivity(activity); }, [activity]);
  const a = localActivity;
  const [postponing, setPostponing] = useState(false);
  const [showDelayMenu, setShowDelayMenu] = useState(false);
  const delayMenuRef = useRef(null);
  useEffect(()=>{
    const handler = (e)=>{ if(showDelayMenu && delayMenuRef.current && !delayMenuRef.current.contains(e.target)) setShowDelayMenu(false); };
    document.addEventListener('mousedown', handler);
    return ()=> document.removeEventListener('mousedown', handler);
  },[showDelayMenu]);
  const isVisit = a.type === 'Visita' || a.type === 'agendar_visita';
  const rawStatus = (a.status || '').toLowerCase();
  const isDone = ['done','concluido','concluído'].includes(rawStatus);
  const isNaoRealizado = ['nao_realizado','não realizado','nao realizado','cancelado','cancelada','missed'].includes(rawStatus);
  // Tudo que não for done / nao realizado é tratado como agendado neste modelo simplificado
  const isScheduled = !isDone && !isNaoRealizado;
  const overdueMinutes = a.overdueMinutes;

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0 });
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ open: true, x: e.clientX, y: e.clientY });
  };
  const handleReativarDica = () => setContextMenu({ ...contextMenu, open: false });

  // Score/prioridade
  const score = a.score || 0;
  let priorityIcon = null;
  let priorityLabel = '';
  if (score >= 80) { priorityIcon = <span title="Quente" className="text-red-500 text-lg">🔥</span>; priorityLabel = 'Quente'; }
  else if (score < 65) { priorityIcon = <span title="Frio" className="text-cyan-400 text-lg">❄️</span>; priorityLabel = 'Frio'; }
  else { priorityIcon = <span title="Morno" className="text-amber-400 text-lg">●</span>; priorityLabel = 'Morno'; }

  // Dados principais
  const property = a.propertyName || a.propertyLabel || 'Imóvel não informado';
  const phone = a.phone || '';
  const activityLabel = a.label || '';
  const interest = a.interest || '';
  const nextActionDate = a.nextActionDate ? new Date(a.nextActionDate) : null;
  const now = new Date();
  const isLate = nextActionDate && nextActionDate < now && !isDone;

  // Próxima ação clara
  let nextActionText = '';
  if (isVisit && !isDone && !isNaoRealizado && nextActionDate) {
    nextActionText = `Confirmar visita até ${format(nextActionDate, 'dd/MM HH:mm')}`;
  } else if (isVisit && !isDone && !isNaoRealizado) {
    nextActionText = 'Confirmar visita';
  } else if (a.type === 'ligar') {
    nextActionText = 'Ligar para o lead';
  } else if (['whatsapp', 'mensagem'].includes(a.type)) {
    nextActionText = 'Enviar mensagem';
  } else if (activityLabel) {
    nextActionText = activityLabel;
  }

  // Handlers
  const handleGoToLead = (e) => { e.stopPropagation(); if (a.leadId) navigate(`/leads/${a.leadId}`); };
  const handleAgendar = (e) => {
    e.stopPropagation();
    let tipo = 'Mensagem';
  if ((a.type || '').toLowerCase().includes('whatsapp')) tipo = 'Mensagem';
  else if ((a.type || '').toLowerCase().includes('email')) tipo = 'Email';
  else if ((a.type || '').toLowerCase().includes('visita')) tipo = 'Visita';
  else if ((a.type || '').toLowerCase().includes('ligar')) tipo = 'Ligar';

    let titulo = 'Enviar mensagem';
    if (tipo === 'Email') titulo = 'Enviar e-mail';
    else if (tipo === 'Visita') titulo = 'Agendar visita';
    else if (tipo === 'Ligar') titulo = 'Ligar para o lead';

  let obs = a.description || 'Enviar mensagem com tabela de imóveis conforme os dados do Lead.';

    navigate('/calendar/new', {
      state: {
        type: tipo,
  client: a.leadId,
  propertyId: a.propertyId,
  propertyTitle: a.propertyName,
        title: titulo,
        notes: obs
      }
    });
  };

  const handleConcluir = (e) => { 
    e.stopPropagation(); 
    onStatusChange && onStatusChange(a, 'done');
    const followType = a.type === 'Visita' ? 'Enviar follow-up de visita' : a.type === 'Ligar' ? 'Enviar mensagem de acompanhamento' : 'Criar próxima interação';
    let followupClicked = false;
    toast({
      title: '✅ Concluído',
      description: `${a.type || 'Atividade'} finalizada. Sugestão: ${followType}.`,
      duration: 6000,
      action: (
        <ToastAction altText="Agendar follow-up" onClick={() => {
          followupClicked = true;
          const nextType = a.type === 'Visita' ? 'Mensagem' : 'Ligar';
          navigate('/calendar/new', { state: { 
            type: nextType,
            client: a.leadId,
            propertyId: a.propertyId,
            propertyTitle: a.propertyName,
            title: followType,
            notes: `Gerado automaticamente após concluir ${a.type || 'atividade'} em ${new Date().toLocaleString('pt-BR')}`
          }});
        }}>Agendar</ToastAction>
      )
    });
    // Se usuário ignorar o primeiro toast, oferecer novo follow-up extra
    setTimeout(()=>{
      if(!followupClicked) {
        toast({
          title: '➕ Gerar outro follow-up?',
          description: 'Você pode encadear a próxima interação agora.',
          duration: 6000,
          action: (
            <ToastAction altText="Gerar" onClick={() => {
              const nextType = a.type === 'Visita' ? 'Mensagem' : 'Ligar';
              navigate('/calendar/new', { state: { 
                type: nextType,
                client: a.leadId,
                propertyId: a.propertyId,
                propertyTitle: a.propertyName,
                title: followType + ' (Extra)',
                notes: `Follow-up extra gerado após conclusão em ${new Date().toLocaleString('pt-BR')}`
              }});
            }}>Gerar</ToastAction>
          )
        });
      }
    }, 6500);
  };
  const handleNaoRealizado = (e) => { e.stopPropagation(); setShowNaoRealizadoModal(true); };
  // Quick postpone: calcula nova data localmente e dispara callback
  const handlePostpone = (days, e) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    if (postponing) return; // evita cliques múltiplos
    setPostponing(true);
    const baseDateStr = a.start || a.date || a.nextActionDate;
    // Se não houver base válida ou está no passado (atrasado), usar agora como base
    let base = null;
    if (baseDateStr) {
      const tmp = new Date(baseDateStr);
      if (!isNaN(tmp.getTime())) base = tmp;
    }
    const now = new Date();
    if (!base || base.getTime() < now.getTime()) {
      base = now; // corrige reagendamento para partir do momento atual
    }
    const newDate = new Date(base.getTime() + days * 86400000);
    try { console.debug('[CARD RESCHEDULE CLICK]', { id: a.id, addDays: days, base: base.toISOString(), newDate: newDate.toISOString() }); } catch(_) {}
    const updated = { ...a };
    if (updated.start) updated.start = newDate.toISOString();
    if (updated.date) updated.date = newDate.toISOString();
    updated.nextActionDate = newDate.toISOString();
    if (!updated.end) {
      const endDate = new Date(newDate.getTime() + 30 * 60000);
      updated.end = endDate.toISOString();
    } else {
      // Se end existente for <= start, ajusta +30min
      const maybeEnd = new Date(updated.end);
      if (isNaN(maybeEnd.getTime()) || maybeEnd.getTime() <= newDate.getTime()) {
        const fixedEnd = new Date(newDate.getTime() + 30*60000);
        updated.end = fixedEnd.toISOString();
      }
    }
    const diffMin = Math.max(0, Math.round((newDate.getTime() - Date.now()) / 60000));
    updated.timeLeftMinutes = diffMin;
    updated.overdueMinutes = diffMin > 0 ? -1 : 0; // remove highlight de atraso
    const previous = { ...a }; // snapshot para undo
    setLocalActivity(updated);
    onStatusChange(updated, 'reschedule', {
      addDays: days,
      oldDate: baseDateStr || previous.nextActionDate || null,
      newDate: newDate.toISOString(),
      rescheduled: true,
      reorderHint: true
    });
    const undoDateStr = previous.nextActionDate || previous.start || previous.date;
    let actionEl;
    if (undoDateStr) {
      actionEl = (
        <ToastAction altText="Desfazer" onClick={() => {
          const revert = { ...previous };
          setLocalActivity(revert);
          onStatusChange(revert, 'reschedule', {
            addDays: 0,
            oldDate: newDate.toISOString(),
            newDate: undoDateStr,
            rescheduled: true,
            undo: true
          });
        }}>Desfazer</ToastAction>
      );
    }
    toast({ title: '⏱ Reagendado', description: `Nova: ${format(newDate, 'dd/MM HH:mm')} (Desfazer disponível)`, duration: 5000, action: actionEl });
    // Timeout simples para reabilitar (em fluxo real poderia depender de promise)
    setTimeout(()=>setPostponing(false), 800);
  };

  // Modal Não Realizado
  const [showNaoRealizadoModal, setShowNaoRealizadoModal] = useState(false);
  const [naoRealizadoMotivo, setNaoRealizadoMotivo] = useState('');
  const [naoRealizadoErro, setNaoRealizadoErro] = useState('');
  // (já usado acima como handleNaoRealizado)
  const handleConfirmNaoRealizado = () => {
    if (!naoRealizadoMotivo.trim()) {
      setNaoRealizadoErro('Por favor, informe o motivo.');
      return;
    }
    setShowNaoRealizadoModal(false);
    setNaoRealizadoErro('');
    onStatusChange && onStatusChange(a, 'nao_realizado', naoRealizadoMotivo.trim());
    toast({
      title: '⚠ Marcado como Não Realizado',
      description: 'Considere reagendar ou registrar um contato alternativo.',
      duration: 6000,
    });
    setNaoRealizadoMotivo('');
  };

  const origin = a.origin || (a.isFromSuggestion ? 'dica' : 'manual');
  const isFromSuggestion = origin === 'dica';
  const overdueHighlight = isScheduled && (isLate || (typeof overdueMinutes === 'number' && overdueMinutes > 0));
  // Progress bar até o horário (janela 120min). Se >120min, oculta.
  let countdownProgress = null; // 0..1
  if (nextActionDate) {
    const diffMs = nextActionDate.getTime() - Date.now();
    const diffMin = diffMs/60000;
    if (diffMin >= 0 && diffMin <= 120) countdownProgress = (120 - diffMin)/120; else if (diffMin < 0) countdownProgress = 1.01; // overdue sentinel
  }
  // Derivar instrução principal
  const rawInstruction = (a.notes && a.notes.trim()) || (a.observations && a.observations.trim()) || `${a.type || 'Atividade'} com ${a.leadName || 'lead'}`;
  // Extrair verbo inicial (1a palavra até espaço ou dois primeiros termos curtos)
  let highlightedVerb = '';
  let restInstruction = rawInstruction;
  const verbMatch = rawInstruction.match(/^([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇa-záàâãéèêíìîóòôõúùûç]{3,12})(\b[:,-]?)/);
  if (verbMatch) {
    highlightedVerb = verbMatch[1];
    restInstruction = rawInstruction.slice(verbMatch[0].length).trimStart();
  }
  const mainInstruction = rawInstruction; // para title/tooltip
  // Função para abrir agendamento/edição rápida
  const openQuickSchedule = (e) => {
    e.stopPropagation();
    navigate('/calendar/edit/' + a.id, { state: { from: 'kanban', activity: a }});
  };
  // Definir tipo em minúsculo e ícone contextual ANTES de usar em primaryAction
  const typeLower = (a.type || '').toLowerCase();
  let icon = null;
  if (typeLower.includes('visita')) icon = <Calendar className="w-3.5 h-3.5" />;
  else if (typeLower.includes('ligar') || typeLower.includes('fone') || typeLower.includes('call')) icon = <Phone className="w-3.5 h-3.5" />;
  else if (typeLower.includes('mens') || typeLower.includes('whats') || typeLower.includes('zap')) icon = <MessageSquare className="w-3.5 h-3.5" />;
  else if (typeLower.includes('email')) icon = <Mail className="w-3.5 h-3.5" />;
  else if (typeLower.includes('follow')) icon = <RotateCcw className="w-3.5 h-3.5" />;
  else icon = <Clock className="w-3.5 h-3.5" />;
  // Determinar ação primária contextual
  let primaryAction = null;
  if (isScheduled && !isNaoRealizado && !isDone) {
    const t = typeLower;
    if (t.includes('ligar') || t.includes('call') || t.includes('fone')) {
      primaryAction = { label: 'Ligar agora', aria: 'Ligar para o lead', intent: 'call', onClick: handleGoToLead };
    } else if (t.includes('whats') || t.includes('mens') || t.includes('zap')) {
      primaryAction = { label: 'Enviar msg', aria: 'Enviar mensagem', intent: 'message', onClick: handleGoToLead };
    } else if (t.includes('visita')) {
      primaryAction = { label: 'Confirmar visita', aria: 'Confirmar visita', intent: 'visit', onClick: openQuickSchedule };
    } else {
      primaryAction = { label: 'Abrir', aria: 'Abrir detalhe', intent: 'open', onClick: handleGoToLead };
    }
  }
  // Classe de cor por intent
  const intentColor = (intent) => {
    switch(intent){
      case 'call': return 'bg-emerald-600/80 hover:bg-emerald-600';
      case 'message': return 'bg-sky-600/80 hover:bg-sky-600';
      case 'visit': return 'bg-indigo-600/80 hover:bg-indigo-600';
      default: return 'bg-slate-600/80 hover:bg-slate-600';
    }
  };
  // Wrapper para menu de adiamento (evita erro se chamada sem evento)
  const postponeDays = (days) => handlePostpone(days, { stopPropagation(){} });
  return (
    <div
      aria-label={`Atividade ${a.type || ''} para ${a.leadName || ''}`}
      role="article"
      className={`group relative bg-slate-900/60 rounded-lg p-3 text-sm hover:shadow-lg transition-all flex flex-col justify-between ${isDone ? 'opacity-60' : ''} ${overdueHighlight ? 'border border-red-600/70 shadow-red-900/40 shadow-inner animate-pulse-short' : `border ${isFromSuggestion ? 'border-green-700/70' : 'border-slate-700'} hover:border-slate-500/60`}`}
      style={{ minHeight: '160px' }}
      onContextMenu={handleContextMenu}
    >
      {countdownProgress !== null && !isDone && !isNaoRealizado && (
        <div className="h-1 w-full bg-slate-700/40 rounded mb-2 overflow-hidden" aria-label="Progresso até início">
          <div
            className={`h-full transition-all duration-500 ${countdownProgress > 1 ? 'bg-red-600 animate-pulse' : countdownProgress > 0.8 ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, countdownProgress*100))}%` }}
          />
        </div>
      )}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            {icon && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-700/70 text-slate-200">{icon}</span>}
            <span className="font-semibold text-slate-100 truncate" title={a.type}>{a.type}</span>
            {overdueHighlight && <span className="text-[10px] text-red-400 font-medium ml-1">ATRASADA</span>}
            {isFromSuggestion && <span className="text-[10px] text-green-400 font-medium ml-1">SUGESTÃO</span>}
          </div>
          <button onClick={openQuickSchedule} className="text-left w-full group/instrucao" title={mainInstruction} aria-label="Abrir agendamento desta atividade">
            <p className="text-slate-200 leading-snug text-[13px] line-clamp-4 whitespace-pre-wrap">
              {highlightedVerb && <span className="font-semibold text-slate-100 mr-1 tracking-tight">{highlightedVerb}</span>}
              <span className="text-slate-300 group-hover/instrucao:text-slate-100 transition-colors">{restInstruction}</span>
            </p>
          </button>
        </div>
        <div className="text-right ml-2 shrink-0 cursor-pointer" onClick={openQuickSchedule}>
          {nextActionDate && (
            <div className="text-[11px] text-slate-400 font-medium hover:text-slate-200" title={nextActionDate.toLocaleString('pt-BR')}> {nextActionDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}<br/>{nextActionDate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
          )}
        </div>
      </div>
      {isScheduled && (
        <div className="flex gap-2 flex-wrap items-center mt-auto pt-1">
          {primaryAction && (
            <Button
              size="sm"
              aria-label={primaryAction.aria}
              onClick={(e)=>{ e.stopPropagation(); primaryAction.onClick(e); }}
              className={`h-7 px-2 text-[11px] font-semibold ${intentColor(primaryAction.intent)} border border-slate-500/40`}
            >{primaryAction.label}</Button>
          )}
          <Button size="icon" aria-label="Concluir" variant="ghost" onClick={handleConcluir} className="h-7 w-7 bg-green-600/80 hover:bg-green-600 border border-green-500/40" title="Concluir">
            <CheckCircle className="w-4 h-4 text-white" />
          </Button>
          <Button size="icon" aria-label="Marcar não realizado" variant="ghost" onClick={handleNaoRealizado} className="h-7 w-7 bg-yellow-600/80 hover:bg-yellow-600 border border-yellow-500/40" title="Não Realizado">
            <AlertTriangle className="w-4 h-4 text-white" />
          </Button>
          <Button size="icon" aria-label="Abrir lead" variant="ghost" onClick={handleGoToLead} className="h-7 w-7 border border-slate-600/50 hover:bg-slate-700" title="Perfil do Lead">
            <User className="w-4 h-4 text-slate-200" />
          </Button>
          <div className="relative ml-auto" ref={delayMenuRef}>
            <Button
              size="sm"
              aria-label="Adiar atividade"
              onClick={(e)=>{ e.stopPropagation(); setShowDelayMenu(o=>!o); }}
              className="h-7 px-3 bg-slate-700/70 hover:bg-slate-600 border border-slate-600/60 text-xs font-semibold"
            >Adiar ▾</Button>
            {showDelayMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-600 rounded shadow-lg z-20 py-1" role="menu">
                {[1,2,3].map(d => (
                  <button
                    key={d}
                    onClick={(e)=>{ e.stopPropagation(); postponeDays(d); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700/70"
                    role="menuitem"
                  >+{d} dia{d>1?'s':''}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Estados concluído / não realizado mantêm lógica anterior fora deste patch */}
    </div>
  );
}
