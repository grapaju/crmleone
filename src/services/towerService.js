const API_URL = '/api/towers.php';

function mapToApi(t) {
  // frontend shape: { id, name, floors, unitsPerFloor, project_id }
  // api expects: { id?, obra_id, nome, numero_andares, unidades_por_andar }
  const payload = {};
  if (t.id && !String(t.id).startsWith('new_')) payload.id = t.id;
  if (t.project_id) payload.obra_id = t.project_id;
  if (t.projectId) payload.obra_id = t.projectId;
  if (t.name) payload.nome = t.name;
  if (t.nome) payload.nome = t.nome;
  if (t.floors !== undefined) payload.numero_andares = t.floors;
  if (t.numero_andares !== undefined) payload.numero_andares = t.numero_andares;
  if (t.unitsPerFloor !== undefined) payload.unidades_por_andar = t.unitsPerFloor;
  if (t.unidades_por_andar !== undefined) payload.unidades_por_andar = t.unidades_por_andar;
  if (t.initialFloor !== undefined) payload.initial_floor = Number(t.initialFloor) || t.initialFloor;
  if (t.initialUnitStart !== undefined) payload.initial_unit_start = t.initialUnitStart;
  // new optional fields for generation hints
  if (t.typicalFloorsStart !== undefined) payload.typical_floors_start = Number(t.typicalFloorsStart) || t.typicalFloorsStart;
  if (t.typicalFloorsEnd !== undefined) payload.typical_floors_end = Number(t.typicalFloorsEnd) || t.typicalFloorsEnd;
  if (t.hasGround !== undefined) payload.has_ground = !!t.hasGround ? 1 : 0;
  if (t.hasPenthouse !== undefined) payload.has_penthouse = !!t.hasPenthouse ? 1 : 0;
  if (t.hasMezzanine !== undefined) payload.has_mezzanine = !!t.hasMezzanine ? 1 : 0;
  return payload;
}

function mapFromApi(t) {
  // api shape: { id, obra_id, nome, numero_andares, unidades_por_andar }
  return {
    id: t.id,
    project_id: t.obra_id ?? t.project_id ?? null,
    name: t.nome ?? t.name ?? '',
  floors: t.numero_andares ?? t.floors ?? '',
  // support both portuguese and english column names returned by API
  unitsPerFloor: t.unidades_por_andar ?? t.units_per_floor ?? t.unitsPerFloor ?? '',
    initialFloor: (t.initial_floor ?? t.initialFloor ?? ''),
    initialUnitStart: (t.initial_unit_start ?? t.initialUnitStart ?? ''),
    typicalFloorsStart: t.typical_floors_start ?? t.typicalFloorsStart ?? null,
    typicalFloorsEnd: t.typical_floors_end ?? t.typicalFloorsEnd ?? null,
    hasGround: !!(t.has_ground ?? t.hasGround ?? 0),
    hasPenthouse: !!(t.has_penthouse ?? t.hasPenthouse ?? 0),
    hasMezzanine: !!(t.has_mezzanine ?? t.hasMezzanine ?? 0),
    // keep original data for convenience
    __raw: t,
  };
}
 
const getTowersByProject = async (projectId) => {
  const response = await fetch(`${API_URL}?project_id=${projectId}`);
  if (!response.ok) throw new Error('Erro ao buscar torres');
  const json = await response.json();
  const data = json && json.data ? json.data : json;
  if (!Array.isArray(data)) return [];
  return data.map(mapFromApi);
};

const saveTower = async (tower) => {
  const isUpdate = tower.id && !String(tower.id).startsWith('new_');
  const method = isUpdate ? 'PUT' : 'POST';
  const url = isUpdate ? `${API_URL}?id=${tower.id}` : API_URL;

  const apiPayload = mapToApi(tower);
  // also include english-style key for compatibility with 'towers' schema
  if (apiPayload.unidades_por_andar !== undefined && apiPayload.units_per_floor === undefined) {
    apiPayload.units_per_floor = apiPayload.unidades_por_andar;
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Erro ao salvar torre');
    throw new Error(text || 'Erro ao salvar torre');
  }

  const json = await response.json().catch(() => null);
  const saved = json && json.data ? json.data : json;
  if (!saved) return null;
  return mapFromApi(saved);
};

const deleteTower = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const t = await response.text().catch(() => 'Erro ao deletar torre');
    throw new Error(t || 'Erro ao deletar torre');
  }
  return true;
};

export const towerService = {
  getTowersByProject,
  saveTower,
  deleteTower,
};
