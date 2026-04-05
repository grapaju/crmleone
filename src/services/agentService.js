const API_URL = '/api/agents.php';

// Função auxiliar para formatar telefone
const formatPhone = (value) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else {
    return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }
};

export const agentService = {
    async getAgents() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Erro ao buscar agentes');
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    async getAgentById(id) {
        try {
            if (id === undefined || id === null || String(id).trim() === '') return null;
            const safeId = encodeURIComponent(String(id));
            const response = await fetch(`${API_URL}?id=${safeId}`);
            if (!response.ok) throw new Error('Erro ao buscar agente');
            const data = await response.json();
            if (!data) return null;

            const agent = Array.isArray(data) ? data[0] : data;

            return {
                id: agent.id || agent.ID || null,
                name: agent.name || agent.nome || '',
                email: agent.email || '',
                phone: formatPhone(agent.phone || ''), // já formatado
                document: agent.document || '',
                status: agent.status || 'Ativo',
                role: agent.role || 'agente',
                password: '',
                specialties: agent.specialties || [],
                sales: agent.sales || 0,
                revenue: agent.revenue || 0,
                leads: agent.leads || 0,
                rating: agent.rating || 0,
                photo: agent.photo || '',
                joinDate: agent.joinDate || ''
            };
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async saveAgent(agentData) {
        try {
            const method = agentData.id ? 'PUT' : 'POST';
            const response = await fetch(API_URL, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agentData),
            });
            if (!response.ok) throw new Error('Erro ao salvar agente');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async deleteAgent(id) {
        try {
            const response = await fetch(`${API_URL}?id=${id}`, {
                method: 'DELETE',
            });
            return response.ok;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
};
