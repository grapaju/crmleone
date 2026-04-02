import React from 'react';

// Simple sparkline (no external deps)
// props: data = number[], width=120, height=32, stroke='#3b82f6'
export default function Sparkline({ data = [], width = 120, height = 32, stroke = '#3b82f6', fill = 'none', strokeWidth = 2 }) {
  if (!data || data.length === 0) return <div className="text-[10px] text-slate-500">—</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const norm = (v - min) / range;
    const y = height - norm * (height - 4) - 2; // padding
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
