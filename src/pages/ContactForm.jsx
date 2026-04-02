import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, User, Building, Mail, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { contactService } from '@/services/contactService';



const ContactForm = () => {
  const [contact, setContact] = useState({
    name: '',
    imobiliaria_id: '',
    email: '',
    phone: '',
    type: 'corretor',
    notes: '',
  });
  const [imobiliarias, setImobiliarias] = useState([]);
  const [showNewImobiliaria, setShowNewImobiliaria] = useState(false);
  const [newImobiliaria, setNewImobiliaria] = useState('');
  // Função para aplicar máscara de telefone manualmente
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length > 10) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (numbers.length > 0) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    }
    return "";
  };
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();


  useEffect(() => {
  async function fetchData() {
    setLoading(true);
    try {
      // Carrega imobiliárias primeiro
      const imobs = await fetch('http://localhost/v4/api/php-api-crm/public/imobiliarias.php').then(r => r.json());
      setImobiliarias(imobs);


      if (id) {
        const existingContact = await contactService.getContactById(id);
        if (existingContact) {
          // Garante que imobiliaria_id seja string
          setContact({
            ...existingContact,
            imobiliaria_id: existingContact.imobiliaria_id ? String(existingContact.imobiliaria_id) : ''
          });
        }
      }
    } catch {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações.",
        variant: "destructive"
      });
    }
    setLoading(false);
  }
  fetchData();
  // eslint-disable-next-line
}, [id, toast]);






  // Função para cadastrar nova imobiliária
  const handleAddImobiliaria = async () => {
    if (!newImobiliaria.trim()) return;
    // Salva na API
    const response = await fetch('http://localhost/v4/api/php-api-crm/public/imobiliarias.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newImobiliaria }),
    });
    const saved = await response.json();
    if (saved && saved.id) {
      setImobiliarias([...imobiliarias, saved]);
      setContact(prev => ({ ...prev, imobiliaria_id: saved.id }));
      setShowNewImobiliaria(false);
      setNewImobiliaria('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setContact(prev => ({ ...prev, phone: formatPhone(value) }));
    } else {
      setContact(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (value) => {
    setContact(prev => ({ ...prev, type: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSend = {
    ...contact,
    imobiliaria_id: contact.imobiliaria_id || null
  };
  
    try {
      if (id) {
        await contactService.updateContact(id, contact);
        toast({
          title: "✅ Contato Atualizado",
          description: "As informações do contato foram salvas com sucesso.",
        });
      } else {
        await contactService.addContact(contact);
        toast({
          title: "🎉 Novo Contato Criado",
          description: "O contato foi adicionado à sua lista.",
        });
      }
      navigate('/contacts');
    } catch (error) {
      toast({
        title: "Erro ao salvar contato",
        description: "Não foi possível salvar o contato.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold text-white ml-2">
          {id ? 'Editar Contato' : 'Novo Contato'}
        </h1>
      </div>

      <Card className="glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Informações do Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div className="grid md:grid-cols-2 gap-6" variants={itemVariants}>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="name" name="name" value={contact.name} onChange={handleChange} required className="pl-9 bg-slate-800 border-slate-600" placeholder="Nome do contato"/>
                </div>
              </div>
             <div className="space-y-2">
      <Label htmlFor="imobiliaria_id" className="text-slate-300">Empresa / Imobiliária</Label>
      <div className="relative flex gap-2">
       <Select
    value={contact.imobiliaria_id ? String(contact.imobiliaria_id) : ''}

  onValueChange={value => {
    if (value === 'nova') {
      setShowNewImobiliaria(true);
    } else {
      setContact(prev => ({ ...prev, imobiliaria_id: value }));
      setShowNewImobiliaria(false);
    }
  }}
>
  <SelectTrigger className="bg-slate-800 border-slate-600">
    <SelectValue placeholder="Selecione ou cadastre uma imobiliária" />
  </SelectTrigger>
  <SelectContent className="bg-slate-800 border-slate-700 text-white">
    {imobiliarias.map(imob => (
      <SelectItem key={imob.id} value={String(imob.id)}>{imob.name}</SelectItem>
    ))}
    <SelectItem value="nova">+ Cadastrar nova imobiliária</SelectItem>
  </SelectContent>
</Select>
        {showNewImobiliaria && (
          <div className="flex gap-2 mt-2 w-full">
            <Input
              value={newImobiliaria}
              onChange={e => setNewImobiliaria(e.target.value)}
              placeholder="Nome da nova imobiliária"
              className="bg-slate-800 border-slate-600"
            />
            <Button type="button" onClick={handleAddImobiliaria} className="bg-green-600 hover:bg-green-700 text-white">
              Salvar
            </Button>
          </div>
        )}
      </div>
    </div>
            </motion.div>
            
            <motion.div className="grid md:grid-cols-2 gap-6" variants={itemVariants}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="email" name="email" type="email" value={contact.email} onChange={handleChange} required className="pl-9 bg-slate-800 border-slate-600" placeholder="contato@empresa.com"/>
                </div>
              </div>
<div className="space-y-2">
  <Label htmlFor="phone" className="text-slate-300">Telefone / WhatsApp</Label>
  <div className="relative">
    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <Input
      id="phone"
      name="phone"
      value={contact.phone}
      onChange={handleChange}
      required
      className="pl-9 bg-slate-800 border-slate-600"
      placeholder="(99) 99999-9999"
      maxLength={15}
      inputMode="tel"
    />
  </div>
</div>
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="type" className="text-slate-300">Tipo de Contato</Label>
              <Select onValueChange={handleSelectChange} value={contact.type}>
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="corretor">Corretor Parceiro</SelectItem>
                  <SelectItem value="imobiliaria">Imobiliária Parceira</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div className="flex justify-end pt-4" variants={itemVariants}>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                <Save className="mr-2 h-4 w-4" /> Salvar Contato
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ContactForm;