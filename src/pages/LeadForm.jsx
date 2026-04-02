import React, { useState, useEffect } from "react";
// Removido InputMask, máscara será feita manualmente
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { leadService } from "@/services/leadService";
import { propertyService } from "@/services/propertyService";
import { agentService } from "@/services/agentService";
import { useAuth } from "@/contexts/AuthContext";

const LeadForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();

  // Função para aplicar máscara de telefone manualmente
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length > 10) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (numbers.length > 0) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    }
    return "";
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    status: "Novo",
    interest: "",
    budget: "",
    location: "",
    agent: user?.name || "",
    notes: "",
    relatedPropertyId: "",
  });

  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  const sources = [
    "Site",
    "WhatsApp",
    "Facebook",
    "Google",
    "Indicação",
    "Telefone",
    "E-mail",
  ];
  const statuses = [
    "Novo",
    "Contato Inicial",
    "Visita Agendada",
    "Visita Realizada",    
    "Proposta",
    "Negociação",    
    "Fechamento",
    "Perdido",
  ];
  const interests = [
    "Apartamento",
    "Casa",
    "Cobertura",
    "Terreno",
    "Comercial",
    "Rural",
  ];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [props, ags] = await Promise.all([
          propertyService.getProperties(),
          agentService.getAgents(),
        ]);
        setProperties(props);
        setAgents(ags);

        if (isEditing) {
          const lead = await leadService.getLeadById(id);
          if (lead) {
            if (user.role !== "admin" && lead.agent_name !== user.name) {
              toast({
                title: "Acesso Negado",
                description: "Você não tem permissão para editar este lead.",
                variant: "destructive",
              });
              navigate("/leads");
              return;
            }
            setFormData({
              name: lead.name || "",
              email: lead.email || "",
              phone: lead.phone || "",
              source: lead.source || "",
              status: lead.status || "Novo",
              interest: lead.interest || "",
              budget: lead.budget ? formatCurrency(lead.budget) : "",
              location: lead.location || "",
              agent: lead.agent_name || user.name,
              notes: lead.notes || "",
              relatedPropertyId: lead.propertie_id
                ? String(lead.propertie_id)
                : "",
            });
            // scoreDetails removido da tela de edição
          } else {
            toast({
              title: "❌ Erro",
              description: "Lead não encontrado.",
              variant: "destructive",
            });
            navigate("/leads");
          }
        }
      } catch (err) {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as informações.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }
    fetchData();
  }, [id, isEditing, navigate, user]);

  // Função para formatar valor monetário para exibição
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

  // Função para extrair valor numérico do campo orçamento
  const parseCurrency = (value) => {
    if (!value) return null;
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return null;
    return parseFloat((parseInt(numbers, 10) / 100).toFixed(2));
  };

  const handleInputChange = (field, value) => {
    if (field === "phone") {
      setFormData((prev) => ({ ...prev, phone: formatPhone(value) }));
    } else if (field === "budget") {
      setFormData((prev) => ({ ...prev, budget: formatCurrency(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.source
    ) {
      toast({
        title: "❌ Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: isEditing ? id : undefined,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: formData.source || "",
        status: formData.status,
        interest: formData.interest || "",
        budget: parseCurrency(formData.budget),
        location: formData.location || "",
        notes: formData.notes || "",
        agent_id: agents.find((a) => a.name === formData.agent)?.id || null,
        propertie_id: formData.relatedPropertyId
          ? Number(formData.relatedPropertyId)
          : null,
      };

      await leadService.saveLead(payload);

      toast({
        title: isEditing ? "✅ Lead Atualizado" : "✅ Lead Cadastrado",
        description: `O lead "${formData.name}" foi salvo com sucesso!`,
      });

      navigate("/leads");
    } catch (error) {
      toast({
        title: "Erro ao salvar lead",
        description: "Não foi possível salvar o lead.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Função de recalcular score removida

  // computeStatusFromScoreDetails removed — suggestions moved to LeadsTip / leadUtils

  // safeFormatDate removido (sem histórico / compromissos aqui)

  // scoreDetails handling remains; suggestions removed (handled by LeadsTip)

  // sugestões de status removidas

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between space-x-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/leads")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? "Editar Lead" : "Cadastrar Novo Lead"}
            </h1>
            <p className="text-slate-400">
              {isEditing
                ? "Atualize as informações do lead"
                : "Preencha os dados do novo lead"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3" />
      </div>

      <div className="max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="glass-effect border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  Informações do Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <Label className="text-white">Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Digite o nome"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <Label className="text-white">E-mail *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Digite o e-mail"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(99) 99999-9999"
                    className="bg-slate-800 border-slate-600"
                    maxLength={15}
                    inputMode="tel"
                  />
                </div>

                {/* Fonte */}
                <div>
                  <Label className="text-white">Fonte *</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(val) => handleInputChange("source", val)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-white">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => handleInputChange("status", val)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {statuses.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Interesse */}
                <div>
                  <Label className="text-white">Interesse</Label>
                  <Select
                    value={formData.interest}
                    onValueChange={(val) => handleInputChange("interest", val)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o interesse" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {interests.map((int) => (
                        <SelectItem key={int} value={int}>
                          {int}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Orçamento */}
                <div>
                  <Label className="text-white">Orçamento</Label>
                  <Input
                    type="text"
                    value={formData.budget}
                    onChange={(e) =>
                      handleInputChange("budget", e.target.value)
                    }
                    placeholder="R$ 0,00"
                    className="bg-slate-800 border-slate-600"
                    inputMode="numeric"
                    maxLength={20}
                  />
                </div>

                {/* Localização */}
                <div>
                  <Label className="text-white">Localização</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    placeholder="Ex: São Paulo, SP"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                {/* Agente */}
                <div>
                  <Label className="text-white">Agente Responsável</Label>
                  <Select
                    value={formData.agent}
                    onValueChange={(val) => handleInputChange("agent", val)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {agents.map((ag) => (
                        <SelectItem key={ag.id} value={ag.name}>
                          {ag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Imóvel */}
                <div>
                  <Label className="text-white">Imóvel Relacionado</Label>
                  <Select
                    value={formData.relatedPropertyId}
                    onValueChange={(val) =>
                      handleInputChange("relatedPropertyId", val)
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o imóvel" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={String(prop.id)}>
                          {prop.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div className="md:col-span-2">
                  <Label className="text-white">Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Adicione observações sobre o lead"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </CardContent>
            </Card>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.45, ease: "easeOut" }}
              className="flex justify-end space-x-4"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/leads")}
                className="border-slate-600 hover:bg-slate-700/50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 flex-1"
                disabled={loading}
              >
                {isEditing ? "Atualizar Lead" : "Cadastrar Lead"}
              </Button>
            </motion.div>
          </form>
      </div>
    </div>
  );
};

export default LeadForm;
