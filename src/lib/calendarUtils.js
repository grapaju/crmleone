export const getTypeColor = (type) => {
  switch (type) {
    case 'Ligar': return 'bg-blue-500/20 text-blue-400';
    case 'Email': return 'bg-purple-500/20 text-purple-400';
    case 'Reunião': return 'bg-yellow-500/20 text-yellow-400';
    case 'Tarefa': return 'bg-green-500/20 text-green-400';
    case 'Mensagem': return 'bg-violet-500/20 text-violet-400';
    case 'Visita': return 'bg-orange-500/20 text-orange-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Confirmado': return 'bg-green-500/20 text-green-400';
    case 'Pendente': return 'bg-yellow-500/20 text-yellow-400';
    case 'Cancelado': return 'bg-red-500/20 text-red-400';
    case 'Concluído': return 'bg-gray-500/20 text-gray-400';
    case 'Não Realizado': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};