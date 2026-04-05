import { activityService } from './activityService';
import { appointmentService } from './appointmentService';
import { propertyService } from './propertyService';
import { differenceInDays } from 'date-fns';

const API_URL = '/api/leads.php';

const calculateLeadScore = async (lead) => {
  let score = 0;
  const activities = activityService.getActivitiesForProperty(lead.relatedPropertyId) || [];
  const appointments = (await appointmentService.getAppointmentsByPropertyId(lead.relatedPropertyId)) || [];
  const relatedProperty = await propertyService.getPropertyById(lead.relatedPropertyId);

  // Visitas
  const visitCount = (appointments || []).filter(
    a => a && a.type === 'Visita' && (a.client === lead.name || a.leadId === lead.id)
  ).length;
  if (visitCount === 1) score += 20;
  else if (visitCount === 2) score += 40;
  else if (visitCount >= 3) score += 60;

  // Interações
  const interactionCount = activities.filter(act => act.agentName === lead.agent).length;
  if (interactionCount >= 1 && interactionCount <= 2) score += 10;
  else if (interactionCount >= 3 && interactionCount <= 5) score += 20;
  else if (interactionCount >= 6) score += 30;

  // Orçamento
  if (relatedProperty && lead.budget) {
    const propertyValue = relatedProperty.price || relatedProperty.valor || 0;
    if (propertyValue > 0) {
      const budgetRatio = lead.budget / propertyValue;
      if (budgetRatio < 0.5) score -= 20;
      else if (budgetRatio >= 0.5 && budgetRatio < 0.8) score += 10;
      else if (budgetRatio >= 0.8) score += 30;
    }
  } else if (!lead.budget) {
    score -= 10; // Orçamento não informado
  }

  // Proposta e Documentação
  if (activities.some(a => a.type === 'Proposta')) score += 50;
  if (lead.status === 'Documentação Fornecida') score += 40;

  // Tempo de resposta
  if (lead.history?.responseTime < 24) score += 15;
  else if (lead.history?.responseTime >= 24 && lead.history?.responseTime <= 48) score += 5;
  else if (lead.history?.responseTime > 48) score -= 10;

  // Perfil do cliente
  if (relatedProperty?.city === lead.location) score += 10;
  if (relatedProperty?.type === lead.interest) score += 10;
  if (lead.history?.purchases > 0) score += 20;

  // Reserva
  if (lead.status === 'Reservado' || relatedProperty?.status === 'Reservado') score += 60;

  // Penalizações
  if (lead.lastContact) {
    try {
      const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContact));
      if (daysSinceLastContact > 30) score -= 30;
    } catch {
      // ignora se lastContact inválido
    }
  }

  return Math.max(0, Math.min(100, score));
};

export const leadService = {
  async getLeads() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Erro ao buscar leads');
      const data = await res.json();

      // 🔒 Garante que sempre retorna array
      if (Array.isArray(data)) return data;
      // common wrapper shapes
      if (data && Array.isArray(data.leads)) return data.leads;
      if (data && Array.isArray(data.value)) return data.value;
      if (data && Array.isArray(data.data)) return data.data;
      // sometimes API returns object with a nested property name
      // otherwise try to find first array in the response
      for (const key of Object.keys(data || {})) {
        if (Array.isArray(data[key])) return data[key];
      }
      return [];
    } catch (err) {
      console.error('Erro em getLeads:', err);
      return [];
    }
  },

  async getLeadsWithScore() {
    const leads = await this.getLeads();
    if (!Array.isArray(leads)) return [];
    const withScores = await Promise.all((leads || []).map(async (lead) => {
      // Use score from API when present and numeric, otherwise compute it
      let rawScore = lead?.score;
      let score;
      if (rawScore === undefined || rawScore === null || Number.isNaN(Number(rawScore))) {
        score = await calculateLeadScore(lead);
      } else {
        score = Number(rawScore);
      }
      // Clamp between 0 and 100
      score = Math.max(0, Math.min(100, score));
      return { ...lead, score };
    }));
    return withScores;
  },

  async getLeadById(id) {
    try {
  if (id === undefined || id === null || String(id).trim() === '') return null;
  const safeId = encodeURIComponent(String(id));
  const res = await fetch(`${API_URL}?id=${safeId}`);
  if (!res.ok) return null;
  const data = await res.json();
  // Accept array or wrapper shapes
  let item = null;
  if (Array.isArray(data)) item = data[0] ?? null;
  else if (data && Array.isArray(data.value)) item = data.value[0] ?? null;
  else if (data && Array.isArray(data.data)) item = data.data[0] ?? null;
  else item = data;
  if (item && item.id) {
    // Prefer API score if available, otherwise compute
    const rawScore = item?.score;
    const score = (rawScore === undefined || rawScore === null || Number.isNaN(Number(rawScore)))
      ? await calculateLeadScore(item)
      : Number(rawScore);
    return { ...item, score: Math.max(0, Math.min(100, score)) };
  }
  return null;
    } catch (err) {
      console.error('Erro em getLeadById:', err);
      return null;
    }
  },

  async saveLead(leadData) {
    try {
      const method = leadData.id ? 'PUT' : 'POST';
      const res = await fetch(API_URL, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });
      if (!res.ok) throw new Error('Erro ao salvar lead');
      return await res.json();
    } catch (err) {
      console.error('Erro em saveLead:', err);
      throw err;
    }
  },

  async deleteLead(id) {
    try {
      const res = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover lead');
      return await res.json();
    } catch (err) {
      console.error('Erro em deleteLead:', err);
      throw err;
    }
  },

  async updateLeadStage(id, updates = {}) {
    try {
      if (id === undefined || id === null) throw new Error('Invalid id');
      const url = `${API_URL}?id=${encodeURIComponent(String(id))}`;
      const body = JSON.stringify(updates);
      // Prefer PATCH if supported, fallback to PUT
      let res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      }
      if (!res.ok) throw new Error('Erro ao atualizar stage');
      return await res.json();
    } catch (err) {
      console.error('Erro em updateLeadStage:', err);
      throw err;
    }
  },

  // Mockados
  getLeadFromHistory(leadId) {
    return {};
  },

  updateLeadHistory(lead) {
    // implementar se necessário
  },
};
