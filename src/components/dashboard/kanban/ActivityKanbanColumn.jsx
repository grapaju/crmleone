import React from 'react';
import ActivityKanbanCard from './ActivityKanbanCard';

export default function ActivityKanbanColumn({ title, items = [], onStatusChange }) {
  return (
  <div className="bg-slate-800/40 border border-slate-700 rounded-md p-2 flex flex-col h-[78vh]">
      <div className="px-2 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate max-w-[140px]">{title}</h3>
        <span className="text-xs text-slate-400">{items.length}</span>
      </div>
  <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
        {items.map(item => (
          <ActivityKanbanCard key={item.id} activity={item} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}
