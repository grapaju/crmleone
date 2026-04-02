import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { unitService } from '@/services/unitService';
import { propertyService } from '@/services/propertyService';
import { towerService } from '@/services/towerService';
import UnitForm from '@/components/properties/project-form/UnitForm';

const UnitEdit = () => {
  const { projectId, unitId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unit, setUnit] = useState(null);
  const [project, setProject] = useState(null);
  const [towers, setTowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [propResp, unitsResp] = await Promise.all([
          propertyService.getPropertyById(projectId).catch(() => null),
          unitService.getUnitsByProject(projectId).catch(() => []),
        ]);

        const projectData = propResp && propResp.data ? propResp.data : propResp;
        if (!projectData) {
          toast({ title: '❌ Erro', description: 'Obra não encontrada.', variant: 'destructive' });
          navigate('/properties');
          return;
        }

        const units = Array.isArray(unitsResp) ? unitsResp : (Array.isArray(projectData.units) ? projectData.units : []);
        const found = units.find(u => String(u.id) === String(unitId) || String(u.unit_number) === String(unitId) || String(u.numero_unidade) === String(unitId));
        if (!found) {
          toast({ title: '❌ Erro', description: 'Unidade não encontrada.', variant: 'destructive' });
          navigate(`/properties/project/${projectId}`);
          return;
        }

        // normalize minimal fields expected by UnitForm
        const normalize = (u) => {
          const out = { ...u };
          if (out.numero_unidade == null && out.unit_number != null) out.numero_unidade = String(out.unit_number);
          if (out.unit_number == null && out.numero_unidade != null) out.unit_number = out.numero_unidade;
          if (out.pavimento == null && out.floor != null) out.pavimento = String(out.floor) + 'º andar';
          if (out.floor == null && out.pavimento != null) {
            const parsed = parseInt(String(out.pavimento).replace(/[^0-9]/g, ''));
            if (!Number.isNaN(parsed)) out.floor = parsed;
          }
          if (out.tipo == null && out.type != null) out.tipo = out.type;
          if (out.area_privativa == null && out.area_private != null) out.area_privativa = out.area_private;
          if (out.valor == null && out.price != null) out.valor = out.price;
          if (out.status_venda == null && out.sale_status != null) out.status_venda = out.sale_status;
          return out;
        };

        // buscar torres do projeto para popular select
        let fetchedTowers = [];
        try {
          const t = await towerService.getTowersByProject(projectId);
          fetchedTowers = Array.isArray(t) ? t : [];
        } catch (_) {
          fetchedTowers = [];
        }

        if (mounted) {
          setProject(projectData);
          setUnit({ ...normalize(found), isEditing: true });
          setTowers(fetchedTowers);
        }
      } catch (e) {
        toast({ title: '❌ Erro', description: e.message || 'Erro ao carregar unidade', variant: 'destructive' });
        navigate('/properties');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false };
  }, [projectId, unitId, navigate, toast]);

  const handleSave = async (updatedUnit) => {
    try {
      // validação mínima
      if (!updatedUnit.numero_unidade || String(updatedUnit.numero_unidade).trim() === '') {
        throw new Error('Número da unidade é obrigatório');
      }
      if (!updatedUnit.valor || Number(updatedUnit.valor) <= 0) {
        throw new Error('Valor deve ser maior que zero');
      }

      // map fields to API-friendly shape
      const payload = {
        id: updatedUnit.id,
        project_id: projectId,
        tower_id: updatedUnit.torre_id ?? updatedUnit.tower_id ?? null,
        unit_number: updatedUnit.unit_number ?? updatedUnit.numero_unidade,
        floor: updatedUnit.floor ?? (typeof updatedUnit.pavimento === 'string' ? parseInt(String(updatedUnit.pavimento).replace(/[^0-9]/g, '')) : undefined),
        type: updatedUnit.tipo ?? updatedUnit.type,
        area_private: updatedUnit.area_privativa ?? updatedUnit.area_private,
        price: updatedUnit.valor ?? updatedUnit.price,
        sale_status: updatedUnit.status_venda ?? updatedUnit.sale_status,
        specific_features: updatedUnit.caracteristicas_especificas ?? updatedUnit.specific_features ?? '',
      };

      await unitService.saveUnit(payload);
      toast({ title: '✅ Unidade atualizada', description: 'As informações da unidade foram salvas.' });
      navigate(`/properties/project/${projectId}`);
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message || 'Erro desconhecido', variant: 'destructive' });
    }
  };

  const handleRemove = async (id) => {
    try {
      await unitService.deleteUnit(id);
      toast({ title: '✅ Unidade excluída', description: 'A unidade foi removida.' });
      navigate(`/properties/project/${projectId}`);
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: e.message || 'Erro desconhecido', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!unit) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Unidade {unit.numero_unidade}</h1>
          <p className="text-slate-400">Atualize as informações da unidade e salve.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate(`/properties/project/${projectId}`)}>Voltar</Button>
        </div>
      </div>

      <div>
        <UnitForm unit={unit} onSave={handleSave} onRemove={handleRemove} towers={towers} />
      </div>
    </div>
  );
};

export default UnitEdit;
