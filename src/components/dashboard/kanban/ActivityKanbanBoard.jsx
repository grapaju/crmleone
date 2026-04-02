import React from 'react';
import ActivityKanbanColumn from './ActivityKanbanColumn';

// Novo layout: apenas 3 colunas (solicitado): Agendados | Concluídos | Não Realizado
// Mapeamos cancelado / nao_realizado / cancelada para coluna "naorealizado"
const COLUMNS = [
  { key: 'scheduled', label: 'Agendados' },
  { key: 'done', label: 'Concluídos' },
  { key: 'naorealizado', label: 'Não Realizado' },
];

export default function ActivityKanbanBoard({ activities = [], onStatusChange }) {
  const grouped = { scheduled: [], done: [], naorealizado: [] };
  (activities || []).forEach(act => {
    const raw = (act.status || '').toLowerCase();
    if (['done','concluido','concluído'].includes(raw)) return grouped.done.push(act);
    if (['cancelado','cancelada','nao_realizado','não realizado','nao realizado','nao-realizado','missed'].includes(raw)) return grouped.naorealizado.push(act);
    // default: agendados (pendente / scheduled / agendado / inprogress / confirmado) todos tratados como "Agendados" nesta simplificação
    return grouped.scheduled.push(act);
  });

  return (
    <div className="w-full">
      <div className="grid gap-4 py-2 px-1" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(260px, 1fr))` }}>
        {COLUMNS.map(col => (
          <ActivityKanbanColumn
            key={col.key}
            title={col.label}
            items={grouped[col.key]}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
