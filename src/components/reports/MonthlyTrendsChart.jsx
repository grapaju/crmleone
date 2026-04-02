import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye } from 'lucide-react';

const MonthlyTrendsChart = ({ data, onDetailsClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Tendências Mensais</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDetailsClick('Tendências')}
              className="text-slate-400 hover:text-white"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="visitas" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="propostas" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="fechamentos" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyTrendsChart;