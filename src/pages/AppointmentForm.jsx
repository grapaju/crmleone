import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, FileText } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { CompactDateTimePicker } from "@/components/ui/CompactDateTimePicker";
import { appointmentService } from "@/services/appointmentService";
import { propertyService } from "@/services/propertyService";
import { agentService } from "@/services/agentService";
import { leadService } from "@/services/leadService";
import { useAuth } from "@/contexts/AuthContext";

const AppointmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: "",
    type: "Ligar",
    start: new Date(),
    end: null,
    client: "", // lead_id
    agent: "", // agent_id
    propertyId: "", // property_id
    projectId: "", // project_id
    status: "Pendente",
    notes: "", // description
  });

  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [errors, setErrors] = useState({});

  // Novo loading state para garantir que dados estejam carregados antes de preencher o form
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        // Carregar propriedades
        let propsList = [];
        try {
          const propsRes = await propertyService.getProperties();
          propsList = propsRes && propsRes.data ? propsRes.data : Array.isArray(propsRes) ? propsRes : [];
          setProperties((propsList || []).map((p) => ({
            value: String(p.id ?? p.ID ?? p.property_id ?? ""),
            label: p.title ?? p.projectName ?? p.titulo ?? p.name ?? "",
          })));
        } catch (err) {
          console.warn("Erro carregando propriedades", err);
          setProperties([]);
        }

        // Carregar agentes
        let agentsList = [];
        try {
          const agentsRes = await agentService.getAgents();
          agentsList = Array.isArray(agentsRes) ? agentsRes : [];
          setAgents(agentsList.map((a) => ({
            value: String(a.id ?? a.ID ?? a.agent_id ?? a.name ?? ""),
            label: a.name ?? a.title ?? "",
          })));
        } catch (err) {
          console.warn("Erro carregando agentes", err);
          setAgents([]);
        }

        // Carregar leads
        let leadsList = [];
        try {
          const leadsRes = await leadService.getLeads();
          leadsList = Array.isArray(leadsRes) ? leadsRes : [];
          setLeads(leadsList.map((l) => ({
            value: String(l.id ?? l.ID ?? l.lead_id ?? l.name ?? ""),
            label: l.name ?? "",
          })));
        } catch (err) {
          console.warn("Erro carregando leads", err);
          setLeads([]);
        }

        // Só preenche o form depois que tudo está carregado
        if (isEditing) {
          const appointment = await appointmentService.getAppointmentById(id);
          if (appointment) {
            setFormData({
              ...appointment,
              client: appointment.lead_id ? String(appointment.lead_id) : "",
              agent: appointment.agent_id ? String(appointment.agent_id) : "",
              propertyId: appointment.property_id ? String(appointment.property_id) : "",
              projectId: appointment.project_id ? String(appointment.project_id) : "",
              notes: appointment.description ?? "",
              start: appointment.start ? new Date(appointment.start) : new Date(),
              end: appointment.end ? new Date(appointment.end) : null,
            });
          } else {
            toast({
              title: "❌ Erro",
              description: "Agendamento não encontrado.",
              variant: "destructive",
            });
            navigate("/calendar");
          }
        } else if (location.state) {
          // Garante que client pode vir como client, clientId ou leadId
          let clientId = '';
          if (location.state.client) clientId = String(location.state.client);
          else if (location.state.clientId) clientId = String(location.state.clientId);
          else if (location.state.leadId) clientId = String(location.state.leadId);
          setFormData((prev) => ({
            ...prev,
            propertyId: location.state.propertyId ? String(location.state.propertyId) : "",
            projectId: location.state.projectId ? String(location.state.projectId) : "",
            title:
              typeof location.state.title === 'string' && location.state.title.trim() !== ''
                ? String(location.state.title)
                : location.state.propertyTitle
                ? `Visita: ${location.state.propertyTitle}`
                : prev.title,
            type: location.state.type ? String(location.state.type) : prev.type,
            agent: String(user.id),
            client: clientId || prev.client,
            notes:
              typeof location.state.notes === 'string' && location.state.notes.trim() !== ''
                ? String(location.state.notes)
                : prev.notes,
          }));
        } else {
          setFormData((prev) => ({ ...prev, agent: String(user.id) }));
        }
        setLoading(false);
      } catch (e) {
        setLoading(false);
        console.error("Erro no carregamento do formulário:", e);
      }
    })();
  }, [id, isEditing, navigate, toast, location.state, user]);

  // Se ainda está carregando, mostra um loading simples
  if (loading) {
    return <div className="text-white p-8 text-center">Carregando formulário...</div>;
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      // quando o usuário altera a data/hora de início, auto-preencher o fim com +1h
      if (field === "start") {
        let newStart = value;
        if (!(newStart instanceof Date)) newStart = new Date(newStart);
        // calc end only when empty or end is before/equal the new start
        let currentEnd = prev.end;
        let newEnd = currentEnd;
        try {
          if (!currentEnd) {
            newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
          } else {
            const endDate =
              currentEnd instanceof Date ? currentEnd : new Date(currentEnd);
            if (
              isNaN(endDate.getTime()) ||
              endDate.getTime() <= newStart.getTime()
            ) {
              newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
            } else {
              newEnd = endDate;
            }
          }
        } catch (e) {
          // fallback: set end to +1h
          newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        }
        return { ...prev, start: newStart, end: newEnd };
      }
      return { ...prev, [field]: value };
    });
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // helper: format Date -> 'YYYY-MM-DD HH:MM:SS' in local timezone
    const formatLocalMySQL = (d) => {
      if (!d) return null;
      const date = d instanceof Date ? d : new Date(d);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const mi = String(date.getMinutes()).padStart(2, "0");
      const ss = String(date.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    };


    // Geração automática do título e descrição independente do state
    let autoFormData = { ...formData };
    if (!isEditing) {
      autoFormData.status = "Pendente";
    }
    // Geração automática para E-mail
    if (autoFormData.type === "E-mail") {
      autoFormData.title = "Enviar e-mail de Lista de imóveis";
      // Buscar nome do lead e do imóvel, se houver
      let leadName = "";
      let propertyName = "";
      if (autoFormData.client && leads && Array.isArray(leads)) {
        const leadObj = leads.find(l => String(l.id) === String(autoFormData.client));
        if (leadObj) leadName = leadObj.name || leadObj.nome || "";
      }
      if (autoFormData.propertyId && properties && Array.isArray(properties)) {
        const propObj = properties.find(p => String(p.id) === String(autoFormData.propertyId));
        if (propObj) propertyName = propObj.title || propObj.nome || propObj.name || "";
      }
      let obs = "";
      if (leadName && propertyName) {
        obs = `Enviar e-mail para o lead ${leadName} sobre o imóvel ${propertyName}.`;
      } else if (leadName) {
        obs = `Enviar e-mail para o lead ${leadName}.`;
      } else {
        obs = "Enviar e-mail de Lista de imóveis.";
      }
      autoFormData.notes = obs;
    }
    // Geração automática para Visita
    if (autoFormData.type === "Visita") {
      let leadName = "";
      let propertyName = "";
      if (autoFormData.client && leads && Array.isArray(leads)) {
        const leadObj = leads.find(l => String(l.id) === String(autoFormData.client));
        if (leadObj) leadName = leadObj.name || leadObj.nome || "";
      }
      if (autoFormData.propertyId && properties && Array.isArray(properties)) {
        const propObj = properties.find(p => String(p.id) === String(autoFormData.propertyId));
        if (propObj) propertyName = propObj.title || propObj.nome || propObj.name || "";
      }
      autoFormData.title = propertyName ? `Visita: ${propertyName}` : "Visita agendada";
      autoFormData.notes = leadName && propertyName ? `Visita para o lead ${leadName} no imóvel ${propertyName}.` : "Visita agendada.";
    }

    // Só envia property_id se for válido (não vazio, não undefined, não null, e existir na lista de propriedades)
    let propertyIdToSend = autoFormData.propertyId;
    if (!propertyIdToSend || propertyIdToSend === 'none') propertyIdToSend = null;
    else if (Array.isArray(properties) && properties.length > 0) {
      const found = properties.find(p => String(p.value) === String(propertyIdToSend));
      if (!found) propertyIdToSend = null;
    }

    const submissionData = {
      ...autoFormData,
      id: autoFormData.id ?? (isEditing ? id : undefined),
      start: formatLocalMySQL(autoFormData.start),
      end: autoFormData.end
        ? formatLocalMySQL(autoFormData.end)
        : formatLocalMySQL(
            new Date(
              (autoFormData.start instanceof Date
                ? autoFormData.start
                : new Date(autoFormData.start)
              ).getTime() +
                60 * 60 * 1000
            )
          ),
      lead_id: autoFormData.client || null,
      agent_id: autoFormData.agent || (user?.id ?? null),
      project_id: autoFormData.projectId || null,
      description: autoFormData.notes || null,
      status: autoFormData.status || null,
    };
    // Remove property_id do payload se for null
    if (propertyIdToSend !== null) {
      submissionData.property_id = propertyIdToSend;
    }

    // debug: show payload in console to inspect id and status
    console.debug("🔁 Appointment submission payload", submissionData);

    try {
      // validação: end deve ser pelo menos 15 minutos após start
      const startDate =
        formData.start instanceof Date
          ? formData.start
          : new Date(formData.start);
      const endDate = formData.end
        ? formData.end instanceof Date
          ? formData.end
          : new Date(formData.end)
        : null;
      const minDiff = 15 * 60 * 1000; // 15 minutos
      if (
        !endDate ||
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime()) ||
        endDate.getTime() - startDate.getTime() < minDiff
      ) {
        const msg =
          "A data/hora de término deve ser pelo menos 15 minutos após o início.";
        setErrors({ end: msg });
        toast({
          title: "❌ Erro de Validação",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      await appointmentService.saveAppointment(submissionData);

      // Atualizar imóvel do lead se necessário
      if (submissionData.lead_id && submissionData.property_id) {
        try {
          const lead = await leadService.getLeadById(submissionData.lead_id);
          if (lead && (!lead.propertie_id || lead.propertie_id === null || lead.propertie_id === "")) {
            await leadService.saveLead({
              ...lead,
              propertie_id: submissionData.property_id,
            });
          }
        } catch (e) {
          console.error("Erro ao atualizar imóvel do lead:", e);
        }
      }

      toast({
        title: isEditing
          ? "✅ Agendamento Atualizado"
          : "✅ Agendamento Criado",
        description: `O agendamento "${formData.title}" foi salvo com sucesso!`,
      });
      navigate("/calendar");
    } catch (err) {
      const msg = err?.message || String(err);
      if (
        err?.name === "ValidationError" ||
        /título|início|término|Data\/hora/.test(msg)
      ) {
        const newErrors = {};
        if (/título/i.test(msg)) newErrors.title = msg;
        if (/início/i.test(msg)) newErrors.start = msg;
        if (/término/i.test(msg)) newErrors.end = msg;
        setErrors(newErrors);
        toast({
          title: "❌ Erro de Validação",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "❌ Erro ao salvar",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/calendar")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
          </h1>
          <p className="text-slate-400">
            {isEditing
              ? "Atualize os detalhes do compromisso"
              : "Crie um novo compromisso na agenda"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Detalhes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Detalhes do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">
                  Título *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ex: Visita ao Apartamento no Centro"
                  className="bg-slate-800 border-slate-600"
                  required
                />
                {errors.title && (
                  <p className="text-sm text-red-400 mt-1">{errors.title}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-slate-300">
                    Tipo
                  </Label>
                  <Select
                    value={formData.type || "none"}
                    onValueChange={(value) =>
                      handleInputChange("type", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {[
                        "Ligar",
                        "Email",
                        "Reunião",
                        "Tarefa",
                        "Mensagem",
                        "Visita",
                      ].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-300">
                    Status
                  </Label>
                  <Select
                    value={formData.status || "none"}
                    onValueChange={(value) =>
                      handleInputChange("status", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Pendente",
                        "Confirmado",
                        "Cancelado",
                        "Concluído",
                        "Não Realizado",
                      ].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data e Hora */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Data e Hora
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CompactDateTimePicker
                id="start"
                value={formData.start}
                onChange={(date) => handleInputChange("start", date)}
                placeholder="Início"
                minuteStep={15}
                required
              />
              <CompactDateTimePicker
                id="end"
                value={formData.end}
                onChange={(date) => handleInputChange("end", date)}
                placeholder="Fim"
                minuteStep={15}
              />
              {errors.start && (
                <p className="text-sm text-red-400 mt-1">{errors.start}</p>
              )}
              {errors.end && (
                <p className="text-sm text-red-400 mt-1">{errors.end}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Participantes e Imóvel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="w-5 h-5 mr-2" />
                Participantes e Imóvel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client" className="text-slate-300">
                    Cliente (Lead)
                  </Label>
                  <Select
                    value={formData.client || "none"}
                    onValueChange={(value) =>
                      handleInputChange("client", value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.value} value={String(l.value)}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent" className="text-slate-300">
                    Agente Responsável
                  </Label>
                  <Select
                    value={formData.agent || "none"}
                    onValueChange={(value) =>
                      handleInputChange("agent", value === "none" ? "" : value)
                    }
                    disabled={user.role !== "admin"}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.value} value={String(a.value)}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyId" className="text-slate-300">
                  Imóvel Relacionado
                </Label>
                <Select
                  value={formData.propertyId || "none"}
                  onValueChange={(value) =>
                    handleInputChange(
                      "propertyId",
                      value === "none" ? "" : value
                    )
                  }
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Selecione um imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.value} value={String(p.value)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Observações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Adicione notas..."
                className="bg-slate-800 border-slate-600 min-h-[100px]"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Botões */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex space-x-4"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/calendar")}
            className="border-slate-600 hover:bg-slate-700/50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 flex-1"
          >
            {isEditing ? "Atualizar Agendamento" : "Salvar Agendamento"}
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default AppointmentForm;
