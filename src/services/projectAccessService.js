const API_URL = "/api/agent_project_access.php";
export const projectAccessService = {
  async get(agentId){ if(!agentId) return []; const r=await fetch(`${API_URL}?agent_id=${agentId}`); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async set(agentId, projectIds, canEditDefault=0){ const r=await fetch(`${API_URL}?agent_id=${agentId}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({project_ids:projectIds, can_edit_default:canEditDefault})}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
};
