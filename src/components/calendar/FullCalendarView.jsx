import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getStatusColor } from '@/lib/calendarUtils';

const parseDate = (d) => {
  if (!d) return null;
  try {
    // handle 'YYYY-MM-DD hh:mm:ss' by replacing space with T
    if (typeof d === 'string' && d.includes(' ')) return parseISO(d.replace(' ', 'T'));
    if (typeof d === 'string') return parseISO(d);
    if (d instanceof Date) return d;
    return new Date(d);
  } catch {
    return null;
  }
};

const FullCalendarView = ({ appointments = [] }) => {
  const [current, setCurrent] = useState(() => startOfMonth(new Date()));
  const navigate = useNavigate();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks = useMemo(() => {
    const rows = [];
    let day = startDate;
    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [current]);

  const eventsByDate = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      const d = parseDate(a.start);
      if (!d) return;
      const key = format(d, 'yyyy-MM-dd');
      map[key] = map[key] || [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  const prev = () => setCurrent((c) => addDays(startOfMonth(c), -1));
  const next = () => setCurrent((c) => addDays(endOfMonth(c), 1));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button onClick={prev} className="p-2 rounded-md hover:bg-slate-700"><ChevronLeft className="w-4 h-4"/></button>
          <div className="text-white font-semibold">{format(current, 'MMMM yyyy', { locale: ptBR })}</div>
          <button onClick={next} className="p-2 rounded-md hover:bg-slate-700"><ChevronRight className="w-4 h-4"/></button>
        </div>
        <div className="text-sm text-slate-400">Visualização Mensal</div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-center text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mt-2">
        {weeks.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const events = eventsByDate[key] || [];
              const inMonth = isSameMonth(day, monthStart);
              return (
                <div key={key} className={`min-h-[88px] p-2 rounded-md ${inMonth ? 'bg-slate-700' : 'bg-slate-900/30'} text-xs`}>
                  <div className={`flex items-center justify-between mb-1 ${isSameDay(day, new Date()) ? 'text-blue-300' : 'text-slate-300'}`}>
                    <div className="font-medium">{format(day, 'd')}</div>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {events.slice(0, 3).map((ev) => {
                      const status = ev.status ?? ev.state ?? 'Pendente';
                      const colorClass = getStatusColor(status) || 'bg-slate-600';
                      const isTip = ev.origin_tag === 'Gerado por Dica' || /Gerado por Dica/i.test(ev.description || '');
                      return (
                        <div
                          key={ev.id ?? ev.ID ?? ev.title + ev.start}
                          onClick={() => ev.id && navigate(`/calendar/edit/${ev.id}`)}
                          title={ev.title}
                          className={`relative rounded px-1 py-0.5 text-xxs text-white truncate cursor-pointer ${colorClass} hover:opacity-90 ${isTip ? 'ring-2 ring-emerald-400/70 shadow-[0_0_0_1px_rgba(16,185,129,0.5)]' : ''}`}
                        >
                          {isTip && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-300 shadow animate-ping" />}
                          {isTip && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 shadow" />}
                          <div className="text-[11px] truncate flex items-center gap-1">
                            {isTip && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />}
                            {ev.title || ev.name || '—'}
                          </div>
                          <div className="text-[10px] text-slate-100">{ev.start ? format(parseDate(ev.start), 'HH:mm') : ''}</div>
                        </div>
                      );
                    })}
                    {events.length > 3 && <div className="text-slate-400 text-[11px]">+{events.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FullCalendarView;
