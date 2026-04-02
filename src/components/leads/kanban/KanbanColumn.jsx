import React from 'react';
import KanbanCard from './KanbanCard';
import { useDroppable } from '@dnd-kit/core';

export default function KanbanColumn({ title, items = [], onChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: title, data: { containerId: title } });

  return (
    <div ref={setNodeRef} className={`bg-slate-800/40 border border-slate-700 rounded-md p-2 flex flex-col h-[70vh] ${isOver ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="px-2 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate max-w-[140px]">{title}</h3>
        <span className="text-xs text-slate-400">{items.length}</span>
      </div>
      <div className="space-y-2 overflow-y-auto pr-1">
        {items.map(item => (
          <KanbanCard key={item.id} lead={item} />
        ))}
      </div>
    </div>
  );
}
