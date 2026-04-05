const API_URL = "/api/agent_property_access.php";

const getAccessiblePropertyIds = async (agentId) => {
  if (!agentId) return [];
  const r = await fetch(`${API_URL}?agent_id=${agentId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // array de ids
};

const setAccessiblePropertyIds = async (agentId, propertyIds, canEditDefault = 0) => {
  const r = await fetch(`${API_URL}?agent_id=${agentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ property_ids: propertyIds, can_edit_default: canEditDefault })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const propertyAccessService = {
  getAccessiblePropertyIds,
  setAccessiblePropertyIds,
};
