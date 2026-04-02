import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

const ReportsHeader = ({ onExport }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios e Analytics</h1>
        <p className="text-slate-400">Análise completa do desempenho da imobiliária</p>
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={() => onExport('PDF')}
          className="border-slate-600 hover:bg-slate-700/50"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => onExport('Excel')}
          className="border-slate-600 hover:bg-slate-700/50"
        >
          <FileText className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>
    </div>
  );
};

export default ReportsHeader;