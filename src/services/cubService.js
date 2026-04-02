const CUB_API = "http://localhost/v4/api/php-api-crm/public/cub.php";

async function parseJsonSafe(response){
  const text = await response.text();
  try { return JSON.parse(text); } catch(e){ throw new Error(text||'Resposta inválida CUB'); }
}

export const cubService = {
  async latest(){
    const r = await fetch(`${CUB_API}?latest=1`);
    if(!r.ok) throw new Error('Erro ao obter CUB');
    return parseJsonSafe(r);
  },
  async list(){
    const r = await fetch(CUB_API);
    if(!r.ok) throw new Error('Erro ao listar CUB');
    return parseJsonSafe(r);
  },
  async save({valorAtual, vigencia, variacao}){
    const r = await fetch(CUB_API, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({valorAtual, vigencia, variacao})
    });
    if(!r.ok){
      const txt = await r.text();
      throw new Error(txt||'Erro ao salvar CUB');
    }
    return parseJsonSafe(r);
  }
};
