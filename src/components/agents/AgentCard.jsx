import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Phone, Mail, Award, Edit, Trash2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const AgentCard = ({ agent, onDelete }) => {
    const { toast } = useToast();

    const getStatusColor = (status) => {
        return status === 'Ativo' 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-red-500/20 text-red-400';
    };

    const getRoleColor = (role) => {
        return role === 'admin'
          ? 'bg-purple-500/20 text-purple-400'
          : 'bg-slate-600 text-slate-300';
    }

    const handleContact = (type) => {
        toast({
            title: `📞 Contatar ${agent.name}`,
            description: "🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
        });
    };

    return (
        <motion.div whileHover={{ y: -4 }} className="group">
            <Card className="glass-effect border-slate-700 overflow-hidden card-hover h-full">
                <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex-grow space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700">
                                    <img src={agent.photo || `https://ui-avatars.com/api/?name=${agent.name}&background=random`} alt={`Foto de ${agent.name}`} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                                    <p className="text-sm text-slate-400">{agent.document}</p>
                                </div>
                            </div>
                            <Badge className={getStatusColor(agent.status)}>{agent.status}</Badge>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center text-slate-300 text-sm"><Mail className="w-4 h-4 mr-2 text-slate-400" />{agent.email}</div>
                            <div className="flex items-center text-slate-300 text-sm"><Phone className="w-4 h-4 mr-2 text-slate-400" />{agent.phone}</div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <Badge className={getRoleColor(agent.role)}><Shield className="w-3 h-3 mr-1" />{agent.role}</Badge>
                           
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                            <div className="text-center"><p className="text-lg font-bold text-white">{agent.sales}</p><p className="text-xs text-slate-400">Vendas</p></div>
                            <div className="text-center"><p className="text-lg font-bold text-green-400">R$ {(Number(agent.revenue) / 1000 || 0).toFixed(0)}K</p><p className="text-xs text-slate-400">Faturamento</p></div>
                            <div className="text-center"><p className="text-lg font-bold text-blue-400">{agent.leads}</p><p className="text-xs text-slate-400">Leads</p></div>
                        </div>
                        <div className="flex items-center justify-center space-x-1 pt-2">
                            <Award className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-semibold text-white">{Number(agent.rating || 0)}</span>
                            <span className="text-xs text-slate-400">/5.0</span>
                        </div>
                    </div>
                    <div className="flex space-x-2 pt-4 mt-auto">
                        <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={() => handleContact('phone')}><Phone className="w-4 h-4 mr-1" />Ligar</Button>
                        <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={() => handleContact('email')}><Mail className="w-4 h-4 mr-1" />E-mail</Button>
                        <Link to={`/agents/edit/${agent.id}`}>
                            <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700/50"><Edit className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20" onClick={() => onDelete(agent.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default AgentCard;