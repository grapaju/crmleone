import React, { useRef } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-dark.css"; // ⬅️ CSS customizado para o modo escuro

registerLocale("pt-BR", ptBR);

const DateTimePicker = ({ id, label, selected, onChange, required = false }) => {
  const ref = useRef(null);

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-slate-300 text-sm font-medium">
          {label} {required && "*"}
        </label>
      )}
      <div className="relative">
        <DatePicker
          id={id}
          ref={ref}
          selected={selected}
          onChange={onChange}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="dd/MM/yyyy HH:mm"
          timeCaption="Hora"
          locale="pt-BR"
          todayButton="Hoje"
          placeholderText="Selecione a data e hora"
          className="w-full rounded-md border border-slate-600 bg-slate-800 text-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          calendarClassName="datepicker-dark"
  popperClassName="z-[9999]"
  withPortal
        />
        <Clock
          onClick={() => ref.current?.setFocus()}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default DateTimePicker;
