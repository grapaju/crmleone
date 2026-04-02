
export const getStatusColor = (status) => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'disponível':
    case 'à venda':
      // fundo mais escuro e texto claro para melhor contraste sobre imagens claras
      return 'bg-green-900/60 text-green-100';
    case 'para locação':
    case 'locacao':
      return 'bg-cyan-500/20 text-cyan-400';
    case 'indisponível':
    case 'vendido':
    case 'alugado':
      return 'bg-red-500/20 text-red-400';
    case 'reservado':
    case 'em negociação':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'em construção':
      return 'bg-blue-700/60 text-cyan-400';
    case 'entregue':
    case 'em fase de vendas':
        return 'bg-purple-500/20 text-purple-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

export const getStatusColorDetails = (status) => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'disponível':
      return { bg: 'bg-green-900/50', border: 'border-green-500', text: 'text-green-300' };
    case 'vendido':
      return { bg: 'bg-red-900/50', border: 'border-red-500', text: 'text-red-300' };
    case 'reservado':
    case 'em negociação':
      return { bg: 'bg-yellow-900/50', border: 'border-yellow-500', text: 'text-yellow-300' };
    default:
      return { bg: 'bg-slate-700', border: 'border-slate-500', text: 'text-slate-300' };
  }
};

export const formatStatus = (status) => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1);
};

export const formatType = (type) => {
  if (!type) return '';
  const typeMap = {
    'torres_blocos': 'Torres/Blocos'
  }
  return typeMap[type] || (type.charAt(0).toUpperCase() + type.slice(1));
};
  