import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ContactFilters = ({ contacts, setFilteredContacts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let result = contacts;

    if (searchTerm) {
      result = result.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(contact => contact.type === typeFilter);
    }

    setFilteredContacts(result);
  }, [searchTerm, typeFilter, contacts, setFilteredContacts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
      <Input
        placeholder="Buscar por nome ou empresa..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="bg-slate-700 border-slate-600 text-white"
      />
      <Select onValueChange={setTypeFilter} value={typeFilter}>
        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white">
          <SelectItem value="all">Todos os Tipos</SelectItem>
          <SelectItem value="broker">Corretor Parceiro</SelectItem>
          <SelectItem value="agency">Imobiliária Parceira</SelectItem>
          <SelectItem value="other">Outro</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ContactFilters;