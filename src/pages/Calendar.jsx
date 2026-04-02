import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { appointmentService } from '@/services/appointmentService';
import { agentService } from '@/services/agentService';
import { leadService } from '@/services/leadService';
import { propertyService } from '@/services/propertyService';
import AppointmentList from '@/components/calendar/AppointmentList';
import CalendarFilters from '@/components/calendar/CalendarFilters';
import CalendarStats from '@/components/calendar/CalendarStats';
import FullCalendarView from '@/components/calendar/FullCalendarView';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isFuture } from 'date-fns';

const Calendar = () => {
  const [allAppointments, setAllAppointments] = useState([]);
  const highlightRef = useRef(null); // store id to highlight
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const { user } = useAuth();

useEffect(() => {
  (async () => {
    try {
      const appointmentsData = await appointmentService.getAppointments();
      console.log('🔍 Todos os agendamentos carregados (raw):', appointmentsData);

      // Normalize backend wrapper shapes: accept array, { value: [...] }, or { data: [...] }
      const rawList = Array.isArray(appointmentsData)
        ? appointmentsData
        : appointmentsData?.value ?? appointmentsData?.data ?? [];

      // Ensure basic start/end keys exist and are consistent
      const normalized = rawList.map((a) => ({
        ...a,
        start: a.start ?? a.event_date ?? a.data_inicio ?? a.start_date ?? null,
        end: a.end ?? a.event_time ?? a.data_fim ?? a.end_date ?? null,
      }));

      // Enrich each appointment with agent/lead/property display names
      const enriched = await Promise.all(
        normalized.map(async (ap) => {
          try {
            const [agent, lead, property] = await Promise.all([
              ap.agent_id ? agentService.getAgentById(ap.agent_id) : null,
              ap.lead_id ? leadService.getLeadById(ap.lead_id) : null,
              ap.property_id ? propertyService.getPropertyById(ap.property_id) : null,
            ]);

            return {
              ...ap,
              agent_name: agent?.name ?? agent?.usuario_nome ?? agent?.agentName ?? null,
              agent: agent?.name ?? ap.agent ?? null,
              lead_name: lead?.name ?? lead?.cliente_nome ?? ap.client ?? null,
              client: lead?.name ?? ap.client ?? null,
              property_title: property?.title ?? property?.name ?? property?.titulo ?? null,
              property_address: property?.address ?? property?.endereco ?? null,
              property: property?.title ?? property?.name ?? null,
              project_name: ap.project_name ?? ap.project ?? null,
            };
          } catch (err) {
            console.warn('Erro enriquecendo agendamento', ap, err);
            return ap;
          }
        })
      );

      console.log('🔍 Agendamentos normalizados e enriquecidos:', enriched);
      setAllAppointments(enriched || []);
    } catch (e) {
      console.warn('Erro carregando agendamentos:', e);
      setAllAppointments([]);
    }
  })();
}, []);

// Listen to created appointment events to inject into list quickly and highlight
useEffect(() => {
  function handleCreated(ev){
    const ap = ev.detail;
    if(!ap) return;
    // Add only if not already present
    setAllAppointments(prev => {
      const exists = prev.some(p => String(p.id) === String(ap.id));
      if (exists) return prev;
      const enriched = { ...ap, start: ap.start, end: ap.end };
      highlightRef.current = ap.id;
      return [...prev, enriched];
    });
    // After slight delay, attempt scrolling
    setTimeout(() => {
      try {
        const el = document.querySelector(`[data-appointment-id="${ap.id}"]`);
        if (el) {
          el.classList.add('ring-2','ring-emerald-400','animate-pulse');
          el.scrollIntoView({ behavior:'smooth', block:'center'});
          setTimeout(()=> el.classList.remove('animate-pulse'), 3000);
        }
      } catch {}
    }, 700);
  }
  window.addEventListener('appointment:created', handleCreated);
  return () => window.removeEventListener('appointment:created', handleCreated);
}, []);

useEffect(() => {
  let appointmentsToFilter = allAppointments;

  if (user?.role === 'agente') {
    appointmentsToFilter = allAppointments.filter(app => app.agent === user.name);
  }

  const appointmentsByType = appointmentsToFilter.filter(appointment => {
    if (filterType === 'all') return true;
    return appointment.type === filterType;
  });

  console.log('📅 Agendamentos filtrados:', appointmentsByType);
  setFilteredAppointments(appointmentsByType);
}, [allAppointments, filterType, user]);



  const todayAppointments = filteredAppointments.filter(a => isToday(new Date(a.start)));
  const upcomingAppointments = filteredAppointments.filter(a => isFuture(new Date(a.start)) && !isToday(new Date(a.start))).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda de Atendimentos</h1>
          <p className="text-slate-400">
            {user?.role === 'agente' ? 'Seus compromissos e visitas' : 'Gerencie visitas, reuniões e compromissos'}
          </p>
        </div>
        <Link to="/calendar/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Agendamento
          </Button>
        </Link>
      </div>

      <CalendarStats appointments={filteredAppointments} todayAppointments={todayAppointments} />
      <CalendarFilters filterType={filterType} setFilterType={setFilterType} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AppointmentList title="Hoje" icon={CalendarIcon} appointments={todayAppointments} isUpcoming={false} />
        <div className="lg:col-span-2">
          <AppointmentList title="Próximos Compromissos" icon={CalendarIcon} appointments={upcomingAppointments} isUpcoming={true} />
        </div>
      </div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <FullCalendarView appointments={filteredAppointments} />
      </motion.div>
    </div>
  );
};

export default Calendar;