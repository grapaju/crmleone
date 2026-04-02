import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { activityService } from '@/services/activityService';
import { appointmentService } from '@/services/appointmentService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MessageSquare, DollarSign, Flag, User, Clock } from 'lucide-react';

const ActivityIcon = ({ type }) => {
  const iconMap = {
    'Visita': <Calendar className="w-5 h-5 text-blue-400" />,
    'Proposta': <DollarSign className="w-5 h-5 text-green-400" />,
    'Mensagem': <MessageSquare className="w-5 h-5 text-purple-400" />,
    'Status': <Flag className="w-5 h-5 text-yellow-400" />,
    'default': <User className="w-5 h-5 text-slate-400" />,
  };
  return iconMap[type] || iconMap['default'];
};

const PropertyActivityTimeline = ({ propertyId }) => {
  const [activities, setActivities] = useState([]);
  const [newActivityText, setNewActivityText] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const propertyActivities = activityService.getActivitiesForProperty(propertyId) || [];
        const rawAppointments = await appointmentService.getAppointmentsByPropertyId(propertyId);
        const appsArray = Array.isArray(rawAppointments) ? rawAppointments : [];

        const propertyAppointments = appsArray.map((app) => ({
          id: `app-${app.id}`,
          propertyId: propertyId,
          type: 'Visita',
          description: `Visita agendada para ${format(new Date(app.start), "dd/MM/yyyy '\u00e0s' HH:mm")} com ${app.client || app.client_name || app.lead_name || 'cliente'}.`,
          agentName: app.agent || app.agent_name || app.agentName || null,
          timestamp: app.start ? new Date(app.start).toISOString() : new Date().toISOString(),
        }));

        const combinedActivities = [...propertyActivities, ...propertyAppointments].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        if (mounted) setActivities(combinedActivities);
      } catch (e) {
        // In case of any error, fallback to activityService only so UI doesn't crash
        const onlyActivities = activityService.getActivitiesForProperty(propertyId) || [];
        if (mounted) setActivities(onlyActivities);
        console.warn('Falha ao carregar compromissos para o imóvel:', e);
      }
    };

    load();
    return () => { mounted = false; };
  }, [propertyId]);

  const handleAddActivity = () => {
    if (!newActivityText.trim()) {
      toast({ title: "Texto vazio", description: "Por favor, escreva algo para registrar.", variant: "destructive" });
      return;
    }

    const newActivity = {
      propertyId,
      type: 'Mensagem', // Default type for manual entries
      description: newActivityText,
      agentName: user.name,
    };

    const savedActivity = activityService.addActivity(newActivity);
    setActivities([savedActivity, ...activities]);
    setNewActivityText('');
    toast({ title: "✅ Atividade Registrada", description: "Sua anotação foi adicionada à linha do tempo." });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Linha do Tempo de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <Textarea
              placeholder="Registre uma nova interação, proposta ou anotação..."
              value={newActivityText}
              onChange={(e) => setNewActivityText(e.target.value)}
              className="bg-slate-800 border-slate-600 min-h-[80px]"
            />
            <Button onClick={handleAddActivity} className="w-full bg-blue-600 hover:bg-blue-700">Registrar Atividade</Button>
          </div>

          <div className="relative pl-6">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-700"></div>
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="relative mb-8">
                  <div className="absolute -left-2 top-1.5 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <ActivityIcon type={activity.type} />
                  </div>
                  <div className="pl-8">
                    <p className="text-white font-semibold">{activity.type}</p>
                    <p className="text-slate-300 text-sm">{activity.description}</p>
                    <div className="flex items-center text-xs text-slate-400 mt-1 space-x-4">
                      <div className="flex items-center"><User className="w-3 h-3 mr-1" />{activity.agentName}</div>
                      <div className="flex items-center"><Clock className="w-3 h-3 mr-1" />{format(new Date(activity.timestamp), "dd MMM yyyy, HH:mm", { locale: ptBR })}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>Nenhuma atividade registrada para este imóvel ainda.</p>
                <p className="text-sm">Seja o primeiro a adicionar uma anotação!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyActivityTimeline;