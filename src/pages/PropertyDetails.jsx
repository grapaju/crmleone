import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { propertyService } from '@/services/propertyService';
import PropertyImageGallery from '@/components/properties/details/PropertyImageGallery';
import PropertyMainInfo from '@/components/properties/details/PropertyMainInfo';
import PropertySidePanel from '@/components/properties/details/PropertySidePanel';
import PropertyActivityTimeline from '@/components/properties/details/PropertyActivityTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { propertyAccessService } from '@/services/propertyAccessService';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [property, setProperty] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [denied, setDenied] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchPropertyWithAccess() {
      setCheckingAccess(true);
      try {
        const response = await propertyService.getPropertyById(id);
        const data = response && response.data ? response.data : response;
        if (!data) {
          toast({ title: '❌ Erro', description: 'Imóvel não encontrado.', variant: 'destructive' });
          navigate('/properties');
          return;
        }
        // Admin sempre permitido
        if (user.role === 'admin') {
          setProperty(data);
          setDenied(false);
          return;
        }
        // Tentar cache em sessionStorage
        let cached = null;
        try { cached = JSON.parse(sessionStorage.getItem('perm_properties_access') || '{}'); } catch {}
        const agentId = user.id;
        let allowedIds = Array.isArray(cached[agentId]) ? cached[agentId] : null;
        if (!allowedIds) {
          try {
            allowedIds = await propertyAccessService.getAccessiblePropertyIds(agentId);
            const map = { ...(cached || {}) };
            map[agentId] = allowedIds;
            sessionStorage.setItem('perm_properties_access', JSON.stringify(map));
          } catch {
            allowedIds = [];
          }
        }
        const allowed = new Set((allowedIds || []).map(Number));
        if (!allowed.has(Number(data.id))) {
          setDenied(true);
          toast({
            title: 'Acesso Negado',
            description: 'Este imóvel não foi liberado para o seu usuário.',
            variant: 'destructive'
          });
          // Não redireciona imediatamente para permitir mostrar mensagem amigável
          return;
        }
        setProperty(data);
        setDenied(false);
      } catch (e) {
        toast({ title: '❌ Erro', description: e.message || 'Erro ao buscar imóvel', variant: 'destructive' });
        navigate('/properties');
      } finally {
        setCheckingAccess(false);
      }
    }
    fetchPropertyWithAccess();
  }, [id, navigate, toast, user]);

  const handleDelete = async () => {
    try {
      await propertyService.deleteProperty(property.id);
      toast({
        title: "✅ Imóvel Excluído",
        description: "O imóvel foi excluído com sucesso."
      });
      navigate('/properties');
    } catch (e) {
      toast({
        title: "Erro ao excluir",
        description: e.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
  };

  if (checkingAccess && !property && !denied) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">Acesso não autorizado</h1>
        <p className="text-slate-400">Este imóvel não está liberado para seu usuário. Caso acredite que isto é um engano solicite ao administrador.</p>
        <Button onClick={() => navigate('/properties')} className="bg-blue-600 hover:bg-blue-700">Voltar para lista</Button>
      </div>
    );
  }

  if (!property) {
    return null; // estado transiente (já tratado acima)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/properties')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{property.title}</h1>
            <p className="text-slate-400">Detalhes do imóvel</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link to={`/properties/edit/${property.id}`}>
            <Button variant="outline" className="border-slate-600 hover:bg-slate-700/50">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="border-red-600 text-red-400 hover:bg-red-600/20">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PropertyImageGallery property={property} />
          <PropertyMainInfo property={property} />
          <PropertyActivityTimeline propertyId={property.id} />
        </div>
        <div className="space-y-6">
          <PropertySidePanel property={property} />
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;