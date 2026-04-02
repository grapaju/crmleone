import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const EmptyState = ({ Icon, title, message, actionButton }) => {
  return (
    <Card className="glass-effect border-slate-700">
      <CardContent className="p-12 text-center">
        <Icon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{message}</p>
        {actionButton}
      </CardContent>
    </Card>
  );
};

export default EmptyState;