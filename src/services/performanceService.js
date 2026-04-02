// Service para obter histórico de performance mensal
// Estrutura de resposta esperada de /performance_history.php:
// {
//   generatedAt: string ISO,
//   agentId: number|null,
//   currentMonth: { start: 'YYYY-MM-DD', activitiesDone: number, contactsMade: number, dealsClosed: number },
//   previousMonth: { start: 'YYYY-MM-DD', activitiesDone: number, contactsMade: number, dealsClosed: number }
// }

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost/crm/api';

export async function fetchPerformanceHistory(agentId) {
  const url = new URL(`${API_BASE.replace(/\/$/, '')}/performance_history.php`);
  if (agentId) url.searchParams.set('agent_id', agentId);
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error('Falha ao carregar histórico de performance');
  return res.json();
}

// Função helper para mesclar dados históricos no objeto de métricas usado pelo PerformancePanel
export function mergeHistoryIntoMetrics(baseMetrics, history) {
  if (!history) return baseMetrics;
  return {
    ...baseMetrics,
    prevMonthActivitiesDone: history.previousMonth.activitiesDone,
    prevMonthContactsMade: history.previousMonth.contactsMade,
    prevMonthDealsClosed: history.previousMonth.dealsClosed
  };
}
