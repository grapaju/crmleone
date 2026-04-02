import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sheet, Send, Clock, Repeat, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { salesTableService } from '@/services/salesTableService';
import SalesTableList from '@/components/sales-tables/SalesTableList';
import SalesHistory from '@/components/sales-tables/SalesHistory';
import SalesAutomations from '@/components/sales-tables/SalesAutomations';
import { useToast } from '@/components/ui/use-toast';

const SalesTables = () => {
  const [tables, setTables] = useState([]);
  const [history, setHistory] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = () => {
    // loadData is async (calls services that return Promises) so await them
    const doLoad = async () => {
      try {
        const tablesRes = await salesTableService.getTables();
        setTables(Array.isArray(tablesRes) ? tablesRes : []);
      } catch (err) {
        console.error('Error loading tables', err);
        setTables([]);
      }

      try {
        const historyRes = await salesTableService.getHistory();
        setHistory(Array.isArray(historyRes) ? historyRes : []);
      } catch (err) {
        console.error('Error loading history', err);
        setHistory([]);
      }

      try {
        const autosRes = await salesTableService.getAutomations();
        setAutomations(Array.isArray(autosRes) ? autosRes : []);
      } catch (err) {
        console.error('Error loading automations', err);
        setAutomations([]);
      }
    };

    doLoad();
  };

  useEffect(() => {
    loadData();
  const onAutoCreated = () => { loadData(); };
  window.addEventListener('automations:created', onAutoCreated);
  return () => { window.removeEventListener('automations:created', onAutoCreated); };
  }, []);

  const handleDeleteTable = (id) => {
    salesTableService.deleteTable(id);
    toast({
      title: "✅ Tabela Removida",
      description: "A tabela de vendas foi removida com sucesso.",
    });
    loadData();
  };
  
  const handleToggleAutomation = (id) => {
    salesTableService.toggleAutomationStatus(id);
    toast({
      title: "✅ Status da Automação Alterado",
      description: "A automação foi atualizada com sucesso.",
    });
    loadData();
  };

  const handleDeleteAutomation = (id) => {
    salesTableService.deleteAutomation(id);
    toast({
      title: "✅ Automação Removida",
      description: "A automação de envio foi removida com sucesso.",
    });
    loadData();
  };

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Tabelas de Vendas</h1>
          <p className="text-slate-400">Gerencie, envie e automatize suas tabelas de vendas.</p>
        </div>
        <Button onClick={() => navigate('/sales-tables/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Nova Tabela
        </Button>
      </div>

      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/80 border border-slate-700">
          <TabsTrigger value="tables"><Sheet className="w-4 h-4 mr-2" />Tabelas</TabsTrigger>
          <TabsTrigger value="history"><Clock className="w-4 h-4 mr-2" />Histórico de Envios</TabsTrigger>
          <TabsTrigger value="automations"><Repeat className="w-4 h-4 mr-2" />Automações</TabsTrigger>
        </TabsList>
        <TabsContent value="tables">
          <Card className="glass-effect border-slate-700 mt-4">
            <CardContent className="p-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome da tabela..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-700"
                    />
                </div>
              <SalesTableList 
                tables={filteredTables}
                onEdit={(id) => navigate(`/sales-tables/edit/${id}`)}
                onDelete={handleDeleteTable}
                onSend={(id) => navigate(`/sales-tables/send/${id}`)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card className="glass-effect border-slate-700 mt-4">
            <CardContent className="p-6">
              <SalesHistory history={history} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="automations">
          <Card className="glass-effect border-slate-700 mt-4">
            <CardContent className="p-6">
              <SalesAutomations 
                automations={automations} 
                onDelete={handleDeleteAutomation}
                onToggle={handleToggleAutomation}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SalesTables;