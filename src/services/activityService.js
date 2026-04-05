const API_URL = '/api/activities.php';

async function parseJsonSafe(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Resposta JSON inválida: ${text}`);
    }
  }
  return text;
}

const localKey = 'imovel_crm_activities';
const localGet = () => {
  try {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};
const localSave = (arr) => {
  try { localStorage.setItem(localKey, JSON.stringify(arr)); } catch (_) {}
};

const getActivities = async () => {
  const r = await fetch(API_URL);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || 'Erro ao buscar atividades');
  }
  const res = await parseJsonSafe(r);
  // API pode retornar array direto ou embrulhar em { data: [...] } / { value: [...] }
  let items = null;
  if (Array.isArray(res)) items = res;
  else if (res && Array.isArray(res.value)) items = res.value;
  else if (res && Array.isArray(res.data)) items = res.data;
  else if (res && Array.isArray(res.items)) items = res.items;
  else if (res && res.item) items = Array.isArray(res.item) ? res.item : [res.item];
  else items = res;

  // normalize each item if it's an array
  if (Array.isArray(items)) return items.map(normalizeActivity);
  return normalizeActivity(items);
};

const getActivitiesForProperty = async (propertyId) => {
  try {
    const all = await getActivities();
    return (all || []).filter(a => String(a.propertyId ?? a.property_id ?? '') === String(propertyId));
  } catch (e) {
    // fallback to local storage
    const all = localGet();
    return (all || []).filter(a => String(a.propertyId ?? a.property_id ?? '') === String(propertyId));
  }
};

const addActivity = async (activityData) => {
  try {
    const payload = { ...activityData };
    // Attach timestamp on client side if not provided
    if (!payload.timestamp) payload.timestamp = new Date().toISOString();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const t = await response.text();
      throw new Error(t || 'Erro ao criar atividade');
    }
    const created = await parseJsonSafe(response);
    return normalizeActivity(created);
  } catch (e) {
    console.warn('API addActivity failed, using local fallback', e);
    // local fallback: persist in localStorage
    const all = localGet();
    const newActivity = { id: Date.now(), timestamp: new Date().toISOString(), ...activityData };
    const updated = [newActivity, ...all];
    localSave(updated);
    return newActivity;
  }
};

const getActivityById = async (id) => {
  if (id === undefined || id === null || String(id).trim() === '') return null;
  try {
    const safeId = encodeURIComponent(String(id));
    const r = await fetch(`${API_URL}?id=${safeId}`);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || 'Erro ao buscar atividade');
    }
    const res = await parseJsonSafe(r);
    let item = null;
    if (Array.isArray(res)) item = res[0] ?? null;
    else if (res && Array.isArray(res.value)) item = res.value[0] ?? null;
    else if (res && Array.isArray(res.data)) item = res.data[0] ?? null;
    else item = res;
    return normalizeActivity(item);
  } catch (e) {
    const all = localGet();
    return (all || []).map(normalizeActivity).find(a => String(a.id) === String(id)) ?? null;
  }
};

const updateActivity = async (id, activity) => {
  try {
    const payload = { ...activity };
    payload.id = id;
    const url = `${API_URL}?id=${encodeURIComponent(String(id))}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const t = await response.text();
      throw new Error(t || 'Erro ao atualizar atividade');
    }
    const updated = await parseJsonSafe(response);
    return normalizeActivity(updated);
  } catch (e) {
    console.warn('API updateActivity failed, using local fallback', e);
    // update local
    const all = localGet();
    const updated = (all || []).map(a => String(a.id) === String(id) ? { ...a, ...activity, id } : a);
    localSave(updated);
    return updated.find(a => String(a.id) === String(id)) ?? null;
  }
};

const deleteActivity = async (id) => {
  try {
    const url = `${API_URL}?id=${encodeURIComponent(String(id))}`;
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || 'Erro ao deletar atividade');
    }
    try { return await parseJsonSafe(r); } catch (_) { return true; }
  } catch (e) {
    console.warn('API deleteActivity failed, using local fallback', e);
    const all = localGet();
    const filtered = (all || []).filter(a => String(a.id) !== String(id));
    localSave(filtered);
    return true;
  }
};

const saveActivity = async (activity) => {
  if (activity && (activity.id || activity.ID)) {
    const id = activity.id ?? activity.ID;
    return updateActivity(id, activity);
  }
  return addActivity(activity);
};

// normalize API activity (DB shape) to frontend-friendly object
const normalizeActivity = (a) => {
  if (!a) return null;
  return {
    id: a.id ?? a.ID ?? null,
    title: a.title ?? a.name ?? a.titulo ?? a.subject ?? '',
    notes: a.notes ?? a.description ?? a.observacoes ?? a.notas ?? '',
    type: a.type ?? a.activity_type ?? 'Outro',
    timestamp: a.timestamp ?? a.created_at ?? a.createdAt ?? a.date ?? null,
    property_id: a.property_id ?? a.propertyId ?? a.imovel_id ?? null,
    propertyId: a.property_id ?? a.propertyId ?? null,
    // keep legacy property fields that UI might expect
    property_title: a.property_title ?? a.property_name ?? null,
    agent_id: a.agent_id ?? a.agentId ?? a.usuario_id ?? null,
    raw: a,
  };
};

export const activityService = {
  getActivitiesForProperty,
  addActivity,
  // expose raw fetch helpers if needed
  getActivities,
};