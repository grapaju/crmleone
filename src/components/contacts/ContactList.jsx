import React from 'react';
import { motion } from 'framer-motion';
import ContactCard from './ContactCard';

const ContactList = ({ contacts, loading, onEdit, onDelete, onSendEmail, onSendWhatsApp }) => {

  const listVariants = {
    visible: { 
      transition: { 
        staggerChildren: 0.1 
      } 
    },
    hidden: {},
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 p-6 rounded-lg animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/50 rounded-lg">
        <h3 className="text-2xl font-semibold text-white">Nenhum Contato Encontrado</h3>
        <p className="text-slate-400 mt-2">Tente ajustar seus filtros ou adicione um novo contato.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      {contacts.map((contact) => (
        <ContactCard 
          key={contact.id} 
          contact={contact} 
          onEdit={onEdit} 
          onDelete={onDelete}
          onSendEmail={onSendEmail}
          onSendWhatsApp={onSendWhatsApp}
        />
      ))}
    </motion.div>
  );
};

export default ContactList;