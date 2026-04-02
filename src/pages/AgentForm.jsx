import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Shield, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { agentService } from '@/services/agentService';
import { useAuth } from '@/contexts/AuthContext';

// Máscara de telefone
const formatPhone = (value) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else {
    return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }
};

const AgentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, updateUserContext } = useAuth();
  const isEditing = Boolean(id);
  const isSelfEdit = user && user.id.toString() === id;
  const canEditAll = user && user.role === 'admin';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    status: 'Ativo',
    role: 'agente',
    password: '',
    specialties: []
  });

  const specialtyOptions = [
    'Residencial', 'Comercial', 'Industrial', 'Rural', 'Luxo', 'Locação', 'Lançamentos'
  ];

  useEffect(() => {
    if (isEditing) {
      if (!canEditAll && !isSelfEdit) {
        toast({ title: "Acesso Negado", description: "Você não tem permissão para editar este usuário.", variant: "destructive" });
        navigate('/dashboard');
        return;
      }
      agentService.getAgentById(id).then(agent => {
        if (agent) {
          setFormData(agent); // já vem formatado
        } else {
          toast({ title: "Erro", description: "Usuário não encontrado.", variant: "destructive" });
          navigate(canEditAll ? '/agents' : '/dashboard');
        }
      });
    }
  }, [isEditing, id, navigate, canEditAll, isSelfEdit, toast]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.document) {
      toast({
        title: "❌ Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isEditing && !formData.password) {
      toast({
        title: "❌ Erro de Validação",
        description: "A senha é obrigatória para novos usuários.",
        variant: "destructive"
      });
      return;
    }
    
    agentService.saveAgent(formData).then(savedAgent => {
      if (isSelfEdit && savedAgent) updateUserContext(savedAgent);
      toast({
        title: isEditing ? "✅ Usuário Atualizado" : "✅ Usuário Cadastrado",
        description: isEditing 
          ? "As informações do usuário foram atualizadas com sucesso!"
          : "O novo usuário foi cadastrado com sucesso!"
      });
      navigate(canEditAll ? '/agents' : '/dashboard');
    });
  };

  const formTitle = canEditAll ? (isEditing ? 'Editar Usuário' : 'Cadastrar Novo Usuário') : 'Meu Perfil';
  const formDescription = canEditAll ? (isEditing ? 'Atualize as informações do usuário' : 'Preencha os dados do novo usuário') : 'Atualize suas informações de perfil';

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(canEditAll ? '/agents' : '/dashboard')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">{formTitle}</h1>
          <p className="text-slate-400">{formDescription}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Pessoais */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-effect border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="w-5 h-5 mr-2" />Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Nome Completo *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Ex: Carlos Silva" className="bg-slate-800 border-slate-600" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">E-mail *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="carlos@imovelcrm.com" className="bg-slate-800 border-slate-600" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Telefone *</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))} placeholder="(11) 99999-9999" className="bg-slate-800 border-slate-600" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document" className="text-slate-300">Documento *</Label>
                  <Input id="document" value={formData.document} onChange={(e) => handleInputChange('document', e.target.value)} placeholder="123456789" className="bg-slate-800 border-slate-600" required />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Acesso e Permissões */}
        {canEditAll && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-effect border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" /> Acesso e Permissões
                </CardTitle>
                <CardDescription>Defina o nível de acesso e a senha do usuário.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-slate-300">Nível de Acesso</Label>
                    <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                      <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agente">Agente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-slate-300">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Senha</Label>
                  <Input id="password" type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} placeholder={isEditing ? 'Deixe em branco para não alterar' : '••••••••'} className="bg-slate-800 border-slate-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Botões */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate(canEditAll ? '/agents' : '/dashboard')} className="border-slate-600 hover:bg-slate-700/50">Cancelar</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />{isEditing ? 'Salvar Alterações' : 'Cadastrar Usuário'}
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default AgentForm;
