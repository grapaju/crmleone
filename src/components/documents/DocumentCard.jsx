import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, Download, Eye, Trash2, User, Edit, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const DocumentCard = ({ document: doc, onDelete }) => {
  const { toast } = useToast();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Válido': return 'bg-green-500/20 text-green-400';
      case 'Vencendo': return 'bg-yellow-500/20 text-yellow-400';
      case 'Vencido': return 'bg-red-500/20 text-red-400';
      case 'Pendente': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Matrícula': return 'bg-blue-500/20 text-blue-400';
      case 'Escritura': return 'bg-indigo-500/20 text-indigo-400';
      case 'Contrato': return 'bg-purple-500/20 text-purple-400';
      case 'Fiscal': return 'bg-green-500/20 text-green-400';
      case 'Técnico': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Válido': return <CheckCircle className="w-4 h-4" />;
      case 'Vencendo': return <Clock className="w-4 h-4" />;
      case 'Vencido': return <AlertTriangle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getFileUrl = () => {
    if (!doc.file_path) return null;
    // Se já for uma URL completa, retorna direto
    if (/^https?:\/\//.test(doc.file_path)) return doc.file_path;
    // Gera URL correta para uploads
    return `http://localhost:5173/api/php-api-crm/public/uploads/${doc.file_path.replace(/^.*[\\\/]/, '')}`;
  };

  const handleView = () => {
    const url = getFileUrl();
    if (!url) {
      toast({
        title: "Erro",
        description: "Documento não possui arquivo para visualização.",
        variant: "destructive",
      });
      return;
    }
    window.open(url, '_blank');
  };

  const handleDownload = () => {
    const url = getFileUrl();
    if (!url) {
      toast({
        title: "Erro",
        description: "Documento não possui arquivo para download.",
        variant: "destructive",
      });
      return;
    }
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', doc.name || 'documento.pdf');
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <motion.div whileHover={{ y: -2 }} className="group">
      <Card className="glass-effect border-slate-700 card-hover h-full flex flex-col">
        <CardContent className="p-6 flex-grow flex flex-col">
          <div className="space-y-4 flex-grow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-slate-700/50 flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate" title={doc.name}>{doc.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 truncate" title={doc.property}>{doc.property}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                <div className={getStatusColor(doc.status)}>{getStatusIcon(doc.status)}</div>
                <Badge className={getStatusColor(doc.status)} variant="secondary">{doc.status}</Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Categoria:</span><Badge className={getCategoryColor(doc.category)} variant="secondary">{doc.category}</Badge></div>
              <div className="flex justify-between"><span className="text-slate-400">Tipo/Tam:</span><span className="text-white">{doc.type} / {doc.size}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Upload:</span><span className="text-white">{new Date(doc.uploadDate).toLocaleDateString('pt-BR')}</span></div>
              {doc.expiryDate && <div className="flex justify-between"><span className="text-slate-400">Vencimento:</span><span className="text-white">{new Date(doc.expiryDate).toLocaleDateString('pt-BR')}</span></div>}
            </div>

            <div className="flex items-center text-slate-300 text-xs border-t border-slate-700 pt-3">
              <User className="w-3 h-3 mr-1" />Enviado por: {doc.uploadedBy}
            </div>
          </div>

          <div className="flex space-x-2 pt-4 mt-auto">
            <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={handleView}><Eye className="w-3 h-3 mr-1" />Ver</Button>
            <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={handleDownload}><Download className="w-3 h-3 mr-1" />Baixar</Button>
            <Link to={`/documents/edit/${doc.id}`}><Button variant="outline" size="icon" className="border-slate-600 hover:bg-slate-700/50"><Edit className="w-3 h-3" /></Button></Link>
            <Button variant="outline" size="icon" className="border-red-600 text-red-400 hover:bg-red-600/20" onClick={() => onDelete(doc.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocumentCard;