import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { salesTableService } from "@/services/salesTableService";
import { leadService } from "@/services/leadService";
import { contactService } from "@/services/contactService";
import { Checkbox } from "@/components/ui/checkbox";

const SalesAutomationForm = ({ onClose, onCreated }) => {
  const { toast } = useToast();
  const [tables, setTables] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tableId, setTableId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [sendTime, setSendTime] = useState("09:00");
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [status, setStatus] = useState("Ativa");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [resLeads, resContacts, resTables] = await Promise.all([
          leadService.getLeads(),
          contactService.getContacts(),
          salesTableService.getTables(),
        ]);
        setLeads(Array.isArray(resLeads) ? resLeads : []);
        setContacts(Array.isArray(resContacts) ? resContacts : []);
        setTables(Array.isArray(resTables) ? resTables : []);
        if (Array.isArray(resTables) && resTables.length > 0)
          setTableId(String(resTables[0].id));
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    };
    load();
  }, []);

  const toggleSelectAll = (items, selected, setSelected) => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((i) => i.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tableId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione uma tabela.",
      });
      return;
    }

    if (selectedLeads.length === 0 && selectedContacts.length === 0) {
      toast({
        title: "Nenhum destinatário",
        description: "Selecione ao menos um lead ou contato.",
      });
      return;
    }

    const recipientsArr = [
      ...selectedLeads.map((id) => leads.find((l) => l.id === id)),
      ...selectedContacts.map((id) => contacts.find((c) => c.id === id)),
    ].filter(Boolean);

    const payload = {
      tableId: Number(tableId),
      dayOfMonth: Number(dayOfMonth),
      sendTime,
      title: subject,
      message,
      recipients: recipientsArr.map((r) => r.name).join(", "),
      recipientsList: recipientsArr.map((r) => ({
        name: r.name,
        email: r.email,
      })),
      status,
    };

    try {
      setLoading(true);
      const created = await salesTableService.createAutomation(payload);
      toast({
        title: "✅ Automação criada",
        description: "A automação foi criada com sucesso.",
      });
  if (onCreated) onCreated(created);
  // dispatch a global event so any listener can refresh automations
  try { window.dispatchEvent(new CustomEvent('automations:created', { detail: created })); } catch (e) { /* ignore in non-browser env */ }
      if (onClose) onClose();
    } catch (err) {
      console.error("Erro ao criar automação", err);
      toast({
        title: "Erro",
        description: "Não foi possível criar a automação.",
      });
    } finally {
      setLoading(false);
    }
  };

  // wrapper to call submit from top action button
  const submitFromTop = async () => {
    // create a fake event with preventDefault
    await handleSubmit({ preventDefault: () => {} });
  };

  return (
    <Card className="glass-effect border-slate-700 mt-4 h-full">
      <CardContent className="p-3 flex-1 overflow-auto relative">
        {/* top action bar to ensure Save is always accessible */}
        <div className="sticky top-0 z-20 bg-slate-900/95 py-2 -mx-3 px-3 mb-2 backdrop-blur-sm border-b border-slate-800">
          <div className="flex justify-end items-center space-x-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={submitFromTop}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar Automação"}
            </Button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <Label>Tabela</Label>
            <Select value={tableId} onValueChange={(v) => setTableId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a tabela" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assunto (title)</Label>
            <div className="mt-2">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Tabela de Vendas - Setembro"
              />
            </div>
          </div>

          <div>
            <Label>Mensagem (body)</Label>
            <div className="mt-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Corpo do e-mail enviado na automação"
                className="w-full min-h-[60px] p-2 rounded bg-slate-900 border border-slate-700 text-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <Label>Configuração</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label>Dia do mês</Label>
                <div className="mt-2">
                  <Select
                    value={dayOfMonth}
                    onValueChange={(v) => setDayOfMonth(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Horário de envio</Label>
                <div className="mt-2">
                  <Input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Destinatários</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-36 overflow-y-auto space-y-2 text-sm">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-700">
                      <Checkbox
                        id="select-all-leads-auto"
                        onCheckedChange={() =>
                          toggleSelectAll(
                            leads,
                            selectedLeads,
                            setSelectedLeads
                          )
                        }
                        checked={
                          selectedLeads.length === leads.length &&
                          leads.length > 0
                        }
                      />
                      <Label
                        htmlFor="select-all-leads-auto"
                        className="font-semibold"
                      >
                        Selecionar Todos
                      </Label>
                    </div>
                    {(leads || []).map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`lead-auto-${lead.id}`}
                          onCheckedChange={() => {
                            if (selectedLeads.includes(lead.id))
                              setSelectedLeads(
                                selectedLeads.filter((id) => id !== lead.id)
                              );
                            else setSelectedLeads([...selectedLeads, lead.id]);
                          }}
                          checked={selectedLeads.includes(lead.id)}
                        />
                        <Label
                          htmlFor={`lead-auto-${lead.id}`}
                          className="flex-1"
                        >
                          {lead.name} ({lead.email})
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      Contatos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-36 overflow-y-auto space-y-2 text-sm">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-700">
                      <Checkbox
                        id="select-all-contacts-auto"
                        onCheckedChange={() =>
                          toggleSelectAll(
                            contacts,
                            selectedContacts,
                            setSelectedContacts
                          )
                        }
                        checked={
                          selectedContacts.length === contacts.length &&
                          contacts.length > 0
                        }
                      />
                      <Label
                        htmlFor="select-all-contacts-auto"
                        className="font-semibold"
                      >
                        Selecionar Todos
                      </Label>
                    </div>
                    {(contacts || []).map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`contact-auto-${contact.id}`}
                          onCheckedChange={() => {
                            if (selectedContacts.includes(contact.id))
                              setSelectedContacts(
                                selectedContacts.filter(
                                  (id) => id !== contact.id
                                )
                              );
                            else
                              setSelectedContacts([
                                ...selectedContacts,
                                contact.id,
                              ]);
                          }}
                          checked={selectedContacts.includes(contact.id)}
                        />
                        <Label
                          htmlFor={`contact-auto-${contact.id}`}
                          className="flex-1"
                        >
                          {contact.name} ({contact.company || contact.email})
                        </Label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <div className="flex items-center space-x-3 mt-2">
              <Button
                variant={status === "Ativa" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatus("Ativa")}
              >
                Ativa
              </Button>
              <Button
                variant={status === "Inativa" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatus("Inativa")}
              >
                Inativa
              </Button>
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 to-transparent pt-3 flex justify-end space-x-2">
            <div className="backdrop-blur-sm px-2 py-1 rounded">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 ml-2"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar Automação"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SalesAutomationForm;
