import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { propertyOptions } from '@/data/propertyOptions';
import { featureService } from '@/services/featureService';
import { Checkbox } from '@/components/ui/checkbox';

const ProjectFormBasic = ({ formData, onInputChange }) => {
  const [features, setFeatures] = useState([]);

  // Buscar lista de features da API ao montar o componente
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await featureService.getFeatures();
        if (!mounted) return;
        const featuresData = (data && data.data) ? data.data : data;

        // Normalizar e filtrar apenas as features da categoria 'empreendimento'
        const candidates = Array.isArray(featuresData) ? featuresData : [];
        const normalized = candidates.map(f => {
          if (!f) return null;
          if (typeof f === 'string') return { id: null, nome: f, name: f };
          return f;
        }).filter(Boolean);

        // campos possíveis para categoria: 'category', 'categoria', 'type', 'group'
        const catFields = ['category', 'categoria', 'type', 'group', 'group_name'];
        const matchesCategory = normalized.filter(f => {
          const cat = catFields.reduce((acc, k) => acc || f[k], null);
          const catStr = String(cat || '').toLowerCase();
          // aceitar variações que indiquem empreendimento/obra
          return ['empreendimento', 'empreendimento_infraestruturas', 'obra', 'empreendimento_infraestrutura'].some(sub => catStr.includes(sub));
        });

  // se encontramos items com categoria, use-os; senão use vazio para cair no fallback local
  setFeatures(matchesCategory.length > 0 ? matchesCategory : []);
      } catch (e) {
        // fallback para opções locais se a API falhar
        setFeatures([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleFeatureChange = (featureLabel, checked, featureId) => {
    const currentSelection = formData.projectFeatures || [];
    let newSelection;
    if (checked) {
      newSelection = [...currentSelection, featureLabel];
    } else {
      newSelection = currentSelection.filter(item => item !== featureLabel);
    }

    // atualizar featureIdMap junto se tivermos um id
    const currentMap = formData.featureIdMap || {};
    const newMap = { ...currentMap };
    if (checked && featureId != null) {
      newMap[featureLabel] = Number(featureId);
    } else if (!checked && newMap[featureLabel]) {
      delete newMap[featureLabel];
    }

    onInputChange('projectFeatures', newSelection);
    onInputChange('featureIdMap', newMap);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-slate-700">
        <CardHeader><CardTitle className="text-white">Informações da Obra</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName" className="text-slate-300">Nome da Obra *</Label>
              <Input id="projectName" value={formData.projectName} onChange={(e) => onInputChange('projectName', e.target.value)} placeholder="Residencial Viver Bem" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="developerName" className="text-slate-300">Incorporadora Responsável *</Label>
              <Input id="developerName" value={formData.developerName} onChange={(e) => onInputChange('developerName', e.target.value)} placeholder="Pavan Construtora" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectType" className="text-slate-300">Tipo de Imóvel</Label>
              <Select value={formData.projectType} onValueChange={(value) => onInputChange('projectType', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="torres_blocos">Torres/Blocos</SelectItem>
                  <SelectItem value="casas">Casas (Condomínio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectStatus" className="text-slate-300">Status da Obra</Label>
              <Select value={formData.projectStatus} onValueChange={(value) => onInputChange('projectStatus', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em construção">Em Construção</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="em fase de vendas">Em Fase de Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryDate" className="text-slate-300">Data de Entrega Prevista</Label>
            <Input id="deliveryDate" type="date" value={formData.deliveryDate} onChange={(e) => onInputChange('deliveryDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect border-slate-700">
        <CardHeader><CardTitle className="text-white">Localização</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="cep">CEP</Label><Input id="cep" value={formData.cep} onChange={(e) => onInputChange('cep', e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="bairro">Bairro</Label><Input id="bairro" value={formData.bairro} onChange={(e) => onInputChange('bairro', e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="cidade">Cidade</Label><Input id="cidade" value={formData.cidade} onChange={(e) => onInputChange('cidade', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" value={formData.endereco} onChange={(e) => onInputChange('endereco', e.target.value)} /></div>
        </CardContent>
      </Card>
      
      <Card className="glass-effect border-slate-700">
        <CardHeader><CardTitle className="text-white">Características do Empreendimento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(features.length > 0 ? features : propertyOptions.empreendimento_infraestruturas).map(option => {
            const label = option.name ?? option.nome ?? String(option.id);
            const id = option.id ?? null;
            return (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`feature-${option.id}`}
                  checked={(formData.projectFeatures || []).includes(label)}
                  onCheckedChange={checked => handleFeatureChange(label, checked, id)}
                />
                <Label htmlFor={`feature-${option.id}`} className="text-slate-300 font-normal">{label}</Label>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectFormBasic;
