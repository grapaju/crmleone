import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KPI = ({ title, value, change, trend, icon: Icon, color, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
    >
      <Card className="glass-effect border-slate-700 card-hover">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">{title}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              {change && (
                <div className="flex items-center mt-2">
                  {trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg bg-slate-700/50 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default KPI;