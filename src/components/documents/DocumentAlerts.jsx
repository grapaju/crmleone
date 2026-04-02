import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DocumentAlerts = ({ documents }) => {
  return (
    <Card className="glass-effect border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Documentos Vencendo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-300 mb-4">
          Você tem {documents.length} documento(s) que vencerão em breve.
          Verifique e renove os documentos necessários.
        </p>
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
              <div>
                <p className="text-sm font-medium text-white">{doc.name}</p>
                <p className="text-xs text-slate-400">
                  Vence em: {new Date(doc.expiryDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Link to={`/documents/edit/${doc.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentAlerts;