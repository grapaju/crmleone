import React from 'react';
import { motion } from 'framer-motion';
import { Clock, FileText, User, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTypeColor, getStatusColor } from '@/lib/calendarUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const safeFormatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const parsed = new Date(dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr);
    return isNaN(parsed.getTime()) ? null : format(parsed, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return null;
  }
};

const AppointmentCard = ({ appointment }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
    className="group cursor-pointer h-full"
    data-appointment-id={appointment.id || appointment.ID}
  >
    <Card className={`glass-effect card-hover h-full relative ${(/Gerado por Dica/i.test(appointment.description || '') || appointment.origin_tag === 'Gerado por Dica') ? 'border-emerald-500/60 ring-1 ring-emerald-500/40 bg-gradient-to-br from-slate-800/80 to-slate-900/80' : 'border-slate-700' }`}>
      {(/Gerado por Dica/i.test(appointment.description || '') || appointment.origin_tag === 'Gerado por Dica') && (
        <div className="absolute -top-2 -left-2 bg-emerald-600 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shadow-md flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> Dica
        </div>
      )}
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="space-y-3">
          {/* Título + Tipo/Status */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2 min-w-0">
              <h3 className="font-semibold text-white text-sm truncate overflow-hidden whitespace-nowrap">{appointment.title || appointment.titulo || '—'}</h3>
              <p className="text-xs text-slate-400 mt-1 truncate overflow-hidden whitespace-nowrap" title={appointment.property_title || appointment.project_name || appointment.property_name || appointment.project || ''}>
                {appointment.property_title || appointment.project_name || appointment.property_name || appointment.project || "—"}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-1 flex-shrink-0">
              <Badge className={getTypeColor(appointment.type ?? appointment.event_type ?? 'Outro')} variant="secondary">{appointment.type ?? appointment.event_type ?? 'Outro'}</Badge>
              <Badge className={getStatusColor(appointment.status ?? appointment.state ?? 'Pendente')} variant="secondary">{appointment.status ?? appointment.state ?? 'Pendente'}</Badge>
            </div>
          </div>

          {/* Data e hora */}
          <div className="flex items-center text-slate-300 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {safeFormatDate(appointment.start) || "Data não definida"}
          </div>

          {/* Cliente e Corretor */}
          <div className="space-y-1">
            <div className="flex items-center text-slate-300 text-xs truncate">
              <User className="w-3 h-3 mr-1" />
              Cliente: {appointment.lead_name || appointment.client || appointment.cliente_nome || "—"}
            </div>
            <div className="flex items-center text-slate-300 text-xs truncate">
              <Building2 className="w-3 h-3 mr-1" />
              Agente: {appointment.agent_name || appointment.agent || appointment.usuario_nome || appointment.agentName || "—"}
            </div>
          </div>

          {/* Trecho das Observações */}
          <div className="flex items-center text-slate-400 text-xs truncate">
            <FileText className="w-3 h-3 mr-1" />
            {(() => {
              const full = appointment.description ?? appointment.notes ?? appointment.observacoes ?? '';
              if (!full) return 'Observações não disponíveis';
              const max = 120;
              const snippet = full.length > max ? full.slice(0, max).trim() + '…' : full;
              return <span title={full}>{snippet}</span>;
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default AppointmentCard;
