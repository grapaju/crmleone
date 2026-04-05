import { toast } from "@/components/ui/use-toast";
import { propertyService } from './propertyService';
import { agentService } from './agentService';

const API_URL =
  "/api/documents.php";

const safeJson = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Erro na resposta da API");
  }
  return res.json();
};

export const documentService = {
  async getDocuments() {
    try {
  const r = await fetch(API_URL, { credentials: 'include' });
      const data = await safeJson(r);
      if (!Array.isArray(data)) return [];

      // Enrich documents with property title and agent name
      const docs = await Promise.all(data.map(async (d) => {
        const property = d.property_id ? await propertyService.getPropertyById(d.property_id) : null;
        const agent = d.uploaded_by ? await agentService.getAgentById(d.uploaded_by) : null;
        return {
          id: d.id,
          name: d.title || '',
          description: d.description || '',
          status: d.status || null,
          category: d.category || '',
          type: d.type || '',
          file_path: d.file_path || '',
          propertyId: d.property_id || null,
          property: property?.title || d.property || '',
          uploadDate: d.created_at || d.uploadDate || null,
          expiryDate: d.expiryDate || null,
          uploadedBy: agent ? (agent.name || agent.nome || '') : (d.uploadedBy || ''),
          // keep original raw fields if needed
          raw: d,
        };
      }));

      return docs;
    } catch (err) {
      console.error("getDocuments", err);
      return [];
    }
  },

  async getDocumentById(id) {
    try {
      if (id === undefined || id === null || String(id).trim() === "")
        return null;
  const r = await fetch(`${API_URL}?id=${encodeURIComponent(String(id))}`, { credentials: 'include' });
      const data = await safeJson(r);
      const d = Array.isArray(data) ? data[0] : data;
      if (!d) return null;

      const property = d.property_id ? await propertyService.getPropertyById(d.property_id) : null;
      const agent = d.uploaded_by ? await agentService.getAgentById(d.uploaded_by) : null;

      return {
        id: d.id,
        name: d.title || '',
        description: d.description || '',
  status: d.status || null,
        category: d.category || '',
        type: d.type || '',
        file_path: d.file_path || '',
        propertyId: d.property_id || null,
        property: property?.title || d.property || '',
        uploadDate: d.created_at || d.uploadDate || null,
        expiryDate: d.expiryDate || null,
        uploadedBy: agent ? (agent.name || agent.nome || '') : (d.uploadedBy || ''),
        raw: d,
      };
    } catch (err) {
      console.error("getDocumentById", err);
      return null;
    }
  },

  async getDocumentsByPropertyId(propertyId) {
    try {
      if (
        propertyId === undefined ||
        propertyId === null ||
        String(propertyId).trim() === ""
      )
        return [];
      const r = await fetch(
        `${API_URL}?propertyId=${encodeURIComponent(String(propertyId))}`,
        { credentials: 'include' }
      );
      return await safeJson(r);
    } catch (err) {
      console.error("getDocumentsByPropertyId", err);
      return [];
    }
  },

  async saveDocument(documentData) {
    try {
      const isForm = typeof FormData !== 'undefined' && documentData instanceof FormData;
      const method = documentData.id && !isForm ? "PUT" : "POST";
      let url = documentData.id ? `${API_URL}?id=${encodeURIComponent(String(documentData.id))}` : API_URL;

      let fetchOptions = { method };

      if (isForm) {
        // If updating with FormData, many servers/clients don't populate $_FILES for PUT.
        // Use POST with _method=PUT override and include id in query string when updating.
        if (documentData.get('id')) {
          url = `${API_URL}?id=${encodeURIComponent(String(documentData.get('id')))}`;
          documentData.set('_method', 'PUT');
        }
        fetchOptions.body = documentData; // browser will set Content-Type boundary
      } else {
        fetchOptions.headers = { "Content-Type": "application/json" };
        fetchOptions.body = JSON.stringify(documentData);
      }

  const r = await fetch(url, { ...fetchOptions, credentials: 'include' });
      const res = await safeJson(r);
      toast({
        title: "✅ Documento salvo",
        description: "Operação concluída com sucesso.",
      });
      return res;
    } catch (err) {
      console.error("saveDocument", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o documento.",
        variant: "destructive",
      });
      return null;
    }
  },

  async deleteDocument(id) {
    try {
  const r = await fetch(`${API_URL}?id=${encodeURIComponent(String(id))}`, {
        method: "DELETE",
        credentials: 'include',
      });
      if (!r.ok) throw new Error("Erro ao excluir");
      toast({
        title: "🗑️ Documento Excluído",
        description: "O documento foi removido do sistema.",
      });
      return true;
    } catch (err) {
      console.error("deleteDocument", err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento.",
        variant: "destructive",
      });
      return false;
    }
  },
};
