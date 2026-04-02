
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const PropertyFormBasicInfo = ({ formData, onInputChange }) => {
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef(null);

  const addTag = (value) => {
    const v = (value || '').trim();
    if (!v) return;
    const current = Array.isArray(formData.tags) ? formData.tags : [];
    if (current.includes(v)) return setTagInput('');
    const next = [...current, v];
    onInputChange('tags', next);
    setTagInput('');
  };

  const removeTag = (idx) => {
    const current = Array.isArray(formData.tags) ? formData.tags : [];
    const next = current.filter((_, i) => i !== idx);
    onInputChange('tags', next);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput) {
      // remove last tag when input empty
      const current = Array.isArray(formData.tags) ? formData.tags : [];
      if (current.length) removeTag(current.length - 1);
    }
  };

  return (
    <div className="space-y-6">
    <Card className="glass-effect border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Informações Principais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="titulo" className="text-slate-300">Título do Imóvel *</Label>
          <Input id="titulo" value={formData.titulo} onChange={(e) => onInputChange('titulo', e.target.value)} placeholder="Ex: Apartamento Luxuoso no Centro" className="bg-slate-800 border-slate-600" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tipo" className="text-slate-300">Tipo de Imóvel *</Label>
            <Select value={formData.tipo} onValueChange={(value) => onInputChange('tipo', value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="terreno">Terreno</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
                 <SelectItem value="cobertura">Cobertura</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status" className="text-slate-300">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => onInputChange('status', value)}>
              <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Disponível">Disponível</SelectItem>
                <SelectItem value="Vendido">Vendido</SelectItem>
                <SelectItem value="Alugado">Alugado</SelectItem>
                <SelectItem value="Reservado">Reservado</SelectItem>
                <SelectItem value="Indisponível">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
         <div className="space-y-2">
          <Label htmlFor="descricao" className="text-slate-300">Descrição</Label>
          <Textarea id="descricao" value={formData.descricao} onChange={(e) => onInputChange('descricao', e.target.value)} placeholder="Descreva as características e diferenciais do imóvel..." className="bg-slate-800 border-slate-600 min-h-[120px]" />
        </div>
  {/* tags moved to Details tab */}
      </CardContent>
    </Card>
  </div>
  );
};

export default PropertyFormBasicInfo;
