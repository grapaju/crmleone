import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const DocumentStats = ({ documents }) => {
  const totalDocuments = documents.length;
  const validDocuments = documents.filter(doc => doc.status === 'Válido').length;
  const expiringDocuments = documents.filter(doc => doc.status === 'Vencendo').length;
  const expiredDocuments = documents.filter(doc => doc.status === 'Vencido').length;

  const stats = [
    { title: 'Total', value: totalDocuments, icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { title: 'Válidos', value: validDocuments, icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20' },
    { title: 'Vencendo', value: expiringDocuments, icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    { title: 'Vencidos', value: expiredDocuments, icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
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

export default DocumentStats;