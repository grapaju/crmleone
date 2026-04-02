import React from 'react';
import { Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const TopPerformers = ({ agents }) => {
    const topAgents = agents
        .filter(a => a.status === 'Ativo')
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 3);

    return (
        <Card className="glass-effect border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-500" />
                    Top Performers do Mês
                </CardTitle>
                <CardDescription>Agentes com mais vendas no período.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {topAgents.map((agent, index) => (
                        <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">{index + 1}</div>
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-600">
                                    <img src={agent.photo || `https://ui-avatars.com/api/?name=${agent.name}&background=random`} alt={`Foto de ${agent.name}`} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{agent.name}</p>
                                    <p className="text-sm text-slate-400">{agent.sales} vendas</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-green-400">R$ {(agent.revenue / 1000).toFixed(0)}K</p>
                                <div className="flex items-center justify-end space-x-1">
                                    <Award className="w-3 h-3 text-yellow-500" />
                                    <span className="text-xs text-slate-400">{agent.rating}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default TopPerformers;