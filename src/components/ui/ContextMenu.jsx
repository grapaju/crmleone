import React from 'react';

export default function ContextMenu({ open, x, y, options, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed z-50 bg-slate-900 border border-slate-700 rounded shadow-lg min-w-[160px] text-white"
      style={{ top: y, left: x }}
      onClick={onClose}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          className="w-full text-left px-4 py-2 hover:bg-slate-800"
          onClick={e => { e.stopPropagation(); opt.onClick(); onClose(); }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
