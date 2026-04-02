import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { leadService } from "@/services/leadService";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const STORAGE_KEY = 'crm_persist_notifications_v1';

  // Carrega persistidos
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNotifications(parsed);
      }
    } catch(e){ console.warn('[NOTIFICATIONS] Falha ao carregar persistidos', e); }
  },[]);

  // Persiste em cada alteração
  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0,500))); } catch(e) { /* ignore */ }
  },[notifications]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Simples stub de service (futuro: substituir por endpoint /notifications.php)
  const remotePersist = async (n) => {
    // Detecta se existe endpoint configurado (opcional)
    const endpoint = import.meta?.env?.VITE_NOTIFICATIONS_API || null;
    if (!endpoint) return; // sem endpoint configurado
    try {
      await fetch(endpoint, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(n) });
    } catch(e) { console.warn('[NOTIFICATIONS] Falha persist remota', e); }
  };

  const addNotification = useCallback((notification) => {
    const base = { id: Date.now(), read:false, createdAt: new Date().toISOString() };
    setNotifications(prev => {
      const newList = [ { ...base, ...notification }, ...prev ];
      return newList;
    });
    // Toast condicional
    try {
      if (user?.role === 'admin' || user?.name === notification.agentName) {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Bell className={`w-5 h-5 ${notification.type === 'hot' ? 'text-red-500' : 'text-yellow-500'}`} />
              {notification.title}
            </div>
          ),
          description: notification.description,
        });
      }
    } catch {}
    remotePersist({ ...base, ...notification });
  },[toast, user]);

  useEffect(() => {
    const checkLeadsForNotifications = async () => {
      try {
        const allLeads = await leadService.getLeads(); // async
        if (!Array.isArray(allLeads)) return;

        allLeads.forEach((lead) => {
          const oldLeadData = leadService.getLeadFromHistory(lead.id);
          if (oldLeadData && oldLeadData.score < 80 && lead.score >= 80) {
            addNotification({
              type: "hot",
              title: "🔥 Lead Quente!",
              description: `O lead ${lead.name} atingiu a pontuação de ${lead.score} e agora é considerado quente.`,
              agentName: lead.agent,
              link: `/leads/edit/${lead.id}`,
            });
          }
          leadService.updateLeadHistory(lead);
        });
      } catch (err) {
        console.error("Erro ao checar leads para notificações:", err);
      }
    };

    const interval = setInterval(checkLeadsForNotifications, 15000); // a cada 15s
    return () => clearInterval(interval);
  }, [addNotification]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const value = { notifications, addNotification, markAsRead };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
