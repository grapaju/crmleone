import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { documentService } from '@/services/documentService';
import DocumentStats from '@/components/documents/DocumentStats';
import DocumentFilters from '@/components/documents/DocumentFilters';
import DocumentList from '@/components/documents/DocumentList';
import DocumentAlerts from '@/components/documents/DocumentAlerts';
import EmptyState from '@/components/documents/EmptyState';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const load = async () => {
      const propertyIdFromQuery = searchParams.get('propertyId');
      if (propertyIdFromQuery) {
        setPropertyFilter(propertyIdFromQuery);
      }
      const docs = await documentService.getDocuments();
      setDocuments(docs || []);
    };
    load();
  }, [searchParams]);

  const handleDelete = async (id) => {
    const ok = await documentService.deleteDocument(id);
    if (ok) {
      const docs = await documentService.getDocuments();
      setDocuments(docs || []);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.property.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesProperty = propertyFilter === 'all' || doc.propertyId.toString() === propertyFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesProperty;
  });

  const expiringDocuments = documents.filter(doc => doc.status === 'Vencendo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Documentos</h1>
          <p className="text-slate-400">Organize e controle documentos dos imóveis</p>
        </div>
        <Link to="/documents/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documento
          </Button>
        </Link>
      </div>

      <DocumentStats documents={documents} />

      <DocumentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        propertyFilter={propertyFilter}
        setPropertyFilter={setPropertyFilter}
      />

      <div className="space-y-6">
        {filteredDocuments.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title="Nenhum documento encontrado"
            message={
              searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || propertyFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece fazendo upload do primeiro documento'
            }
            actionButton={
              <Link to="/documents/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Documento
                </Button>
              </Link>
            }
          />
        ) : (
          <DocumentList documents={filteredDocuments} onDelete={handleDelete} />
        )}
      </div>

      {expiringDocuments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <DocumentAlerts documents={expiringDocuments} />
        </motion.div>
      )}
    </div>
  );
};

export default Documents;