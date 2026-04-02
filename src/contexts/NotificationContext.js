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
            if (user?.role === 'admin' || (user?.name === notification.agentName)) {
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
            const allLeads = await leadService.getLeads();
            if (Array.isArray(allLeads)) {
                allLeads.forEach(lead => {
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
                    leadService.updateLeadHistory(lead);
                });
            }
        };

        const interval = setInterval(checkLeadsForNotifications, 15000);
        return () => clearInterval(interval);
    }, [addNotification]);

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
