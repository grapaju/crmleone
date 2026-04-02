import React, { useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';

const DEFAULT_COLUMNS = [
  'Novos Leads',
  'Em Contato',
  'Qualificados',
  'Em Negociação',
  'Fechados',
];

// Mapeamento do status do lead (provindo da API) para a coluna do kanban
const STATUS_TO_COLUMN = {
  'novo': 'Novos Leads',
  'contato inicial': 'Em Contato',
  'visita agendada': 'Qualificados',
  'visita realizada': 'Qualificados',
  'proposta': 'Em Negociação',
  'negociação': 'Em Negociação',
  'fechamento': 'Fechados',
  'fechado': 'Fechados',
  'perdido': 'Fechados',
};

// Quando usuário move um card para uma coluna, qual status canônico atribuir
const COLUMN_TO_CANONICAL_STATUS = {
  'Novos Leads': 'novo',
  'Em Contato': 'contato inicial',
  'Qualificados': 'visita agendada',
  'Em Negociação': 'proposta',
  'Fechados': 'fechamento',
};

export default function KanbanBoard({ leads = [], columns = DEFAULT_COLUMNS, onChange }) {
  // Agrupa leads por coluna
  const groupedInit = {};
  columns.forEach(c => (groupedInit[c] = []));
  leads.forEach(l => {
    const rawStatus = (l.status || '').toString().trim().toLowerCase();
    const mapped = STATUS_TO_COLUMN[rawStatus] || 'Novos Leads';
    if (!groupedInit[mapped]) groupedInit[mapped] = [];
    groupedInit[mapped].push(l);
  });

  const [grouped, setGrouped] = useState(groupedInit);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const fromId = active.id;
    const toContainer = over.data.current?.containerId || over.id;

    // Se mudou de coluna
    const fromCol = Object.keys(grouped).find(k => grouped[k].some(i => String(i.id) === String(fromId)));
    const toCol = toContainer;
    if (!fromCol || !toCol) return;
    if (fromCol === toCol) return; // simples MVP: não reorder, apenas move entre colunas

  const item = grouped[fromCol].find(i => String(i.id) === String(fromId));
    if (!item) return;

  // Ao mover, atualizamos o status canônico do lead para refletir a coluna
  const canonicalStatus = COLUMN_TO_CANONICAL_STATUS[toCol] || item.status || '';
  const updatedItem = { ...item, status: canonicalStatus };

  const newFrom = grouped[fromCol].filter(i => String(i.id) !== String(fromId));
  const newTo = [updatedItem, ...grouped[toCol]];

    const next = { ...grouped, [fromCol]: newFrom, [toCol]: newTo };
    setGrouped(next);
    if (onChange) onChange(toCol, newTo, updatedItem);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="w-full">
        <div className="grid gap-4 py-2 px-1" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}>
          {columns.map(col => (
            <SortableContext key={col} items={(grouped[col] || []).map(i => String(i.id))}>
              <div>
                <KanbanColumn
                  key={col}
                  title={col}
                  items={grouped[col] || []}
                  onChange={(updatedItems) => {
                    const next = { ...grouped, [col]: updatedItems };
                    setGrouped(next);
                    if (onChange) onChange(col, updatedItems);
                  }}
                />
              </div>
            </SortableContext>
          ))}
        </div>
      </div>
    </DndContext>
  );
}
