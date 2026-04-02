import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MessageCircle, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PropertySidePanel = ({ property }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAction = (title) => {
    toast({
      title: `🚧 Funcionalidade Indisponível`,
      description: `A ação "${title}" ainda não foi implementada.`
    });
  };
  
  const handleScheduleVisit = () => {
    navigate('/calendar/new', { 
      state: { 
        propertyId: property.id, 
        propertyTitle: property.title,
        agentName: user.name,
      } 
    });
  };

  const handleViewDocuments = () => {
    navigate(`/documents?propertyId=${property.id}`);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader><CardTitle className="text-white">Corretor Responsável</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <img  className="w-12 h-12 rounded-full object-cover" alt="Foto do corretor" src="https://images.unsplash.com/photo-1632709878761-d4d0f5bdc2d8" />
              <div>
                <p className="font-semibold text-white">{property.agent?.name || 'Não atribuído'}</p>
                <p className="text-sm text-slate-400">Corretor de Imóveis</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700/50" onClick={() => handleAction('Ligar para corretor')}><Phone className="w-4 h-4 mr-2" /> {property.agent?.phone || 'Ligar'}</Button>
              <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700/50" onClick={() => handleAction('Enviar e-mail')}><Mail className="w-4 h-4 mr-2" /> E-mail</Button>
              <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700/50" onClick={() => handleAction('Enviar WhatsApp')}><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-effect border-slate-700">
          <CardHeader><CardTitle className="text-white">Ações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleScheduleVisit}><Calendar className="w-4 h-4 mr-2" /> Agendar Visita</Button>
            <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700/50" onClick={handleViewDocuments}><FileText className="w-4 h-4 mr-2" /> Ver Documentos</Button>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default PropertySidePanel;