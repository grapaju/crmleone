import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PropertyFormLocation = ({ formData, onInputChange }) => {

  const handleCepSearch = async (cep) => {
    if (!cep) return;
    const raw = String(cep).replace(/\D/g, '');
    if (raw.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await response.json();
      if (!data.erro) {
        onInputChange('endereco', data.logradouro);
        onInputChange('bairro', data.bairro);
        onInputChange('cidade', data.localidade);
        onInputChange('estado', data.uf);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const formatCep = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return digits.slice(0, 5) + '-' + digits.slice(5);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center"><MapPin className="w-5 h-5 mr-2" /> Localização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="cep" className="text-slate-300">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => onInputChange('cep', formatCep(e.target.value))}
                  onBlur={(e) => handleCepSearch(e.target.value)}
                  placeholder="00000-000"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco" className="text-slate-300">Endereço *</Label>
            <Input id="endereco" value={formData.endereco} onChange={(e) => onInputChange('endereco', e.target.value)} placeholder="Rua das Flores" className="bg-slate-800 border-slate-600" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero" className="text-slate-300">Número</Label>
              <Input id="numero" value={formData.numero} onChange={(e) => onInputChange('numero', e.target.value)} placeholder="123" className="bg-slate-800 border-slate-600" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="complemento" className="text-slate-300">Complemento</Label>
              <Input id="complemento" value={formData.complemento} onChange={(e) => onInputChange('complemento', e.target.value)} placeholder="Apto 101, Bloco B" className="bg-slate-800 border-slate-600" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2">
                <Label htmlFor="bairro" className="text-slate-300">Bairro</Label>
                <Input id="bairro" value={formData.bairro} onChange={(e) => onInputChange('bairro', e.target.value)} placeholder="Centro" className="bg-slate-800 border-slate-600" />
              </div>
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-slate-300">Cidade</Label>
              <Input id="cidade" value={formData.cidade} onChange={(e) => onInputChange('cidade', e.target.value)} placeholder="São Paulo" className="bg-slate-800 border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-slate-300">Estado</Label>
              <Input id="estado" value={formData.estado} onChange={(e) => onInputChange('estado', e.target.value)} placeholder="SP" className="bg-slate-800 border-slate-600" />
            </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-slate-300">Latitude</Label>
              <Input id="latitude" type="number" step="any" value={formData.latitude} onChange={(e) => onInputChange('latitude', e.target.value)} placeholder="-23.550520" className="bg-slate-800 border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-slate-300">Longitude</Label>
              <Input id="longitude" type="number" step="any" value={formData.longitude} onChange={(e) => onInputChange('longitude', e.target.value)} placeholder="-46.633308" className="bg-slate-800 border-slate-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyFormLocation;