import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { propertyService } from '@/services/propertyService';
import { unitService } from '@/services/unitService';
import { useAuth } from '@/contexts/AuthContext';
import { projectAccessService } from '@/services/projectAccessService';
import { unitAccessService } from '@/services/unitAccessService';
import PropertyImageGallery from '@/components/properties/details/PropertyImageGallery';
import PropertyMainInfo from '@/components/properties/details/PropertyMainInfo';
import PropertySidePanel from '@/components/properties/details/PropertySidePanel';

const UnitDetails = () => {
  const { projectId, unitId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unit, setUnit] = useState(null);
  const [project, setProject] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [denied, setDenied] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchProjectAndUnit() {
      try {
        // Fetch property and units in parallel — units are managed by units API
        const [propResp, unitsResp] = await Promise.all([
          propertyService.getPropertyById(projectId).catch(() => null),
          unitService.getUnitsByProject(projectId).catch(() => []),
        ]);

        const projectDataRaw = propResp && propResp.data ? propResp.data : propResp;
        if (!projectDataRaw) {
          toast({ title: '❌ Erro', description: 'Obra não encontrada.', variant: 'destructive' });
          navigate('/properties');
          return;
        }

        const projectData = { ...projectDataRaw };
        projectData.projectName = projectData.projectName || projectData.project_name || projectData.title || '';
        projectData.endereco = projectData.endereco || projectData.address || '';
        projectData.cidade = projectData.cidade || projectData.city || '';
        projectData.cep = projectData.cep || projectData.zip_code || projectData.zipCode || '';
        projectData.projectFeatures = projectData.projectFeatures || projectData.features || [];
        projectData.towers = Array.isArray(projectData.towers) ? projectData.towers : (projectData.towers || []);

        // unitsResp may be an array from the units API; fallback to units on projectData
        projectData.units = Array.isArray(unitsResp) ? unitsResp : (Array.isArray(projectData.units) ? projectData.units : []);

        const unitData = projectData.units.find(u => String(u.id) === String(unitId) || String(u.unit_number) === String(unitId) || String(u.numero_unidade) === String(unitId));
        if (!unitData) {
          console.debug('Units loaded for project', projectId, projectData.units);
          toast({ title: '❌ Erro', description: 'Unidade não encontrada.', variant: 'destructive' });
          navigate(`/properties/project/${projectId}`);
          return;
        }

        const ud = { ...unitData };
        if (ud.numero_unidade == null && ud.unit_number != null) ud.numero_unidade = String(ud.unit_number);
        if (ud.unit_number == null && ud.numero_unidade != null) ud.unit_number = ud.numero_unidade;
        if (ud.status_venda == null && ud.sale_status != null) ud.status_venda = ud.sale_status;
        if (ud.valor == null && ud.price != null) ud.valor = ud.price;
        if (ud.pavimento == null && ud.floor != null) ud.pavimento = String(ud.floor) + 'º andar';
        if (ud.torre_id == null && ud.tower_id != null) ud.torre_id = ud.tower_id;

        // Guard de acesso (admin bypass)
        if (user.role !== 'admin') {
          // Primeiro verificar permissão no projeto
          let projCache = {};
          try { projCache = JSON.parse(sessionStorage.getItem('perm_projects_access') || '{}'); } catch {}
          let allowedProjects = projCache[user.id];
            if (!allowedProjects) {
              try {
                allowedProjects = await projectAccessService.get(user.id);
                projCache[user.id] = allowedProjects;
                sessionStorage.setItem('perm_projects_access', JSON.stringify(projCache));
              } catch { allowedProjects = []; }
            }
          const projectAllowed = new Set((allowedProjects||[]).map(Number)).has(Number(projectData.id));
          let unitExplicitAllowed = false;
          if (!projectAllowed) {
            // Verificar permissão direta da unidade
            let unitCache = {};
            try { unitCache = JSON.parse(sessionStorage.getItem('perm_units_access') || '{}'); } catch {}
            let allowedUnits = unitCache[user.id];
            if (!allowedUnits) {
              try {
                allowedUnits = await unitAccessService.get(user.id);
                unitCache[user.id] = allowedUnits;
                sessionStorage.setItem('perm_units_access', JSON.stringify(unitCache));
              } catch { allowedUnits = []; }
            }
            unitExplicitAllowed = new Set((allowedUnits||[]).map(Number)).has(Number(ud.id));
          }
          if (!projectAllowed && !unitExplicitAllowed) {
            setDenied(true);
            setCheckingAccess(false);
            return;
          }
        }

        setProject(projectData);
        setUnit({
          id: ud.id,
          title: `Unidade ${ud.numero_unidade} - ${projectData.projectName}`,
          price: ud.valor,
          address: projectData.endereco,
          city: projectData.cidade,
          state: projectData.estado || 'SC',
          zipCode: projectData.cep,
          bedrooms: parseInt(ud.tipo) || 0,
          bathrooms: parseInt(ud.tipo) || 0,
          parking: 1,
          area: ud.area_privativa ?? ud.area_private,
          type: `Unidade em ${projectData.projectName}`,
          status: ud.status_venda,
          description: `Esta é a unidade ${ud.numero_unidade} localizada na ${ud.pavimento} da ${projectData.towers.find(t => String(t.id) === String(ud.torre_id))?.name || ''}. ${ud.caracteristicas_especificas || ud.specific_features || ''}.`,
          features: [ud.caracteristicas_especificas || ud.specific_features || '', ...(projectData.projectFeatures || []).slice(0, 2)],
          agent: {
            name: 'Carlos Silva',
            phone: '(11) 98765-4321',
            avatar: 'https://images.unsplash.com/photo-1632709878761-d4d0f5bdc2d8'
          },
          image: projectData.image,
        });
      } catch (e) {
        console.error('Error loading unit details', e);
        toast({ title: '❌ Erro', description: e.message || 'Erro ao buscar unidade/obra', variant: 'destructive' });
        navigate('/properties');
      } finally {
        setCheckingAccess(false);
      }
    }

    fetchProjectAndUnit();
  }, [projectId, unitId, navigate, toast, user]);

  const handleDelete = () => {
    toast({
      title: '🚧 Funcionalidade Indisponível',
      description: 'A exclusão de unidades individuais ainda não foi implementada.'
    });
  };

  if (checkingAccess && !unit && !denied) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando detalhes da unidade...</p>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">Acesso não autorizado</h1>
        <p className="text-slate-400">Esta unidade/obra não foi liberada para seu usuário. Solicite ao administrador se achar necessário.</p>
        <Button onClick={() => navigate('/properties')} className="bg-blue-600 hover:bg-blue-700">Voltar para lista</Button>
      </div>
    );
  }

  if (!unit) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/project/${projectId}`)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{unit.title}</h1>
            <p className="text-slate-400">Detalhes da unidade</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="border-slate-600 hover:bg-slate-700/50" onClick={() => toast({title: '🚧 Em breve!', description: 'A edição de unidades será implementada.'})}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={handleDelete} className="border-red-600 text-red-400 hover:bg-red-600/20">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PropertyImageGallery property={unit} />
          <PropertyMainInfo property={unit} />
        </div>
        <div className="space-y-6">
          <PropertySidePanel property={unit} />
        </div>
      </div>
    </div>
  );
};

export default UnitDetails;
            <Trash2 className="w-4 h-4 mr-2" />
