import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getScoreCategory } from '@/lib/leadUtils';

const HotLeads = ({ leads }) => {
  const hotLeads = leads
    .filter(lead => lead.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (hotLeads.length === 0) {
    return (
       <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Flame className="w-6 h-6 mr-2 text-red-500" /> Leads Quentes
          </CardTitle>
          <CardDescription>Oportunidades com alta chance de conversão.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-slate-400 py-8">
          <p>Nenhum lead quente no momento.</p>
          <p className="text-sm">Continue nutrindo seus leads para aquecê-los!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Flame className="w-6 h-6 mr-2 text-red-500" /> Leads Quentes
        </CardTitle>
        <CardDescription>Oportunidades com alta chance de conversão. Priorize!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hotLeads.map((lead, index) => {
            const scoreInfo = getScoreCategory(lead.score);
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/leads/edit/${lead.id}`} className="block hover:bg-slate-700/30 p-3 rounded-lg transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${scoreInfo.color}`}>
                        {lead.score}
                       </div>
                       <div>
                         <p className="font-semibold text-white">{lead.name}</p>
                         <p className="text-sm text-slate-400">Interesse: {lead.interest}</p>
                       </div>
                    </div>
                    <Badge variant="outline" className={`border-current ${scoreInfo.textColor}`}>{scoreInfo.name}</Badge>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default HotLeads;