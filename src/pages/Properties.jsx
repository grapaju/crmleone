import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building, Home, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyListItem } from '@/components/properties/PropertyListItem';
import { PropertyFilters } from '@/components/properties/PropertyFilters';
import { propertyService } from '@/services/propertyService';
import { propertyAccessService } from '@/services/propertyAccessService';
import { projectAccessService } from '@/services/projectAccessService';
import { projectService } from '@/services/projectService';
import { towerService } from '@/services/towerService';
import { propertyImageService } from '@/services/propertyImageService';
import { useToast } from '@/components/ui/use-toast';
import ConstructionProjectCard from '@/components/properties/ConstructionProjectCard';
import { useAuth } from '@/contexts/AuthContext';

const Properties = () => {
  const [allItems, setAllItems] = useState([]);
  const [accessibleIds, setAccessibleIds] = useState(null); // propriedades permitidas
  const [accessibleProjectIds, setAccessibleProjectIds] = useState(null); // projetos permitidos
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = user?.role || 'agente';
  const userId = user?.id;

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      try {
        // Buscar properties e projects em paralelo e mesclar
        const [propsRes, projectsRes] = await Promise.allSettled([
          propertyService.getProperties(),
          projectService.getProjects(),
        ]);

        let props = [];
        let projects = [];

        if (propsRes.status === 'fulfilled') {
          props = Array.isArray(propsRes.value) ? propsRes.value : (propsRes.value.data || []);
        }

        if (projectsRes.status === 'fulfilled') {
          projects = Array.isArray(projectsRes.value) ? projectsRes.value : (projectsRes.value.data || []);
        }

        // Helper: normalizar projectFeatures/features que podem vir como objetos ({id,name}) ou strings
        const normalizeFeatures = (arr) => {
          if (!Array.isArray(arr)) return [];
          return arr.map(f => typeof f === 'string' ? f : (f.name ?? f.nome ?? String(f.id ?? '')) );
        };

        // Normalize: garantir propertyType e nomes de campos
        const normalizedProps = props.map(p => ({ ...p, propertyType: p.property_type || p.propertyType || 'property' }));
        // Se a API não retornar imagens embutidas, buscar imagens por propriedade e anexar
        const propsWithImages = await Promise.all(normalizedProps.map(async (p) => {
          try {
            // p pode já ter image/image_url ou images vindo do backend
            if (p.image || p.image_url || (p.images && Array.isArray(p.images) && p.images.length > 0)) return p;
            const imgs = await propertyImageService.getImagesByProperty(p.id);
            if (Array.isArray(imgs)) {
              // anexar array e definir campo image com a image_url da imagem is_primary ou primeira
              p.images = imgs;
              const primary = imgs.find(i => Number(i.is_primary) === 1) || imgs[0] || null;
              if (primary && primary.image_url) p.image = primary.image_url;
            }
          } catch (e) {
            // não bloquear carga de lista se a busca de imagens falhar
          }
          return p;
        }));
  const normalizedProjects = projects.map(p => ({
          ...p,
          // garantir que o frontend receba os nomes camelCase usados nos componentes
          propertyType: p.property_type || p.propertyType || 'project',
          projectName: p.project_name ?? p.projectName ?? p.title ?? p.name ?? null,
          developerName: p.developer_name ?? p.developerName ?? p.developer ?? null,
          projectType: p.project_type ?? p.projectType ?? null,
          projectStatus: p.project_status ?? p.projectStatus ?? p.status ?? null,
          endereco: p.endereco ?? p.address ?? null,
          bairro: p.bairro ?? p.neighborhood ?? null,
          cidade: p.cidade ?? p.city ?? null,
          deliveryDate: p.delivery_date ?? p.deliveryDate ?? null,
          image: p.image ?? p.image_url ?? p.imageUrl ?? null,
          // units/towers/features podem vir com nomes diferentes; normalize defensivamente
          units: Array.isArray(p.units) ? p.units : (Array.isArray(p.unidades) ? p.unidades : (p.unitsList ?? [])),
          towers: Array.isArray(p.towers) ? p.towers : (p.towers ? [p.towers] : (p.torres ?? [])),
          projectFeatures: normalizeFeatures(p.projectFeatures ?? p.features ?? p.featuresList ?? p.projectFeaturesList)
        }));

        // Buscar torres para cada projeto (API separada) e anexar como array
        const projectsWithTowers = await Promise.all(normalizedProjects.map(async (proj) => {
          try {
            const towers = await towerService.getTowersByProject(proj.id);
            return { ...proj, towers: Array.isArray(towers) ? towers : [] };
          } catch (e) {
            // se falhar, retorne array vazio para não quebrar UI
            return { ...proj, towers: [] };
          }
        }));

  setAllItems([...propsWithImages, ...projectsWithTowers]);

        // Se usuário não for admin, buscar permissões
        if (userId && userRole !== 'admin') {
          try {
            const [propIds, projIds] = await Promise.all([
              propertyAccessService.getAccessiblePropertyIds(userId).catch(()=>[]),
              projectAccessService.get(userId).catch(()=>[])
            ]);
            setAccessibleIds(Array.isArray(propIds) ? propIds.map(Number) : []);
            setAccessibleProjectIds(Array.isArray(projIds) ? projIds.map(Number) : []);
          } catch (permErr) {
            setAccessibleIds([]);
            setAccessibleProjectIds([]);
          }
        } else {
          setAccessibleIds([]); // admin ignora checagem, tratado no filtro
          setAccessibleProjectIds([]);
        }
      } catch (e) {
        toast({
          title: "Erro ao carregar imóveis",
          description: e.message || 'Erro desconhecido',
          variant: "destructive"
        });
      }
      setLoading(false);
    }
    fetchProperties();
  }, [userId, userRole]);

  const handleDelete = async (id, type) => {
    try {
      // Consome API para deletar (usa projectService para projetos)
      if (type === 'project') {
        await projectService.deleteProject(id);
      } else {
        await propertyService.deleteProperty(id);
      }
      setAllItems((prev) => prev.filter(item => item.id !== id));
      toast({
        title: "✅ Item Excluído",
        description: "O item foi excluído com sucesso.",
      });
    } catch (e) {
      toast({
        title: "Erro ao excluir",
        description: e.message || 'Erro desconhecido',
        variant: "destructive"
      });
    }
  };

  let myItems = allItems;
  if (userRole !== 'admin') {
    if (accessibleIds === null || accessibleProjectIds === null) {
      myItems = [];
    } else {
      const allowedProps = new Set(accessibleIds);
      const allowedProjects = new Set(accessibleProjectIds);
      myItems = allItems.filter(item => {
        if (item.propertyType === 'project') return allowedProjects.has(Number(item.id));
        return allowedProps.has(Number(item.id));
      });
    }
  }

  const filteredItems = myItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const title = item.propertyType === 'project' ? item.projectName : item.title;
    const address = item.address || item.endereco;
    const matchesSearch = (title && title.toLowerCase().includes(searchLower)) ||
                         (address && address.toLowerCase().includes(searchLower));
    
    const status = item.propertyType === 'project' ? item.projectStatus : item.status;
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    const type = item.propertyType === 'project' ? item.projectType : item.type;
    const matchesType = typeFilter === 'all' || type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Imóveis e Obras</h1>
          <p className="text-slate-400">
            {userRole === 'admin' ? "Gerencie todo o portfólio de imóveis e empreendimentos" : "Gerencie seu portfólio de imóveis e empreendimentos"}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cadastro
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link to="/properties/new-project">
                <Building className="w-4 h-4 mr-2" />
                Cadastrar Obra/Empreendimento
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/properties/new-property">
                <Home className="w-4 h-4 mr-2" />
                Cadastrar Imóvel Individual
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      <PropertyFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isProjectView={true}
      />

      <div className="space-y-6">
        {loading ? (
          <Card className="glass-effect border-slate-700">
            <CardContent className="p-12 text-center text-slate-400">Carregando...</CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="glass-effect border-slate-700">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Nenhum item encontrado</h3>
              <p className="text-slate-400 mb-6">
                {accessibleIds !== null && accessibleProjectIds !== null && userRole !== 'admin' && (searchTerm === '' && statusFilter === 'all' && typeFilter === 'all') && allItems.length > 0 && myItems.length === 0
                  ? 'Nenhum item (imóvel ou empreendimento) foi liberado para o seu usuário pelo administrador.'
                  : (searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Comece cadastrando seu primeiro imóvel ou obra')}
              </p>
            </CardContent>
          </Card>
        ) : (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                item.propertyType === 'project' 
                  ? <ConstructionProjectCard key={`project-${item.id}`} project={item} onDelete={(id) => handleDelete(id, 'project')} />
                  : <PropertyCard key={`property-${item.id}`} property={item} onDelete={(id) => handleDelete(id, 'property')} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                item.propertyType === 'project'
                ? <ConstructionProjectCard key={`project-${item.id}`} project={item} onDelete={(id) => handleDelete(id, 'project')} />
                : <PropertyListItem key={`property-${item.id}`} property={item} onDelete={(id) => handleDelete(id, 'property')} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Properties;