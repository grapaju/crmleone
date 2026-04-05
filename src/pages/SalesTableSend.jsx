import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Send,
  ArrowLeft,
  Users,
  Contact,
  Mail,
  MessageCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { salesTableService } from "@/services/salesTableService";
import { leadService } from "@/services/leadService";
import { contactService } from "@/services/contactService";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const SalesTableSend = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [table, setTable] = useState(null);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [channel, setChannel] = useState("email");
  const [recipientStatuses, setRecipientStatuses] = useState([]); // {email,name,status,reason}
  const [attachmentsReport, setAttachmentsReport] = useState({ included: [], missing: [] });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, l, c] = await Promise.all([
          salesTableService.getTableById(id),
          leadService.getLeads(),
          contactService.getContacts(),
        ]);
        if (!mounted) return;
        setTable(t ?? null);
        setLeads(Array.isArray(l) ? l : []);
        setContacts(Array.isArray(c) ? c : []);
      } catch (err) {
        console.error("Erro carregando dados em SalesTableSend:", err);
        if (!mounted) return;
        setTable(null);
        setLeads([]);
        setContacts([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSelect = (type, id) => {
    const list = type === "lead" ? selectedLeads : selectedContacts;
    const setter = type === "lead" ? setSelectedLeads : setSelectedContacts;
    if (list.includes(id)) {
      setter(list.filter((item) => item !== id));
    } else {
      setter([...list, id]);
    }
  };

  const handleSelectAll = (type) => {
    const sourceList = type === "lead" ? leads : contacts;
    const selectedList = type === "lead" ? selectedLeads : selectedContacts;
    const setter = type === "lead" ? setSelectedLeads : setSelectedContacts;

    if (selectedList.length === sourceList.length) {
      setter([]);
    } else {
      setter(sourceList.map((item) => item.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedLeads.length === 0 && selectedContacts.length === 0) {
      toast({
        title: "❌ Nenhum Destinatário",
        description: "Selecione ao menos um lead ou contato para enviar.",
        variant: "destructive",
      });
      return;
    }

    const recipients = [
      ...selectedLeads.map((leadId) => leads.find((l) => l.id === leadId)),
      ...selectedContacts.map((contactId) =>
        contacts.find((c) => c.id === contactId)
      ),
    ];

    const payload = {
      tableId: table.id,
      channel,
  recipients: recipients.map((r) => ({ name: r.name, email: r.email })),
  type: 'manual',
    };

    const validateEmail = (email) => {
      // simple RFC-ish regex
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    };

    const doSend = async () => {
      try {
        if (channel === "email") {
          // validate emails before sending
          const invalid = recipients.filter(
            (r) => !r || !r.email || !validateEmail(r.email)
          );
          if (invalid.length > 0) {
            toast({
              title: "Emails inválidos",
              description: "Corrija os emails inválidos antes de enviar.",
              variant: "destructive",
            });
            return;
          }

          // initialize statuses to pending
          const initialStatuses = recipients.map((r) => ({
            email: r.email,
            name: r.name,
            status: "pending",
          }));
          setRecipientStatuses(initialStatuses);

          const res = await fetch(
            "/api/send_sales_table.php",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          let json = null;
          try {
            json = await res.json();
          } catch (parseErr) {
            const txt = await res.text();
            throw new Error(
              `Resposta inválida do servidor: ${txt || parseErr.message}`
            );
          }
          if (!res.ok)
            throw new Error(
              json?.message || `Erro ao enviar (status ${res.status})`
            );

          // Merge statuses returned by API
          if (Array.isArray(json.statuses)) {
            const merged = initialStatuses.map((s) => {
              const r = json.statuses.find((x) => x.recipient === s.email);
              return r ? { ...s, status: r.status, reason: r.reason } : s;
            });
            setRecipientStatuses(merged);
          }

          // attachments report
          setAttachmentsReport({
            included: Array.isArray(json.attachments_included)
              ? json.attachments_included
              : [],
            missing: Array.isArray(json.attachments_missing)
              ? json.attachments_missing
              : [],
          });

          salesTableService.addHistoryEntry({
            tableId: table.id,
            tableName: table.name,
            channel,
            recipients: recipients.map((r) => r.name),
            type: 'manual',
            status: "Enviado",
            date: new Date().toISOString(),
          });

          toast({
            title: "🚀 Tabela Enviada!",
            description: `Enviada para ${recipients.length} destinatário(s).`,
          });
          // keep on page to show statuses instead of navigating away immediately
        } else {
          toast({
            title: "Canal não suportado",
            description: "Somente e-mail implementado por enquanto.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Erro enviando tabela:", err);
        // Detect network-level failures and try a quick diagnostic GET
        const isNetworkError =
          err instanceof TypeError && /network/i.test(err.message);
        if (isNetworkError) {
          try {
            const ping = await fetch(
              "/api/send_sales_table.php",
              { method: "GET" }
            );
            if (ping.ok) {
              const txt = await ping.text().catch(() => "");
              toast({
                title: "Erro de Rede",
                description:
                  "POST bloqueado — API responde ao GET. Verifique CORS/preflight, rota ou payload.",
                variant: "destructive",
              });
              console.warn("API GET ok — response:", ping.status, txt);
            } else {
              toast({
                title: "API inacessível",
                description: `GET retornou ${ping.status} — verifique Apache/URL.`,
                variant: "destructive",
              });
              console.warn("API GET falhou:", ping.status);
            }
          } catch (pingErr) {
            toast({
              title: "Erro de Rede",
              description:
                "Não foi possível acessar a API. Verifique configurações de SMTP.",
              variant: "destructive",
            });
            console.error("Ping error to API:", pingErr);
          }
        } else {
          toast({
            title: "Erro",
            description: err.message || "Falha ao enviar",
            variant: "destructive",
          });
        }
      }
    };

    doSend();
  };

  if (!table) {
    return <div>Carregando...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/sales-tables")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-white ml-2">
          Enviar Tabela: <span className="text-blue-400">{table.name}</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="mr-2" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-700">
                <Checkbox
                  id="select-all-leads"
                  onCheckedChange={() => handleSelectAll("lead")}
                  checked={
                    selectedLeads.length === leads.length && leads.length > 0
                  }
                />
                <Label htmlFor="select-all-leads" className="font-semibold">
                  Selecionar Todos
                </Label>
              </div>
              {(Array.isArray(leads) ? leads : []).map((lead) => (
                <div key={lead.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lead-${lead.id}`}
                    onCheckedChange={() => handleSelect("lead", lead.id)}
                    checked={selectedLeads.includes(lead.id)}
                  />
                  <Label htmlFor={`lead-${lead.id}`} className="flex-1">
                    {lead.name} ({lead.email})
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Contact className="mr-2" />
                Contatos
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-700">
                <Checkbox
                  id="select-all-contacts"
                  onCheckedChange={() => handleSelectAll("contact")}
                  checked={
                    selectedContacts.length === contacts.length &&
                    contacts.length > 0
                  }
                />
                <Label htmlFor="select-all-contacts" className="font-semibold">
                  Selecionar Todos
                </Label>
              </div>
              {(Array.isArray(contacts) ? contacts : []).map((contact) => (
                <div key={contact.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`contact-${contact.id}`}
                    onCheckedChange={() => handleSelect("contact", contact.id)}
                    checked={selectedContacts.includes(contact.id)}
                  />
                  <Label htmlFor={`contact-${contact.id}`} className="flex-1">
                    {contact.name} ({contact.company})
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-effect border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Canal de Envio</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              type="button"
              variant={channel === "email" ? "default" : "outline"}
              onClick={() => setChannel("email")}
              className={`flex-1 ${
                channel === "email"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "border-slate-600"
              }`}
            >
              <Mail className="mr-2" /> E-mail
            </Button>
            <Button
              type="button"
              variant={channel === "whatsapp" ? "default" : "outline"}
              onClick={() => setChannel("whatsapp")}
              className={`flex-1 ${
                channel === "whatsapp"
                  ? "bg-green-600 hover:bg-green-700"
                  : "border-slate-600"
              }`}
            >
              <MessageCircle className="mr-2" /> WhatsApp
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="mr-2 h-4 w-4" /> Enviar para{" "}
            {selectedLeads.length + selectedContacts.length} destinatários
          </Button>
        </div>
        {/* Recipient status list */}
        {recipientStatuses.length > 0 && (
          <Card className="mt-6 glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Status de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipientStatuses.map((r) => (
                  <li
                    key={r.email}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-white">
                        {r.name || r.email}
                      </span>
                      <div className="text-sm text-slate-400">{r.email}</div>
                    </div>
                    <div className="text-right">
                      {r.status === "pending" && (
                        <span className="text-yellow-400">Pendente</span>
                      )}
                      {r.status === "sent" && (
                        <span className="text-green-400">Enviado</span>
                      )}
                      {r.status === "failed" && (
                        <span className="text-red-400">Falhou</span>
                      )}
                      {r.reason && (
                        <div className="text-xs text-slate-400">{r.reason}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {/* Attachments report */}
        {attachmentsReport && (attachmentsReport.included.length > 0 || attachmentsReport.missing.length > 0) && (
          <Card className="mt-6 glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Relatório de Anexos</CardTitle>
            </CardHeader>
            <CardContent>
              {attachmentsReport.included.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Anexos incluídos</h3>
                  <ul className="text-slate-300 list-disc list-inside">
                    {attachmentsReport.included.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {attachmentsReport.missing.length > 0 && (
                <div>
                  <h3 className="font-semibold text-white">Anexos faltantes</h3>
                  <ul className="text-slate-300 list-disc list-inside">
                    {attachmentsReport.missing.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </motion.div>
  );
};

export default SalesTableSend;
