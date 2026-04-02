import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agentService } from '@/services/agentService';
import AgentStats from '@/components/agents/AgentStats';
import AgentFilters from '@/components/agents/AgentFilters';
import AgentList from '@/components/agents/AgentList';
import TopPerformers from '@/components/agents/TopPerformers';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { user } = useAuth();
  const { toast } = useToast();

useEffect(() => {
  const fetchAgents = async () => {
    try {
      const data = await agentService.getAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar agentes", error);
      setAgents([]); // evita quebra
    }
  };
  fetchAgents();
}, []);

  const filteredAgents = agents.filter(agent => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = agent.name.toLowerCase().includes(term) ||
                          agent.email.toLowerCase().includes(term) ||
                          (agent.document && agent.document.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id) => {
    if (user.id === id) {
        toast({
            title: "Ação não permitida",
            description: "Você não pode excluir seu próprio usuário.",
            variant: "destructive"
        });
        return;
    }
    try {
      const ok = await agentService.deleteAgent(id);
      if (!ok) throw new Error('Falha ao excluir usuário');
      const fresh = await agentService.getAgents();
      setAgents(Array.isArray(fresh) ? fresh : []);
      toast({
          title: "🗑️ Usuário Excluído",
          description: "O usuário foi removido do sistema."
      });
    } catch (err) {
      console.error('Erro ao excluir agente:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Usuários</h1>
          <p className="text-slate-400">Gerencie sua equipe de agentes e administradores</p>
        </div>
        {user?.role === 'admin' && (
            <Link to="/agents/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
            </Button>
            </Link>
        )}
      </div>

      <AgentStats agents={agents} />
      <AgentFilters 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {filteredAgents.length === 0 ? (
        <Card className="glass-effect border-slate-700">
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum usuário encontrado</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os termos de busca ou filtros'
                : 'Comece cadastrando seu primeiro usuário'
              }
            </p>
            {user?.role === 'admin' && (
                <Link to="/agents/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Usuário
                </Button>
                </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AgentList agents={filteredAgents} onDelete={handleDelete} />
        </div>
      )}

      {agents.length > 0 && (
         <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <TopPerformers agents={agents} />
        </motion.div>
      )}
    </div>
  );
};

export default Agents;