
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building, Edit, Trash2, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { projectService } from '@/services/projectService';
import { towerService } from '@/services/towerService';
import { unitService } from '@/services/unitService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getStatusColor, formatStatus } from '@/lib/propertyUtils';
import ProjectUnitsView from '@/components/properties/project-details/ProjectUnitsView';
import { formatDateForCard } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { projectAccessService } from '@/services/projectAccessService';

const ConstructionProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [denied, setDenied] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await projectService.getProjectById(id);
        const data = res && res.data ? res.data : res;
        const normalizeProject = (p) => {
          if (!p || typeof p !== 'object') return p;
          const out = { ...p };
          // names
          out.projectName = out.projectName || out.project_name || out.title || out.name || '';
          out.developerName = out.developerName || out.developer_name || out.developer || '';
          out.projectType = out.projectType || out.project_type || out.property_type || out.propertyType || '';
          out.projectStatus = out.projectStatus || out.status || out.project_status || '';
          out.bairro = out.bairro || out.neighborhood || out.neighborhood || '';
          out.cidade = out.cidade || out.city || '';
          out.deliveryDate = out.deliveryDate || out.delivery_date || out.delivery || '';
          // features may come as array of ids/names/objects
          out.projectFeatures = out.projectFeatures || out.features || out.project_features || [];
          // towers/units arrays
          out.towers = Array.isArray(out.towers) ? out.towers : (Array.isArray(out.towers) ? out.towers : (out.towers || []));
          out.units = Array.isArray(out.units) ? out.units : (out.units || []);
          // normalize nested units lightly for summary counts (ensure status_venda/valor present)
          out.units = out.units.map(u => {
            if (!u || typeof u !== 'object') return u;
            const cu = { ...u };
            if (cu.status_venda == null && cu.sale_status != null) cu.status_venda = cu.sale_status;
            if (cu.status_venda == null && cu.status != null) cu.status_venda = cu.status;
            if (cu.valor == null && cu.price != null) cu.valor = cu.price;
            if (cu.numero_unidade == null && cu.unit_number != null) cu.numero_unidade = String(cu.unit_number);
            if (cu.pavimento == null && cu.floor != null) cu.pavimento = String(cu.floor) + 'º andar';
            if (cu.torre_id == null && cu.tower_id != null) cu.torre_id = cu.tower_id;
            return cu;
          });
          return out;
        };

        if (data && (data.propertyType === 'project' || data.property_type === 'project' || data.projectName || data.project_name)) {
          // normalize base project
          let proj = normalizeProject(data);

          // garantir que temos torres: se ausentes, buscar pela API de torres
          try {
            if (!Array.isArray(proj.towers) || proj.towers.length === 0) {
              const fetchedTowers = await towerService.getTowersByProject(proj.id || id);
              proj.towers = Array.isArray(fetchedTowers) ? fetchedTowers : [];
            }
          } catch (e) {
            // não bloquear a exibição do projeto por falha na API de torres
            proj.towers = proj.towers || [];
          }

          // garantir que temos unidades: se ausentes, buscar pela API de unidades
          try {
            if (!Array.isArray(proj.units) || proj.units.length === 0) {
              const fetchedUnits = await unitService.getUnitsByProject(proj.id || id);
              const normalizeFetchedUnit = (u) => {
                if (!u || typeof u !== 'object') return u;
                const cu = { ...u };
                if (cu.status_venda == null && cu.sale_status != null) cu.status_venda = cu.sale_status;
                if (cu.status_venda == null && cu.status != null) cu.status_venda = cu.status;
                if (cu.valor == null && cu.price != null) cu.valor = cu.price;
                if (cu.numero_unidade == null && cu.unit_number != null) cu.numero_unidade = String(cu.unit_number);
                if (cu.pavimento == null && cu.floor != null) cu.pavimento = String(cu.floor) + 'º andar';
                if (cu.torre_id == null && cu.tower_id != null) cu.torre_id = cu.tower_id;
                return cu;
              };
              proj.units = Array.isArray(fetchedUnits) ? fetchedUnits.map(normalizeFetchedUnit) : [];
            }
          } catch (e) {
            proj.units = proj.units || [];
          }

          // Guard: somente admin ou agente com permissão explícita
          if (user.role !== 'admin') {
            let cache = {};
            try { cache = JSON.parse(sessionStorage.getItem('perm_projects_access') || '{}'); } catch {}
            let allowed = cache[user.id];
            if (!allowed) {
              try {
                allowed = await projectAccessService.get(user.id);
                cache[user.id] = allowed;
                sessionStorage.setItem('perm_projects_access', JSON.stringify(cache));
              } catch { allowed = []; }
            }
            const allowedSet = new Set((allowed || []).map(Number));
            if (!allowedSet.has(Number(proj.id))) {
              setDenied(true);
              setCheckingAccess(false);
              return;
            }
          }
          setProject(proj);
        } else {
          toast({ title: "❌ Erro", description: "Obra não encontrada.", variant: "destructive" });
          navigate('/properties');
        }
      } catch (e) {
        toast({ title: "❌ Erro", description: e.message || "Erro ao buscar obra.", variant: "destructive" });
        navigate('/properties');
      } finally {
        setCheckingAccess(false);
      }
    })();
  }, [id, navigate, toast, user]);

  const handleDelete = () => {
    (async () => {
      try {
        await projectService.deleteProject(project.id);
        toast({ title: "✅ Obra Excluída", description: "A obra foi excluída com sucesso." });
        navigate('/properties');
      } catch (e) {
        toast({ title: "Erro ao excluir obra", description: e.message || 'Erro desconhecido', variant: 'destructive' });
      }
    })();
  };

  if (checkingAccess && !project && !denied) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">Acesso não autorizado</h1>
        <p className="text-slate-400">Este empreendimento não foi liberado para seu usuário. Solicite ao administrador se necessário.</p>
        <Button onClick={() => navigate('/properties')} className="bg-blue-600 hover:bg-blue-700">Voltar para lista</Button>
      </div>
    );
  }

  if (!project) return null;

  // Defensive: garantir arrays padrão
  const units = Array.isArray(project.units) ? project.units : [];
  const towers = Array.isArray(project.towers) ? project.towers : [];

  const totalUnits = units.length;
  const statusCounts = units.reduce((acc, unit) => {
    acc[unit.status_venda] = (acc[unit.status_venda] || 0) + 1;
    return acc;
  }, { disponível: 0, reservado: 0, vendido: 0, 'em negociação': 0 });

  const soldPercentage = totalUnits > 0 ? (statusCounts.vendido / totalUnits) * 100 : 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/properties')}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.projectName}</h1>
            <p className="text-slate-400">{project.developerName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link to={`/properties/edit-project/${project.id}`}>
            <Button variant="outline" className="border-slate-600 hover:bg-slate-700/50"><Edit className="w-4 h-4 mr-2" />Editar</Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="border-red-600 text-red-400 hover:bg-red-600/20"><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-6">
          <Card className="glass-effect border-slate-700">
            <CardHeader><img className="w-full h-48 object-cover rounded-t-lg" src={project.image || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750" } alt={`Imagem da obra ${project.projectName}`} /></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                 <CardTitle className="text-white">Resumo da Obra</CardTitle>
                 <Badge className={getStatusColor(project.projectStatus)}>{formatStatus(project.projectStatus)}</Badge>
              </div>
              <div className="flex items-center text-slate-300"><MapPin className="w-4 h-4 mr-2" /> {project.bairro}, {project.cidade}</div>
              <div className="flex items-center text-slate-300"><Calendar className="w-4 h-4 mr-2" /> Entrega: {formatDateForCard(project.deliveryDate)}</div>
              <div className="flex items-center text-slate-300"><Building className="w-4 h-4 mr-2" /> {towers.length} Torre(s) / {totalUnits} Unidades</div>
              <div>
                <div className="flex justify-between items-center mb-1"><p className="text-sm text-slate-300">Vendas Concluídas</p><p className="text-sm font-bold text-white">{statusCounts.vendido} / {totalUnits}</p></div>
                <Progress value={soldPercentage} />
                <p className="text-xs text-right text-slate-400 mt-1">{soldPercentage.toFixed(1)}%</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.isArray(project.projectFeatures) && project.projectFeatures.map((feature, idx) => {
                  // feature pode ser string ou objeto {id,name}
                  const label = typeof feature === 'string' ? feature : (feature.name ?? feature.nome ?? String(feature.id ?? idx));
                  const key = typeof feature === 'object' ? `feat-${feature.id ?? idx}-${idx}` : `feat-${label}-${idx}`;
                  return <Badge key={key} variant="secondary">{label}</Badge>;
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
           <ProjectUnitsView project={project} />
        </motion.div>
      </div>
    </div>
  );
};

export default ConstructionProjectDetails;
