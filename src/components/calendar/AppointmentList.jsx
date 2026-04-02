import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppointmentCard from '@/components/calendar/AppointmentCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const safeFormat = (d) => {
  if (!d) return '—';
  try {
    const parsed = new Date(d.includes(' ') ? d.replace(' ', 'T') : d);
    if (isNaN(parsed.getTime())) return '—';
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '—';
  }
};

const AppointmentList = ({ title, icon: Icon, appointments, isUpcoming = false }) => (
  <motion.div 
    initial={{ opacity: 0, x: isUpcoming ? 20 : -20 }} 
    animate={{ opacity: 1, x: 0 }} 
    transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
  >
    <Card className="glass-effect border-slate-700 h-full">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Icon className="w-5 h-5 mr-2 text-blue-400" />
          {title} {isUpcoming ? '' : `(${new Date().toLocaleDateString('pt-BR')})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Icon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">Nenhum compromisso para hoje.</p>
          </div>
        ) : (
          isUpcoming ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appointment) => (
                <Link to={`/calendar/edit/${appointment.id}`} key={appointment.id} className="space-y-2">
                  <span className="text-sm font-medium text-slate-300">
                    {safeFormat(appointment.start)}
                  </span>
                  <AppointmentCard appointment={appointment} />
                </Link>
              ))}
            </div>
          ) : (
            appointments.map((appointment) => (
              <Link to={`/calendar/edit/${appointment.id}`} key={appointment.id}>
                <AppointmentCard appointment={appointment} />
              </Link>
            ))
          )
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default AppointmentList;