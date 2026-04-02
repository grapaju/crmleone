import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, UserPlus, TrendingUp, Clock, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { leadService } from "@/services/leadService";
import { useToast } from "@/components/ui/use-toast";
import LeadCard from "@/components/leads/LeadCard";
// Função para formatar valor monetário
const formatCurrency = (value) => {
  if (value == null || value === "") return "";
  let num = value;
  if (typeof num === "string") {
    num = num.replace(/\D/g, "");
    if (!num) return "R$ 0,00";
    num = parseInt(num, 10) / 100;
  }
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
import LeadFilters from "@/components/leads/LeadFilters";
import { getScoreCategory } from "@/lib/leadUtils";
// import KanbanBoard from '@/components/leads/kanban/KanbanBoard';
import { useAuth } from "@/contexts/AuthContext";

const Leads = () => {
  const [allLeads, setAllLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchLeads() {
      try {
        const leads = await leadService.getLeadsWithScore();
        setAllLeads(leads);
      } catch (err) {
        toast({
          title: "Erro ao carregar leads",
          description: "Não foi possível carregar os leads da API.",
          variant: "destructive",
        });
      }
    }
    fetchLeads();
  }, [toast]);

  const handleDelete = async (id) => {
    try {
      await leadService.deleteLead(id);
      setAllLeads((prev) => prev.filter((l) => l.id !== id));
      toast({
        title: "✅ Lead Excluído",
        description: "O lead foi excluído com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao excluir lead",
        description: "Não foi possível excluir o lead.",
        variant: "destructive",
      });
    }
  };

  const myLeads =
    user.role === "admin"
      ? allLeads
      : allLeads.filter((lead) => {
          // Log para depuração: comparar lead.agent_name e user.name
          console.log("[DEBUG] Comparando lead.agent_name e user.name:", {
            "lead.id": lead.id,
            "lead.agent_name": lead.agent_name,
            "user.name": user.name,
            iguais: lead.agent_name === user.name,
          });
          return lead.agent_name === user.name;
        });

  const filteredLeads = myLeads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (lead.name?.toLowerCase() ?? "").includes(searchLower) ||
      (lead.email?.toLowerCase() ?? "").includes(searchLower) ||
      (lead.phone ?? "").includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    const matchesSource =
      sourceFilter === "all" || lead.source === sourceFilter;
    const scoreCategory = getScoreCategory(lead.score || 0).name;
    const matchesScore = scoreFilter === "all" || scoreCategory === scoreFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesScore;
  });

  const totalLeads = myLeads.length;
  const hotLeads = myLeads.filter(
    (l) => getScoreCategory(l.score || 0).name === "Quente"
  ).length;
  const warmLeads = myLeads.filter(
    (l) => getScoreCategory(l.score || 0).name === "Morno"
  ).length;
  const coldLeads = myLeads.filter(
    (l) => getScoreCategory(l.score || 0).name === "Frio"
  ).length;
  // const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Leads</h1>
          <p className="text-slate-400">
            {user.role === "admin"
              ? "Gerencie e pontue todas as oportunidades de negócio"
              : "Gerencie e pontue suas oportunidades de negócio"}
          </p>
        </div>
        <Link to="/leads/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Lead
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          title="Total de Leads"
          value={totalLeads}
          icon={UserPlus}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          title="Leads Quentes"
          value={hotLeads}
          icon={Zap}
          color="bg-red-500/20 text-red-400"
        />
        <StatCard
          title="Leads Mornos"
          value={warmLeads}
          icon={TrendingUp}
          color="bg-yellow-500/20 text-yellow-400"
        />
        <StatCard
          title="Leads Frios"
          value={coldLeads}
          icon={Clock}
          color="bg-cyan-500/20 text-cyan-400"
        />
      </div>

      <LeadFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        scoreFilter={scoreFilter}
        setScoreFilter={setScoreFilter}
      />

      {/* Kanban removido: controles de viewMode */}

      <div className="space-y-6">
        {filteredLeads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={{
                  ...lead,
                  budget: formatCurrency(lead.budget),
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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

const EmptyState = () => (
  <Card className="glass-effect border-slate-700">
    <CardContent className="p-12 text-center">
      <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">
        Nenhum lead encontrado
      </h3>
      <p className="text-slate-400 mb-6">
        Comece cadastrando seu primeiro lead ou ajuste seus filtros
      </p>
      <Link to="/leads/new">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Cadastrar Lead
        </Button>
      </Link>
    </CardContent>
  </Card>
);

export default Leads;
