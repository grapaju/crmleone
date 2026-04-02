import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const TagInput = ({ value = [], onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Adicione um detalhe e pressione Enter"
        className="bg-slate-800 border-slate-600"
      />
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-slate-700 text-slate-300">
            {tag}
            <button
              type="button"
              className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};


const formatCurrency = (value) => {
  if (value === '' || value == null) return '';
  const num = Number(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (masked) => {
  if (!masked && masked !== 0) return '';
  const digits = String(masked).replace(/[^0-9,-]+/g, '').replace(/\./g, '').replace(/,/g, '.');
  const n = Number(digits);
  return isNaN(n) ? '' : n;
};

const PropertyFormDetails = ({ formData, onInputChange }) => {
  const [valorInput, setValorInput] = useState('');
  const [areaInput, setAreaInput] = useState('');

  useEffect(() => {
    setValorInput(formatCurrency(formData.valor));
    // sync area input when formData.area_m2 changes
    const v = formData.area_m2;
    if (v === '' || v == null) setAreaInput('');
    else setAreaInput(formatDecimal(v));
  }, [formData.valor, formData.area_m2]);

  const handleValorChange = (raw) => {
    // keep only digits and separators while typing
    const cleaned = String(raw).replace(/[^0-9,\.]/g, '');
    setValorInput(cleaned);
  };

  const handleValorBlur = (e) => {
    const parsed = parseCurrency(e.target.value);
    onInputChange('valor', parsed);
    setValorInput(formatCurrency(parsed));
  };

  const formatDecimal = (value) => {
    if (value === '' || value == null) return '';
    const num = Number(String(value).toString().replace(/[^0-9.-]+/g, '').replace(/,/g, '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseDecimal = (masked) => {
    if (!masked && masked !== 0) return '';
    const cleaned = String(masked).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]+/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? '' : n;
  };

  const handleAreaChange = (raw) => {
    // allow numbers, comma and dot while typing
    const cleaned = String(raw).replace(/[^0-9,\.]/g, '');
    setAreaInput(cleaned);
  };

  const handleAreaBlur = (e) => {
    const parsed = parseDecimal(e.target.value);
    onInputChange('area_m2', parsed);
    setAreaInput(formatDecimal(parsed));
  };

  return (
  <div className="space-y-6">
    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Valores e Medidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valor" className="text-slate-300">Valor (R$) *</Label>
            <Input
              id="valor"
              type="text"
              value={valorInput}
              onChange={(e) => handleValorChange(e.target.value)}
              onBlur={handleValorBlur}
              placeholder="850.000,00"
              className="bg-slate-800 border-slate-600"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area_m2" className="text-slate-300">Área (m²)</Label>
            <Input
              id="area_m2"
              type="text"
              value={areaInput}
              onChange={(e) => handleAreaChange(e.target.value)}
              onBlur={handleAreaBlur}
              placeholder="552,20"
              className="bg-slate-800 border-slate-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Cômodos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quartos" className="text-slate-300">Quartos</Label>
            <Input id="quartos" type="number" value={formData.quartos} onChange={(e) => onInputChange('quartos', e.target.value)} placeholder="3" className="bg-slate-800 border-slate-600" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banheiros" className="text-slate-300">Banheiros</Label>
            <Input id="banheiros" type="number" value={formData.banheiros} onChange={(e) => onInputChange('banheiros', e.target.value)} placeholder="2" className="bg-slate-800 border-slate-600" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vagas_garagem" className="text-slate-300">Vagas de Garagem</Label>
            <Input id="vagas_garagem" type="number" value={formData.vagas_garagem} onChange={(e) => onInputChange('vagas_garagem', e.target.value)} placeholder="2" className="bg-slate-800 border-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Detalhes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-slate-300">Tags</Label>
          <TagInput
            value={formData.tags || []}
            onChange={(newValue) => onInputChange('tags', newValue)}
          />
          <Label htmlFor="detalhes_adicionais" className="text-slate-300">Detalhes (listas)</Label>
          <TagInput
            value={formData.detalhes_adicionais}
            onChange={(newValue) => onInputChange('detalhes_adicionais', newValue)}
          />
        </div>
      </CardContent>
    </Card>
  </div>
  );
};

export default PropertyFormDetails;