export const getStatusColor = (status) => {
  switch (status) {
    case 'Novo': return 'bg-blue-500/20 text-blue-400';
    case 'Contato Inicial': return 'bg-yellow-500/20 text-yellow-400';
    case 'Visita Agendada': return 'bg-purple-500/20 text-purple-400';
    case 'Proposta': return 'bg-orange-500/20 text-orange-400';
    case 'Fechamento': return 'bg-green-500/20 text-green-400';
    case 'Perdido': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export const getSourceColor = (source) => {
  switch (source) {
    case 'Site': return 'bg-blue-500/20 text-blue-400';
    case 'WhatsApp': return 'bg-green-500/20 text-green-400';
    case 'Facebook': return 'bg-blue-600/20 text-blue-300';
    case 'Google': return 'bg-red-500/20 text-red-400';
    case 'Indicação': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export const getScoreCategory = (score) => {
  if (score >= 80) {
    return { name: 'Quente', color: 'bg-red-500', textColor: 'text-red-400' };
  }
  if (score >= 50) {
    return { name: 'Morno', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
  }
  return { name: 'Frio', color: 'bg-blue-500', textColor: 'text-blue-400' };
};

// Computa um status sugerido a partir dos detalhes de score/atividades/compromissos
export function computeStatusFromScoreDetails(scoreDetails, lead = {}) {
  if (!scoreDetails) return lead.status || null;

  const textOf = (act) => ((act.type || act.action || act.name || act.note || act.description || act.activity_type || '') + '').toString().toLowerCase();

  const activities = Array.isArray(scoreDetails.activities) ? scoreDetails.activities : [];

  const hasActivityMatching = (pred) => activities.some((a) => pred(textOf(a), a));

  // 1) Fechado
  const isClosed = hasActivityMatching((txt) => txt.includes('contrato assinado') || txt.includes('pagamento confirmado') || txt.includes('contract_signed') || txt.includes('payment_confirmed'));
  if (isClosed) return 'Fechado';

  // 2) Perdido
  const isLost = hasActivityMatching((txt) => txt.includes('não aceitou') || txt.includes('nao aceitou') || txt.includes('perdeu') || txt.includes('perdido') || txt.includes('lost') || txt.includes('rejeitado'));
  if (isLost) return 'Perdido';

  // 3) Proposta
  const hasProposal = hasActivityMatching((txt) => txt.includes('proposta') || txt.includes('proposal') || txt.includes('proposal_sent') || txt.includes('proposta enviada'));
  if (hasProposal) return 'Proposta';

  // 4) Visita Realizada
  const hasVisitDoneActivity = hasActivityMatching((txt) => txt.includes('visita realizada') || txt.includes('visit_done') || txt.includes('visit_completed') || txt.includes('visita_realizada'));
  if (hasVisitDoneActivity) return 'Visita Realizada';

  // 5) Visita Agendada (activities)
  const hasVisitScheduledActivity = hasActivityMatching((txt) => txt.includes('visita agendada') || txt.includes('visit_scheduled') || txt.includes('visit_booked') || txt.includes('agendada'));
  if (hasVisitScheduledActivity) return 'Visita Agendada';

  // 6) Contato Realizado
  const hasContact = hasActivityMatching((txt) => txt.includes('ligacao') || txt.includes('liga') || txt.includes('call') || txt.includes('whatsapp') || txt.includes('email') || txt.includes('mensagem') || txt.includes('message') || txt.includes('sms'));
  if (hasContact) return 'Contato Realizado';

  // Fallback: score-based heuristics
  const score = Number(scoreDetails.score || lead.score || 0);
  if (!isNaN(score)) {
    if (score >= 85) return 'Proposta';
    if (score >= 60) return 'Visita Agendada';
    if (score < 20) return 'Perdido';
  }

  return lead.status || null;
}