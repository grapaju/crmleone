const API_URL = "/api/units.php";

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(text || "Resposta inesperada do servidor");
  }
}

const getUnits = async () => {
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error((await r.text()) || "Erro ao buscar unidades");
  return parseJsonSafe(r);
};

const getUnitsByProject = async (projectId) => {
  const response = await fetch(`${API_URL}?project_id=${projectId}`);
  if (!response.ok) throw new Error("Erro ao buscar unidades");
  return parseJsonSafe(response);
};

function mapToApi(u) {
  const isTemp = !u || !u.id || /^(new_|gen_|import_)/.test(String(u.id));
  const payload = {};
  if (u == null) return payload;
  if (!isTemp && /^[0-9]+$/.test(String(u.id))) payload.id = u.id; // only send numeric persisted ids
  // Project
  if (u.project_id) payload.obra_id = u.project_id;
  else if (u.obra_id) payload.obra_id = u.obra_id;
  if (payload.obra_id == null && u.projectId) payload.obra_id = u.projectId;
  // Tower
  if (u.tower_id) payload.torre_id = u.tower_id;
  else if (u.torre_id) payload.torre_id = u.torre_id;
  if (payload.torre_id == null && u.towerId) payload.torre_id = u.towerId;
  // Basic fields
  payload.numero_unidade = u.unit_number ?? u.numero_unidade ?? "";
  if (u.floor != null) payload.pavimento = u.floor;
  else if (u.pavimento != null) payload.pavimento = u.pavimento;
  payload.tipo = u.type ?? u.tipo ?? null;
  payload.area_privativa = u.area_private ?? u.area_privativa ?? null;
  payload.area_total =
    u.area_total ?? u.area_privativa ?? u.area_private ?? null;
  payload.status_venda = u.sale_status ?? u.status_venda ?? "disponível";
  payload.valor = u.price ?? u.valor ?? null;
  payload.caracteristicas_especificas =
    u.specific_features ?? u.caracteristicas_especificas ?? "";
  // CUB fields
  if (u.cubReferencia != null && u.cubReferencia !== "")
    payload.cubReferencia = u.cubReferencia;
  if (u.id_cubAtual != null && u.id_cubAtual !== "")
    payload.id_cubAtual = u.id_cubAtual;
  if (u.valor_atualizado != null) payload.valor_atualizado = u.valor_atualizado;
  if (u.floor_factor != null) payload.floor_factor = u.floor_factor;
  if (u.unit_type_id != null) payload.unit_type_id = u.unit_type_id;
  // Additional (optional)
  if (u.bedrooms != null) payload.dormitorios = u.bedrooms; // if backend expects maybe another name you can adjust
  if (u.parking != null) payload.vagas = u.parking;
  return payload;
}

function mapFromApi(u) {
  if (!u) return u;
  return {
    id: u.id ?? u.ID ?? null,
    project_id: u.obra_id ?? u.project_id ?? null,
    tower_id: u.torre_id ?? u.tower_id ?? null,
    unit_number: u.numero_unidade ?? u.unit_number ?? null,
    floor: u.pavimento ?? u.floor ?? null,
    type: u.tipo ?? u.type ?? null,
    area_private: u.area_privativa ?? u.area_private ?? null,
    area_total: u.area_total ?? null,
    sale_status: u.status_venda ?? u.sale_status ?? null,
    price: u.valor ?? u.price ?? null,
    specific_features:
      u.caracteristicas_especificas ?? u.specific_features ?? "",
    cubReferencia: u.cubReferencia ?? null,
    id_cubAtual: u.id_cubAtual ?? null,
    valor_atualizado: u.valor_atualizado ?? null,
  floor_factor: u.floor_factor ?? null,
  unit_type_id: u.unit_type_id ?? null,
    bedrooms: u.dormitorios ?? u.bedrooms ?? null,
    parking: u.vagas ?? u.parking ?? null,
    // Keep portuguese duplicates for existing UI compatibility
    obra_id: u.obra_id ?? u.project_id ?? null,
    torre_id: u.torre_id ?? u.tower_id ?? null,
    numero_unidade: u.numero_unidade ?? u.unit_number ?? null,
    pavimento: u.pavimento ?? u.floor ?? null,
    tipo: u.tipo ?? u.type ?? null,
    area_privativa: u.area_privativa ?? u.area_private ?? null,
    status_venda: u.status_venda ?? u.sale_status ?? null,
    valor: u.valor ?? u.price ?? null,
    caracteristicas_especificas:
      u.caracteristicas_especificas ?? u.specific_features ?? "",
    __raw: u,
  };
}

const saveUnit = async (unit) => {
  const apiPayload = mapToApi(unit);
  const hasId = apiPayload.id != null;
  const method = hasId ? "PUT" : "POST";
  const url = hasId ? `${API_URL}?id=${apiPayload.id}` : API_URL;

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiPayload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Erro ao salvar unidade");
    try {
      const parsed = JSON.parse(text);
      const msg = parsed.error || parsed.message || JSON.stringify(parsed);
      // fallback: se erro mencionar area_total ou coluna desconhecida, tenta sem esse campo
      if (/area_total/i.test(msg) && apiPayload.area_total !== undefined) {
        const retryPayload = { ...apiPayload };
        delete retryPayload.area_total;
        const retryRes = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(retryPayload),
        });
        if (!retryRes.ok) {
          const retryText = await retryRes.text().catch(() => msg);
          throw new Error(retryText || msg);
        }
        const retryJson = await parseJsonSafe(retryRes);
        const retryData =
          retryJson && retryJson.data ? retryJson.data : retryJson;
        return mapFromApi(retryData);
      }
      throw new Error(msg);
    } catch (_) {
      throw new Error(text || "Erro ao salvar unidade");
    }
  }
  const json = await parseJsonSafe(response);
  const data = json && json.data ? json.data : json;
  return mapFromApi(data);
};

const saveUnitsBulk = async (units = []) => {
  const results = [];
  for (const u of units) {
    try {
      const saved = await saveUnit(u);
      results.push({ ok: true, unit: saved });
    } catch (e) {
      results.push({ ok: false, error: e.message, unit: u });
    }
  }
  return results;
};

const deleteUnit = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Erro ao deletar unidade");
  return true;
};

// Recalcula valor_atualizado de todas as unidades com base no CUB vigente
const recomputeCub = async (towerId) => {
  const url = towerId
    ? `${API_URL}?action=recompute_cub&tower_id=${towerId}`
    : `${API_URL}?action=recompute_cub`;
  const response = await fetch(url, {
    method: "POST",
  });
  if (!response.ok) {
    const txt = await response.text().catch(() => "Erro ao recomputar CUB");
    throw new Error(txt || "Erro ao recomputar CUB");
  }
  return parseJsonSafe(response);
};

// Histórico CUB
const getCubHistory = async (unitId) => {
  const url = unitId
    ? `${API_URL}?action=cub_history&unit_id=${unitId}`
    : `${API_URL}?action=cub_history`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Erro ao buscar histórico CUB");
  return parseJsonSafe(r);
};

export const unitService = {
  getUnits,
  getUnitsByProject,
  saveUnit,
  saveUnitsBulk,
  deleteUnit,
  recomputeCub,
  getCubHistory,
  mapToApi,
  mapFromApi,
};
