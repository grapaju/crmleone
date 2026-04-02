import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Building2, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AgentStats = ({ agents }) => {
    const totalAgents = agents.length;
    const activeAgents = agents.filter(agent => agent.status === 'Ativo').length;
    const totalSales = agents.reduce((sum, agent) => sum + (Number(agent.sales) || 0), 0);
const totalRevenue = agents.reduce((sum, agent) => sum + (Number(agent.revenue) || 0), 0);

    const stats = [
        { title: 'Total de Usuários', value: totalAgents, icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
        { title: 'Usuários Ativos', value: activeAgents, icon: TrendingUp, color: 'text-green-400', bgColor: 'bg-green-500/20' },
        { title: 'Total de Vendas', value: totalSales, icon: Building2, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
       { title: 'Faturamento Total', value: `R$ ${(totalRevenue / 1000000 || 0).toFixed(1)}M`, icon: DollarSign, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card className="glass-effect border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">{stat.title}</p>
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
};

export default AgentStats;