import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Building2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Card className="glass-effect border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const CalendarStats = ({ appointments, todayAppointments }) => {
  const stats = [
    { title: 'Hoje', value: todayAppointments.length, icon: CalendarIcon, color: 'bg-blue-500/20 text-blue-400' },
    { title: 'Esta Semana', value: appointments.length, icon: Clock, color: 'bg-green-500/20 text-green-400' },
    { title: 'Visitas', value: appointments.filter(a => a.type === 'Visita').length, icon: Building2, color: 'bg-purple-500/20 text-purple-400' },
    { title: 'Confirmados', value: appointments.filter(a => a.status === 'Confirmado').length, icon: User, color: 'bg-yellow-500/20 text-yellow-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} {...stat} delay={0.1 * (index + 1)} />
      ))}
    </div>
  );
};

export default CalendarStats;