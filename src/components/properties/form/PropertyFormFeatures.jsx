import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { propertyOptions } from "@/data/propertyOptions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// Note: this component now expects `featuresByCategory` prop with shape:
// { acabamentos: [{id,nome,category},...], comodidades: [...], condominio_infraestruturas: [...] }

const FeatureCheckboxGroup = ({
  title,
  options = [],
  selected = [],
  onSelectionChange,
  fieldName,
}) => (
  <Card className="glass-effect border-slate-700">
    <CardHeader>
      <CardTitle className="text-white text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {options.map((option) => {
        const optId = option.id != null ? Number(option.id) : option.id;
        const currentSelection = Array.isArray(selected) ? selected.map(Number).filter(Boolean) : [];
        const isChecked = currentSelection.includes(optId);
        return (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${fieldName}-${option.id}`}
              checked={isChecked}
              onCheckedChange={(checked) => {
                const curr = Array.isArray(selected) ? selected.map(Number).filter(Boolean) : [];
                if (checked) {
                  onSelectionChange(Array.from(new Set([...curr, optId])));
                } else {
                  onSelectionChange(curr.filter((item) => item !== optId));
                }
              }}
            />
            <Label
              htmlFor={`${fieldName}-${option.id}`}
              className="text-slate-300 font-normal"
            >
              {option.nome}
            </Label>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

const PropertyFormFeatures = ({
  formData,
  onInputChange,
  featuresByCategory = {},
  loading = false,
  error = null,
}) => {
  // no local toast here: PropertyForm will notify user and component will fallback to local options
  const handleFeatureChange = (fieldName, newSelection) => {
    onInputChange(fieldName, newSelection);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="glass-effect border-slate-700 p-6">
          <CardHeader>
            <CardTitle className="text-white">
              Carregando características...
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <Loader2 className="w-5 h-5 mr-3 animate-spin text-slate-300" />
            <span className="text-slate-300">
              Buscando características do servidor...
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // if there's an error message from server, show it prominently so user can inspect response body
  const renderServerError = () => {
    if (!error) return null;
    return (
      <Card className="glass-effect border-red-600">
        <CardHeader>
          <CardTitle className="text-red-400">Erro ao carregar características do servidor</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">{String(error)}</pre>
        </CardContent>
      </Card>
    );
  };

  // Always merge server-provided options with local fallback so unselected options don't disappear
  const mergeList = (serverList = [], fallbackList = []) => {
    const byKey = new Map();
    (fallbackList || []).forEach(i => {
      const id = i?.id ?? null;
      const nome = i?.nome ?? i?.name ?? '';
      const key = id !== null ? String(id) : `name:${nome}`;
      byKey.set(key, { ...i, id: id !== null ? Number(id) : id, nome });
    });
    (serverList || []).forEach(i => {
      const id = i?.id ?? i?.ID ?? i?.feature_id ?? null;
      const nome = i?.nome ?? i?.name ?? i?.title ?? '';
      const key = id !== null ? String(Number(id)) : `name:${nome}`;
      byKey.set(key, { ...i, id: id !== null ? Number(id) : id, nome });
    });
    return Array.from(byKey.values());
  };

  const safeFeatures = {
    acabamentos: mergeList(featuresByCategory.acabamentos || [], propertyOptions.acabamentos || []),
    comodidades: mergeList(featuresByCategory.comodidades || [], propertyOptions.comodidades || []),
    condominio_infraestruturas: mergeList(featuresByCategory.condominio_infraestruturas || [], propertyOptions.condominio_infraestruturas || []),
  };

  return (
    <div className="space-y-6">
      <FeatureCheckboxGroup
        title="Acabamentos"
        options={safeFeatures.acabamentos}
        selected={formData.acabamentos || []}
        onSelectionChange={(selection) =>
          handleFeatureChange("acabamentos", selection)
        }
        fieldName="acabamentos"
      />
      <FeatureCheckboxGroup
        title="Comodidades"
        options={safeFeatures.comodidades}
        selected={formData.comodidades || []}
        onSelectionChange={(selection) =>
          handleFeatureChange("comodidades", selection)
        }
        fieldName="comodidades"
      />
      <FeatureCheckboxGroup
        title="Infraestrutura do Condomínio"
        options={safeFeatures.condominio_infraestruturas}
        selected={formData.condominio_infraestruturas || []}
        onSelectionChange={(selection) =>
          handleFeatureChange("condominio_infraestruturas", selection)
        }
        fieldName="condominio_infraestruturas"
      />
    </div>
  );
};

export default PropertyFormFeatures;
