import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, MessageCircle, Edit, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { getStatusColor, getSourceColor, getScoreCategory } from '@/lib/leadUtils';
import { Progress } from '@/components/ui/progress';

const LeadCard = ({ lead, onDelete }) => {
  const { toast } = useToast();
  const scoreInfo = getScoreCategory(lead.score);
  const navigate = useNavigate();

  const handleContact = (type) => {
    toast({
      title: `📞 Contatar ${lead.name}`,
      description: "🚧 Esta funcionalidade ainda não foi implementada—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  return (
    <Link to={`/leads/view/${lead.id}`} className="block group">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}>
        <Card className="glass-effect border-slate-700 overflow-hidden card-hover relative cursor-pointer hover:ring-2 hover:ring-primary/60 transition">
          <div className={`w-full h-2 ${scoreInfo.color}`}></div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{lead.name}</h3>
                  <p className="text-sm text-slate-400">Corretor: {lead.agent}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge className={scoreInfo.color}>{scoreInfo.name}</Badge>
                  <Badge className={getSourceColor(lead.source)}>{lead.source}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                      <span>Lead Score</span>
                      <span className={`font-bold ${scoreInfo.textColor}`}>{lead.score}</span>
                  </div>
                  <Progress value={lead.score} className="h-2" indicatorClassName={scoreInfo.color} />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-700">
                <div className="flex items-center text-slate-300 text-sm"><Mail className="w-4 h-4 mr-2 text-slate-400" />{lead.email}</div>
                <div className="flex items-center text-slate-300 text-sm"><Phone className="w-4 h-4 mr-2 text-slate-400" />{lead.phone}</div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Interesse:</span><span className="text-white">{lead.interest}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Orçamento:</span><span className="text-white">R$ {lead.budget.toLocaleString('pt-BR')}</span></div>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-slate-700">
                <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={e => { e.preventDefault(); handleContact('phone'); }}><Phone className="w-4 h-4 mr-1" />Ligar</Button>
                <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={e => { e.preventDefault(); handleContact('whatsapp'); }}><MessageCircle className="w-4 h-4 mr-1" />WhatsApp</Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-slate-600 hover:bg-slate-700/50"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/leads/edit/${lead.id}`);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="border-red-600 text-red-400 hover:bg-red-600/20" onClick={e => { e.preventDefault(); onDelete(lead.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
};

export default LeadCard;