import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

const AgentPerformanceTable = ({ data, onDetailsClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Performance dos Agentes</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDetailsClick('Agentes')}
              className="text-slate-400 hover:text-white"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300">Agente</th>
                  <th className="text-center py-3 px-4 text-slate-300">Vendas</th>
                  <th className="text-center py-3 px-4 text-slate-300">Faturamento</th>
                  <th className="text-center py-3 px-4 text-slate-300">Leads</th>
                  <th className="text-center py-3 px-4 text-slate-300">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {data.map((agent, index) => (
                  <tr key={agent.name} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{index + 1}</span>
                        </div>
                        <span className="text-white font-medium">{agent.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-white font-semibold">{agent.vendas}</td>
                    <td className="text-center py-3 px-4 text-green-400 font-semibold">
                      R$ {(agent.faturamento / 1000).toFixed(0)}K
                    </td>
                    <td className="text-center py-3 px-4 text-blue-400 font-semibold">{agent.leads}</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-purple-400 font-semibold">
                        {((agent.vendas / agent.leads) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentPerformanceTable;