const API_URL = "http://localhost/v4/api/php-api-crm/public/agent_unit_access.php";
export const unitAccessService = {
  async get(agentId){ if(!agentId) return []; const r=await fetch(`${API_URL}?agent_id=${agentId}`); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  async set(agentId, unitIds, canEditDefault=0){ const r=await fetch(`${API_URL}?agent_id=${agentId}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({unit_ids:unitIds, can_edit_default:canEditDefault})}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
};
