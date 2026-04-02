import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { leadService } from '@/services/leadService';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const { toast } = useToast();
    const { user } = useAuth();

    const addNotification = useCallback((notification) => {
        setNotifications(prev => {
            const newNotifications = [{ ...notification, id: Date.now(), read: false }, ...prev];
            if(user?.role === 'admin' || (user?.name === notification.agentName)){
                toast({
                    title: (
                        <div className="flex items-center">
                            <Bell className={`w-5 h-5 mr-2 ${notification.type === 'hot' ? 'text-red-500' : 'text-yellow-500'}`} />
                            {notification.title}
                        </div>
                    ),
                    description: notification.description,
                });
            }
            return newNotifications;
        });
    }, [toast, user]);


    useEffect(() => {
        const checkLeadsForNotifications = async () => {
            if(!user) return;
            try {
                let allLeads = await leadService.getLeadsWithScore();
                if (!Array.isArray(allLeads)) allLeads = [];

                allLeads.forEach(lead => {
                    // A notificação só é gerada se o lead pertencer ao agente logado ou se o usuário for admin
                    if(user.role === 'admin' || lead.agent === user.name) {
                        const oldLeadData = leadService.getLeadFromHistory(lead.id);
                        if (oldLeadData && oldLeadData.score < 80 && lead.score >= 80) {
                            addNotification({
                                type: 'hot',
                                title: '🔥 Lead Quente!',
                                description: `O lead ${lead.name} atingiu a pontuação de ${lead.score} e agora é considerado quente.`,
                                agentName: lead.agent,
                                link: `/leads/edit/${lead.id}`
                            });
                        }
                        try { leadService.updateLeadHistory(lead); } catch {};
                    }
                });
            } catch (err) {
                console.warn('Erro ao checar leads para notificações:', err);
            }
        };
        
        const interval = setInterval(() => { checkLeadsForNotifications(); }, 15000);
        // Run immediately once
        checkLeadsForNotifications();
        return () => clearInterval(interval);
    }, [addNotification, user]);


    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const value = { notifications, addNotification, markAsRead };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = function useNotification() {
    return useContext(NotificationContext);
};