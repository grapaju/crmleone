const API_URL = "/api/unit_types.php";

async function parseJsonSafe(response){
  const text = await response.text();
  try { return JSON.parse(text); } catch(e){ throw new Error(text||'Resposta inválida'); }
}

export const unitTypeService = {
  async list(){
    const r = await fetch(API_URL);
    if(!r.ok) throw new Error('Erro ao listar tipos de unidade');
    return parseJsonSafe(r);
  },
  async get(id){
    const r = await fetch(`${API_URL}?id=${id}`);
    if(!r.ok) throw new Error('Erro ao obter tipo de unidade');
    return parseJsonSafe(r);
  },
  async save(data){
    const method = data.id ? 'PUT':'POST';
    const url = data.id ? `${API_URL}?id=${data.id}` : API_URL;
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)});
    if(!r.ok){ const t = await r.text(); throw new Error(t||'Erro ao salvar tipo'); }
    return parseJsonSafe(r);
  },
  async remove(id){
    const r = await fetch(`${API_URL}?id=${id}`, { method:'DELETE' });
    if(!r.ok) throw new Error('Erro ao remover tipo');
    return true;
  }
};
