
import React, { useState, useEffect } from 'react';
import { unitTypeService } from '@/services/unitTypeService';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Trash2, Edit, Loader2 } from 'lucide-react';

const UnitForm = ({ unit, onSave, onRemove, towers = [], isDeleting = false }) => {
    const [isEditing, setIsEditing] = useState(unit.isEditing || false);
        const [unitData, setUnitData] = useState(unit);
        const [errors, setErrors] = useState({});
    const [valorInput, setValorInput] = useState(unit.valor != null ? Number(unit.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    const [areaInput, setAreaInput] = useState(unit.area_privativa != null && unit.area_privativa !== '' ? Number(unit.area_privativa).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    const [unitTypes, setUnitTypes] = useState([]);
    const [loadingTypes, setLoadingTypes] = useState(false);

        useEffect(() => {
            // keep valorInput in sync when unit prop changes
            setValorInput(unit.valor != null ? Number(unit.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
            setUnitData(unit);
            setAreaInput(unit.area_privativa != null && unit.area_privativa !== '' ? Number(unit.area_privativa).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
        }, [unit]);

    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            setLoadingTypes(true);
            try{
                const r = await unitTypeService.list();
                const list = r?.data || r;
                if(!cancelled && Array.isArray(list)) setUnitTypes(list);
            }catch(e){ /* silencioso */ }
            finally{ if(!cancelled) setLoadingTypes(false); }
        })();
        return ()=>{ cancelled=true; };
    },[]);

    const applyUnitType = (typeId) => {
        if(!typeId){
            handleInputChange('unit_type_id', null);
            return;
        }
        const t = unitTypes.find(t=> String(t.id)===String(typeId));
        handleInputChange('unit_type_id', typeId);
        if(t){
            if(t.area!=null){
                handleInputChange('area_privativa', t.area);
                setAreaInput(Number(t.area).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}));
            }
            if(t.parking_spots!=null) handleInputChange('parking', t.parking_spots);
            if(t.bedrooms!=null){
                const bd = parseInt(t.bedrooms); // se vier '2 suítes', mantém original
                handleInputChange('bedrooms', isNaN(bd)? t.bedrooms : bd);
            }
            if(t.base_price!=null && (unit.valor==null || unit.valor===0)){
                handleInputChange('valor', t.base_price);
                setValorInput(Number(t.base_price).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}));
            }
        }
    }

    const handleInputChange = (field, value) => {
        setUnitData(prev => ({...prev, [field]: value}));
    }

    const handleSave = () => {
    // validação simples
    const newErrors = {};
    if (!unitData.numero_unidade || String(unitData.numero_unidade).trim() === '') newErrors.numero_unidade = 'Número da unidade é obrigatório';
    const val = Number(unitData.valor);
    if (isNaN(val) || val <= 0) newErrors.valor = 'Valor deve ser maior que zero';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({...unitData, isEditing: false});
    setIsEditing(false);
    }
    
        if(!isEditing) {
        return (
             <Card className="p-2 mb-2 bg-slate-800/50 border-slate-700">
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 items-center">
                    <span className="truncate text-sm font-semibold">{unitData.numero_unidade}</span>
                                        <span className="truncate text-sm text-slate-300">{unitData.tipo}</span>
                                        <span className="truncate text-sm text-slate-300">{(towers.find(t => String(t.id) === String(unitData.torre_id)) || towers.find(t => String(t.id) === String(unitData.tower_id)))?.name ?? ''}</span>
                    <span className="truncate text-sm text-slate-300">{unitData.area_privativa}m²</span>
                    <span className="truncate text-xs text-slate-400">{unitData.bedrooms != null ? `${unitData.bedrooms}Q` : ''}</span>
                    <span className="truncate text-xs text-slate-400">{unitData.parking != null ? `${unitData.parking}V` : ''}</span>
                    <span className="truncate text-sm font-bold text-blue-400 col-span-2 lg:col-span-1">R$ {Number(unitData.valor).toLocaleString('pt-BR')}</span>
                    <span className="truncate text-sm text-slate-300 capitalize hidden lg:block">{unitData.status_venda}</span>
                    <div className="flex justify-end space-x-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)} disabled={isDeleting}><Edit className="w-3 h-3"/></Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(unit.id)} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin text-red-400"/> : <Trash2 className="w-3 h-3 text-red-400"/>}
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 mb-2 bg-slate-900/50 border-blue-500/50">
                        <div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
                                {towers && towers.length > 0 && (
                                    <Select value={String(unitData.torre_id ?? unitData.tower_id ?? '__none__')} onValueChange={value => handleInputChange('torre_id', value === '__none__' ? '' : value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Sem Torre</SelectItem>
                                            {towers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name ?? t.nome ?? `Torre ${t.id}`}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Input placeholder="Unidade (Ex: 101)" value={unitData.numero_unidade} onChange={e => handleInputChange('numero_unidade', e.target.value)} />
                                <div className="flex flex-col gap-1">
                                    <Select value={unitData.unit_type_id ? String(unitData.unit_type_id) : '__none__'} onValueChange={val=>{ if(val==='__none__'){ applyUnitType(null);} else { applyUnitType(val);} }}>
                                        <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder={loadingTypes? 'Carregando tipos...' : 'Tipo (definir)'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Sem Tipo (livre)</SelectItem>
                                            {unitTypes.map(t=> (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.position} | {t.bedrooms} | {t.area}m² {t.base_price? 'R$'+Number(t.base_price).toLocaleString('pt-BR'):''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input placeholder="Tipo Livre (Ex: 2Q)" value={unitData.tipo || ''} onChange={e => handleInputChange('tipo', e.target.value)} className="h-8 text-xs" />
                                </div>
                <Input placeholder="Valor (R$)" type="text" value={valorInput} onChange={e => { setValorInput(e.target.value); }} onBlur={e => {
                    // parsear entrada para número e armazenar em unitData.valor
                    const raw = String(e.target.value || '').replace(/[^0-9,\.]/g, '').replace(/\./g, '').replace(',', '.');
                    const parsed = parseFloat(raw);
                    if (!isNaN(parsed)) {
                        handleInputChange('valor', parsed);
                        setValorInput(parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    } else {
                        handleInputChange('valor', '');
                        setValorInput('');
                    }
                }} />
                                <Input placeholder="Área (m²)" type="text" value={areaInput}
                                             onChange={e => {
                                                 // permite apenas dígitos, vírgula e ponto na digitação
                                                 const raw = e.target.value;
                                                 const cleaned = raw.replace(/[^0-9.,]/g, '');
                                                 setAreaInput(cleaned);
                                             }}
                                             onBlur={e => {
                                                 const raw = e.target.value;
                                                 const normalized = raw.replace(/\./g,'').replace(/,/g,'.');
                                                 const num = parseFloat(normalized);
                                                 if (!isNaN(num)) {
                                                     handleInputChange('area_privativa', num);
                                                     setAreaInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                                 } else {
                                                     handleInputChange('area_privativa', '');
                                                     setAreaInput('');
                                                 }
                                             }} />
                <Input placeholder="Dorms" type="number" value={unitData.bedrooms ?? ''} onChange={e => handleInputChange('bedrooms', e.target.value)} />
                <Input placeholder="Vagas" type="number" value={unitData.parking ?? ''} onChange={e => handleInputChange('parking', e.target.value)} />
                <Select value={String(unitData.status_venda || 'disponível')} onValueChange={value => handleInputChange('status_venda', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="disponível">Disponível</SelectItem>
                        <SelectItem value="reservado">Reservado</SelectItem>
                        <SelectItem value="vendido">Vendido</SelectItem>
                        <SelectItem value="em negociação">Em Negociação</SelectItem>
                    </SelectContent>
                </Select>
                {errors.numero_unidade && <p className="text-red-400 text-sm mt-1">{errors.numero_unidade}</p>}
            </div>
             <div className="flex justify-end space-x-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => { setUnitData(unit); setIsEditing(false); }} disabled={isDeleting}>Cancelar</Button>
                <Button type="button" size="sm" onClick={handleSave} disabled={isDeleting}><Save className="w-4 h-4 mr-2"/> Salvar Unidade</Button>
            </div>
        </Card>
    );
};

export default UnitForm;
