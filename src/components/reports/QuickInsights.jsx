import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const QuickInsights = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Insights Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-blue-400 font-semibold mb-2">📈 Crescimento</h3>
              <p className="text-slate-300 text-sm">
                Vendas aumentaram 15% em relação ao mês anterior, com destaque para apartamentos.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <h3 className="text-green-400 font-semibold mb-2">🎯 Conversão</h3>
              <p className="text-slate-300 text-sm">
                Leads vindos de indicações têm a maior taxa de conversão (18%).
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h3 className="text-purple-400 font-semibold mb-2">⭐ Destaque</h3>
              <p className="text-slate-300 text-sm">
                Carlos Silva lidera em vendas com 8 transações fechadas este mês.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickInsights;