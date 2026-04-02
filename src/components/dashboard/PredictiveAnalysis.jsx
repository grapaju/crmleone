import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BrainCircuit, AlertTriangle, Target, Zap, Calendar, Mail, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PredictiveAnalysis = ({ stalledDeals, propertySuggestions, nextActions }) => {
  const { toast } = useToast();

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleImmediateAction = (action) => {
    const text = (() => {
      switch (action.type) {
        case 'contato_imediato': return `Ligar para ${action.leadName}`;
        case 'follow_up': return `Enviar follow-up para ${action.leadName}`;
        case 'nutrir': return `Enviar material para ${action.leadName}`;
        case 'reengajar': return `Incluir ${action.leadName} em campanha de reengajamento`;
        case 'recontato': return `Recontatar ${action.leadName}`;
        default: return action.description || `Executar ação para ${action.leadName}`;
      }
    })();
    toast({ title: 'Ação Preditiva', description: text });
  };

  return (
    <Card className="glass-effect border-slate-700 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <BrainCircuit className="w-6 h-6 mr-2 text-purple-400" /> Análises Preditivas e Ações
        </CardTitle>
        <CardDescription>Sugestões automáticas para otimizar suas vendas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
  {/* Next Best Actions */}
  <TooltipProvider delayDuration={0}>
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h4 className="font-semibold text-slate-300 mb-2 flex items-center"><Target className="w-4 h-4 mr-2" /> Próximas Ações Recomendadas</h4>
          <div className="space-y-3">
            {nextActions.slice(0, 4).map((action, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                <div>
                  <p className="text-sm text-white">{action.description} <Link to={`/leads/edit/${action.leadId}`} className="font-bold text-blue-400 hover:underline">{action.leadName}</Link>.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label="Agendar" className="p-1 rounded-md hover:bg-slate-700/50" onClick={() => {
                    // map action.type to appointment type label
                    const typeMap = {
                      visita: 'Visita',
                      proposta: 'Reunião',
                      followup: 'Ligar',
                      material: 'Mensagem',
                      oferta: 'Reunião',
                      nutricao: 'Mensagem',
                      reativacao: 'Mensagem',
                    };
                    const apptType = typeMap[action.type] || (action.type ? String(action.type).charAt(0).toUpperCase() + String(action.type).slice(1) : 'Tarefa');
                    const state = {
                      clientId: action.leadId ? String(action.leadId) : undefined,
                      clientName: action.leadName,
                      propertyId: action.propertyId ? String(action.propertyId) : undefined,
                      propertyTitle: action.propertyTitle || undefined,
                      agentId: user?.id ? String(user.id) : undefined,
                      notes: action.description,
                      type: apptType,
                      title: action.description,
                    };
                    navigate('/calendar/new', { state });
                      }}>
                        <Calendar className="w-4 h-4 text-indigo-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Agendar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label="Fazer agora" className="p-1 rounded-md hover:bg-slate-700/50" onClick={() => handleImmediateAction(action)}>
                        <Zap className="w-4 h-4 text-amber-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Fazer agora</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        </TooltipProvider>

        {/* Stalled Deals */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h4 className="font-semibold text-slate-300 mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" /> Alerta de Negociações Paradas</h4>
          <div className="space-y-3">
            {stalledDeals.slice(0, 2).map((deal, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                <p className="text-sm text-yellow-300">Negociação com <Link to={`/leads/edit/${deal.leadId}`} className="font-bold hover:underline">{deal.leadName}</Link> está parada há {deal.days} dias.</p>
                <Button size="sm" variant="ghost" className="text-yellow-300 hover:text-yellow-200" onClick={() => handleImmediateAction({ type: 'reativar', leadName: deal.leadName })}>Reativar</Button>
              </div>
            ))}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default PredictiveAnalysis;