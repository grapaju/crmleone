import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { contactService } from '@/services/contactService';
import ContactList from '@/components/contacts/ContactList';
import ContactFilters from '@/components/contacts/ContactFilters';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const allContacts = await contactService.getContacts();
      setContacts(allContacts);
      setFilteredContacts(allContacts);
    } catch (error) {
      toast({
        title: "Erro ao carregar contatos",
        description: "Não foi possível carregar os contatos da API.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await contactService.deleteContact(id);
      toast({
        title: "✅ Contato Removido",
        description: "O contato foi removido com sucesso.",
      });
      loadContacts();
    } catch (error) {
      toast({
        title: "Erro ao remover contato",
        description: "Não foi possível remover o contato.",
        variant: "destructive"
      });
    }
  };
  
  const handleSendEmail = (contact) => {
    window.location.href = `mailto:${contact.email}`;
  };
  
  const handleSendWhatsApp = (contact) => {
    const message = encodeURIComponent("Olá, estou entrando em contato através do sistema ImóvelCRM.");
    window.open(`https://api.whatsapp.com/send?phone=${contact.phone}&text=${message}`, '_blank');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex justify-between items-center" variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white">Contatos</h1>
        <Button onClick={() => navigate('/contacts/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Novo Contato
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ContactFilters contacts={contacts} setFilteredContacts={setFilteredContacts} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <ContactList 
          contacts={filteredContacts} 
          loading={loading}
          onDelete={handleDelete}
          onEdit={(id) => navigate(`/contacts/edit/${id}`)}
          onSendEmail={handleSendEmail}
          onSendWhatsApp={handleSendWhatsApp}
        />
      </motion.div>
    </motion.div>
  );
};

export default Contacts;