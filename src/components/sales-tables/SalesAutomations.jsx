import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Repeat,
  Calendar,
  Users,
  Trash2,
  ToggleRight,
  Plus,
  ToggleLeft,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { salesTableService } from "@/services/salesTableService";
import SalesAutomationForm from "./SalesAutomationForm";
import Dialog, {
  DialogOverlay,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { leadService } from "@/services/leadService";
import { contactService } from "@/services/contactService";

const SalesAutomations = ({ automations, onDelete, onToggle }) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [localAutos, setLocalAutos] = useState(automations || []);
  const [sendingIds, setSendingIds] = useState([]);
  const [smtpFrom, setSmtpFrom] = useState("");
  const [viewRecipientsAuto, setViewRecipientsAuto] = useState(null);

  const handleNewAutomation = () => {
    // abrir modal com formulário
    setShowForm(true);
  };

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "http://localhost/v4/api/php-api-crm/public/settings.php"
        );
        if (!res.ok) return;
        const json = await res.json();
        setSmtpFrom(json.smtp_from || json.smtp_from || "");
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const triggerSendNow = async (auto) => {
    try {
      // prevent duplicate triggers for same automation
      setSendingIds((s) => Array.from(new Set([...s, auto.id])));
      // determine tableId (backend may return table_id)
      const tableId = auto.table_id ?? auto.tableId ?? auto.tableId ?? null;
      if (!tableId) {
        toast({
          title: "Erro",
          description: "tableId não encontrado na automação.",
          variant: "destructive",
        });
        return;
      }

      // prepare payload similar to send flow
      // build recipients: prefer structured recipientsList
      let recipients = [];
      if (
        Array.isArray(auto.recipientsList) &&
        auto.recipientsList.length > 0
      ) {
        recipients = auto.recipientsList.map((r) => ({
          name: r.name || "",
          email: r.email || "",
        }));
      } else if (Array.isArray(auto.recipients) && auto.recipients.length > 0) {
        // could already be [{name,email}] or array of strings
        recipients = auto.recipients.map((r) => {
          if (typeof r === "string") return { name: r, email: r };
          return { name: r.name || "", email: r.email || "" };
        });
      } else if (auto.recipients && typeof auto.recipients === "string") {
        // comma-separated names/emails — try to resolve each name to an email using leads/contacts
        const tokens = auto.recipients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        try {
          const [allLeads, allContacts] = await Promise.all([
            leadService.getLeads(),
            contactService.getContacts(),
          ]);
          recipients = tokens.map((t) => {
            // if token already looks like an email, use it
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              String(t).toLowerCase()
            );
            if (isEmail) return { name: t, email: t };
            const l = (allLeads || []).find(
              (x) => x.name === t || x.email === t
            );
            if (l) return { name: l.name || t, email: l.email || "" };
            const c = (allContacts || []).find(
              (x) => x.name === t || x.email === t
            );
            if (c) return { name: c.name || t, email: c.email || "" };
            return { name: t, email: "" };
          });
        } catch (e) {
          // fallback: keep tokens as-is (name and email fields equal)
          recipients = tokens.map((s) => ({ name: s, email: s }));
        }
      } else {
        // fallback: try fetching leads/contacts to find recipients for this automation by names
        try {
          const [allLeads, allContacts] = await Promise.all([
            leadService.getLeads(),
            contactService.getContacts(),
          ]);
          const names = (auto.recipients || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          recipients = names.map((n) => {
            const l = (allLeads || []).find(
              (x) => x.name === n || x.email === n
            );
            if (l) return { name: l.name, email: l.email };
            const c = (allContacts || []).find(
              (x) => x.name === n || x.email === n
            );
            if (c) return { name: c.name, email: c.email };
            return { name: n, email: "" };
          });
        } catch (e) {
          recipients = [];
        }
      }

      // validate recipients have emails
      const validateEmail = (email) => {
        if (!email) return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
      };

      const invalid = recipients.filter(
        (r) => !r.email || !validateEmail(r.email)
      );
      if (invalid.length > 0) {
        // cleanup sending flag and inform user
        setSendingIds((s) => s.filter((id) => id !== auto.id));
        toast({
          title: "Destinatários inválidos",
          description: `Existem destinatários sem e-mail válido: ${invalid
            .map((i) => i.name || i.email)
            .join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      const payload = {
        tableId: tableId,
        channel: "email",
        recipients,
        type: "automation",
      };
      if (smtpFrom) payload.smtp_from = smtpFrom;
      const res = await fetch(
        "http://localhost/v4/api/php-api-crm/public/send_sales_table.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Erro ao enviar");

      // the backend already persists a history entry; use response to inform user
      // do not update localAutos here (prevents UI flicker/disappearance)
      // backend already persisted history; the parent page will refresh automations as needed
      const sentCount = Array.isArray(json.statuses)
        ? json.statuses.filter((s) => s.status === "sent").length
        : json.sent || 0;
      const failedCount = Array.isArray(json.failed)
        ? json.failed.length
        : json.failed
        ? json.failed.length
        : 0;
      toast({
        title: "Envio concluído",
        description: `Enviados: ${sentCount}, Falhas: ${failedCount}`,
      });
    } catch (err) {
      console.error("Erro enviando agora:", err);
      toast({
        title: "Erro",
        description: err.message || "Falha ao enviar agora.",
        variant: "destructive",
      });
    } finally {
      // remove sending flag
      setSendingIds((s) => s.filter((id) => id !== auto.id));
    }
  };

  if (automations.length === 0) {
    return (
      <div className="text-center py-16">
        <Repeat className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-white">
          Nenhuma Automação Configurada
        </h3>
        <p className="text-slate-400 mb-4">
          Crie automações para enviar tabelas mensalmente.
        </p>
        <Button
          onClick={handleNewAutomation}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Criar Automação
        </Button>
        {showForm && (
          <div className="fixed inset-0 z-[9999] flex">
            {/* overlay */}
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
            {/* drawer */}
            <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 h-screen w-full max-w-[920px] bg-slate-900/95 p-6 shadow-xl overflow-hidden"
              >
              <button onClick={() => setShowForm(false)} aria-label="Fechar" className="absolute right-4 top-4 text-slate-400 hover:text-white">×</button>
                <div className="h-full flex flex-col">
                  <SalesAutomationForm
                onClose={() => setShowForm(false)}
                onCreated={async () => {
                  setShowForm(false);
                  // recarregar automations do backend
                  try {
                    const refreshed = await salesTableService.getAutomations();
                    setLocalAutos(Array.isArray(refreshed) ? refreshed : []);
                  } catch (e) {
                    console.error("Erro ao recarregar automações", e);
                  }
                }}
              />
                </div>
            </motion.aside>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleNewAutomation}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Criar Automação
        </Button>
      </div>
      {(localAutos.length ? localAutos : automations).map((auto) => (
        <motion.div
          key={auto.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex justify-between items-center"
        >
          <div>
            <p className="font-semibold text-white">{auto.tableName}</p>
            <div className="flex items-center text-sm text-slate-400 mt-1">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Envia todo dia {auto.dayOfMonth}</span>
            </div>
            <div className="flex items-center text-sm text-slate-400 mt-1">
              <Users className="w-4 h-4 mr-2" />
              <span>Para: {auto.recipients}</span>
            </div>
            <div className="flex items-center text-sm text-slate-400 mt-1">
              <Send className="w-4 h-4 mr-2" />
              <div>
                <div>Assunto: {auto.title || auto.subject || auto.assunto || '—'}</div>
                {auto.message ? (
                  <div className="text-xs text-slate-500 truncate max-w-sm">{String(auto.message).slice(0, 140)}</div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {sendingIds.includes(auto.id) && (
              <Badge className="bg-yellow-500/20 text-yellow-400">
                Enviando...
              </Badge>
            )}
            <Badge
              className={
                auto.status === "Ativa"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-slate-500/20 text-slate-400"
              }
            >
              {auto.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => onToggle(auto.id)}
            >
              {auto.status === "Ativa" ? (
                <ToggleRight className="w-5 h-5 text-green-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => triggerSendNow(auto)}
              disabled={sendingIds.includes(auto.id)}
            >
              {sendingIds.includes(auto.id) ? (
                <span className="text-yellow-400">...</span>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => setViewRecipientsAuto(auto)}
            >
              <Users className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:text-white"
              onClick={() => onDelete(auto.id)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      ))}
      {viewRecipientsAuto && (
        <Dialog
          open={!!viewRecipientsAuto}
          onOpenChange={() => setViewRecipientsAuto(null)}
        >
          <DialogOverlay onClick={() => setViewRecipientsAuto(null)} />
          <DialogContent>
            <DialogClose onClick={() => setViewRecipientsAuto(null)} />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                Destinatários
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(() => {
                  let list = [];
                  if (Array.isArray(viewRecipientsAuto.recipientsList))
                    list = viewRecipientsAuto.recipientsList;
                  else if (Array.isArray(viewRecipientsAuto.recipients))
                    list = viewRecipientsAuto.recipients;
                  else if (typeof viewRecipientsAuto.recipients === "string") {
                    try {
                      // maybe it's a JSON string
                      const parsed = JSON.parse(viewRecipientsAuto.recipients);
                      if (Array.isArray(parsed)) list = parsed;
                      else
                        list = viewRecipientsAuto.recipients
                          .split(",")
                          .map((s) => s.trim())
                          .map((s) => ({ name: s, email: s }));
                    } catch (e) {
                      list = viewRecipientsAuto.recipients
                        .split(",")
                        .map((s) => s.trim())
                        .map((s) => ({ name: s, email: s }));
                    }
                  }
                  return list.map((r, idx) => {
                    const email = typeof r === "string" ? r : r.email || "";
                    const name = typeof r === "string" ? r : r.name || email;
                    const valid =
                      email &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        String(email).toLowerCase()
                      );
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <div className="text-white">
                          {name}{" "}
                          <span className="text-slate-400">
                            {email ? `(${email})` : ""}
                          </span>
                        </div>
                        <div
                          className={`text-sm ${
                            valid ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {valid ? "OK" : "Sem e-mail válido"}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {showForm && (
        <div className="fixed inset-0 z-[9999] flex">
          {/* overlay */}
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          {/* drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-[720px] bg-slate-900/95 p-6 shadow-xl overflow-auto"
          >
            <button onClick={() => setShowForm(false)} aria-label="Fechar" className="absolute right-4 top-4 text-slate-400 hover:text-white">×</button>
            <SalesAutomationForm
              onClose={() => setShowForm(false)}
              onCreated={async () => {
                setShowForm(false);
                try {
                  const refreshed = await salesTableService.getAutomations();
                  setLocalAutos(Array.isArray(refreshed) ? refreshed : []);
                } catch (e) {
                  console.error("Erro ao recarregar automações", e);
                }
              }}
            />
          </motion.aside>
        </div>
      )}
    </div>
  );
};

export default SalesAutomations;
