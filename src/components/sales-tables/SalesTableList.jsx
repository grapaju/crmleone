import React from 'react';
import { motion } from 'framer-motion';
import { Sheet, Calendar, User, FileText, Send, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SalesTableList = ({ tables, onEdit, onDelete, onSend }) => {
  const safeTables = Array.isArray(tables) ? tables : [];
  if (safeTables.length === 0) {
    return (
      <div className="text-center py-16">
        <Sheet className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-white">Nenhuma Tabela de Vendas</h3>
        <p className="text-slate-400">Adicione a sua primeira tabela para começar a enviar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
  {safeTables.map(table => {
    // robust date parsing: try multiple fields and formats
    const parseDate = (val) => {
      if (val === null || val === undefined || val === '') return null;

      // If it's an object like { seconds: 123, nanoseconds: 0 } or { _seconds }
      if (typeof val === 'object') {
        const secs = val.seconds ?? val._seconds ?? val.sec ?? null;
        if (typeof secs === 'number') {
          const time = secs < 1e12 ? secs * 1000 : secs;
          const d = new Date(time);
          return isNaN(d.getTime()) ? null : d;
        }
        // sometimes objects contain an ISO string
        const str = val.toString && typeof val.toString === 'function' ? val.toString() : null;
        if (str) return parseDate(str);
        return null;
      }

      // numeric string or number (timestamp in seconds or ms)
      if (typeof val === 'number' || /^\d+$/.test(String(val))) {
        const n = Number(val);
        const time = n < 1e12 ? n * 1000 : n;
        const d = new Date(time);
        return isNaN(d.getTime()) ? null : d;
      }

      // normalize common formats: replace space with T if needed, ensure timezone
      let s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T') + 'Z';
      }

      const parsed = Date.parse(s);
      if (!isNaN(parsed)) return new Date(parsed);

      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    const dateCandidate = table.uploadDate ?? table.upload_date ?? table.date ?? table.created_at ?? table.uploaded_at ?? table.uploadedAt ?? table.createdAt;
    const uploadDateObj = parseDate(dateCandidate);

    return (
      <motion.div
        key={table.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-effect border-slate-700 hover:border-blue-500/50 transition-colors">
          <CardHeader className="flex flex-row justify-between items-start pb-2">
            <CardTitle className="text-lg text-white">{table.name}</CardTitle>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => onEdit(table.id)}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-red-400 hover:text-white" onClick={() => onDelete(table.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /><span>{uploadDateObj ? uploadDateObj.toLocaleDateString('pt-BR') : '—'}</span></div>
              <div className="flex items-center"><User className="w-4 h-4 mr-2" /><span>{table.responsibleAgent}</span></div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Anexos:</p>
                {(Array.isArray(table.attachments) ? table.attachments : []).map((att, index) => (
                  <div key={index} className="flex items-center space-x-2 text-slate-300">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>
                      {att && att.url ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-400 underline">
                          {att.name}
                        </a>
                      ) : (
                        att.name
                      )}
                      <Badge variant="secondary" className="ml-2">{att.size}</Badge>
                      {att && att.url && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="ml-3 text-slate-300 hover:text-white text-xs">
                          Baixar
                        </a>
                      )}
                    </span>
                  </div>
                ))}
            </div>
            <p className="text-sm text-slate-400 italic">"{table.observations}"</p>
            <div className="flex justify-end pt-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onSend(table.id)}>
                <Send className="mr-2 h-4 w-4" /> Enviar Tabela
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  })}
    </div>
  );
};

export default SalesTableList;