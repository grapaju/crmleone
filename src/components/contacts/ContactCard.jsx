import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Send, Phone, Mail } from 'lucide-react';

const ContactCard = ({ contact, onEdit, onDelete, onSendEmail, onSendWhatsApp }) => {
  const contactTypes = {
    broker: { label: 'Corretor', color: 'bg-purple-500/20 text-purple-400' },
    agency: { label: 'Imobiliária', color: 'bg-sky-500/20 text-sky-400' },
    other: { label: 'Outro', color: 'bg-slate-500/20 text-slate-400' }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="glass-effect border-slate-700 h-full flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl text-white mb-1">{contact.name}</CardTitle>
            <p className="text-sm text-slate-400">{contact.company}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white" align="end">
              <DropdownMenuItem onClick={() => onEdit(contact.id)} className="cursor-pointer focus:bg-slate-700">
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(contact.id)} className="cursor-pointer text-red-400 focus:bg-red-500/20 focus:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div className="space-y-3 mb-4">
             <div className="flex items-center space-x-3 text-slate-300">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{contact.email}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{contact.phone}</span>
            </div>
            <div>
              <Badge className={contactTypes[contact.type]?.color || contactTypes.other.color}>
                {contactTypes[contact.type]?.label || contactTypes.other.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="flex-1 border-slate-600 hover:bg-slate-700/50" onClick={() => onSendEmail(contact)}>
               <Mail className="mr-2 h-4 w-4"/> E-mail
             </Button>
             <Button variant="outline" size="sm" className="flex-1 border-green-600/50 bg-green-500/10 text-green-400 hover:bg-green-500/20" onClick={() => onSendWhatsApp(contact)}>
               <Send className="mr-2 h-4 w-4"/> WhatsApp
             </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ContactCard;