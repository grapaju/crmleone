import React, { useState, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import AppointmentForm from "../../pages/AppointmentForm"; // ajuste o caminho conforme necessário

export function CompactDateTimePicker({
  value = null,
  onChange = () => {},
  placeholder = "Escolha data e hora",
  minDate = undefined,
  maxDate = undefined,
  disabled = false,
  id = undefined,
  minuteStep = 15,
  minHour = 8,
  maxHour = 22,
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [selectedHour, setSelectedHour] = useState(value ? formatHour(new Date(value)) : "");

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setSelectedHour(formatHour(d));
    } else {
      setSelectedDate(null);
      setSelectedHour("");
    }
  }, [value]);

  function formatHour(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function handleDateSelect(day) {
    if (minDate && day < minDate) return;
    if (maxDate && day > maxDate) return;
    setSelectedDate(day);
  }

  function handleHourSelect(hourString) {
    setSelectedHour(hourString);
    if (!selectedDate) return;
    const [hh, mm] = hourString.split(":");
    const combined = new Date(selectedDate);
    combined.setHours(Number(hh), Number(mm || 0), 0, 0);
    onChange(combined);
    setTimeout(() => setOpen(false), 120);
  }

  function formatDisplay() {
    if (!selectedDate) return "";
    const [H, M] = selectedHour.split(":");
    const combined = new Date(selectedDate);
    combined.setHours(Number(H || 0), Number(M || 0), 0, 0);
    return combined.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  const hours = [];
  for (let h = minHour; h <= maxHour; h++) {
    if (h === maxHour) {
      // only allow exact hour on the maxHour (e.g., 22:00)
      hours.push(`${String(h).padStart(2, "0")}:00`);
    } else {
      for (let m = 0; m < 60; m += minuteStep) {
        hours.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
  }

  return (
    <div className="inline-block">
  <Popover.Root open={open} onOpenChange={setOpen}>
   <Popover.Trigger asChild>
  <button
    id={id}
    type="button"
    disabled={disabled}
    className="w-full px-3 py-2 rounded-md border bg-slate-800 border-slate-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-1"
    aria-haspopup="dialog"
  >
    {formatDisplay() || placeholder}
  </button>
</Popover.Trigger>

       <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          className="rounded-md shadow-lg p-3 bg-slate-800 text-white min-w-[260px] z-[9999]"
        >
          <div className="flex flex-col gap-2">
    <DayPicker
      mode="single"
      selected={selectedDate}
      onSelect={handleDateSelect}
      fromDate={minDate}
      toDate={maxDate}
      locale={ptBR}
      className="text-white"
      styles={{
        caption: { color: 'white' },
        head: { color: 'white' },
        row: { color: 'white' },
        cell: { padding: '4px' },
        day: { fontSize: '0.875rem', margin: 0 },
      }}
    />

            {selectedDate && (
              <div className="flex items-center gap-2">
                <div className="text-sm">Hora:</div>
               <select
  aria-label="Selecionar hora"
  value={selectedHour}
  onChange={(e) => handleHourSelect(e.target.value)}
  className="px-2 py-1 rounded-md border bg-slate-800 border-slate-600 text-white text-sm w-full"
>
  <option value="" className="bg-slate-800 text-white">Selecione</option>
  {hours.map((h) => (
    <option key={h} value={h} className="bg-slate-800 text-white">{h}</option>
  ))}
</select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded-md text-sm">
                Fechar
              </button>
            </div>
          </div>
          <Popover.Arrow className="fill-current text-white" />
        </Popover.Content>
       </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

// Substituição no AppointmentForm
export default function AppointmentFormWithCompactPicker(props) {
  return <AppointmentForm {...props} DateTimePickerComponent={CompactDateTimePicker} />;
}
