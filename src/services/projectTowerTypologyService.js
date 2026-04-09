const API_URL = "/api/project_tower_typologies.php";

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(text || "Resposta inválida");
  }
}

export const projectTowerTypologyService = {
  async listByContext(projectId, towerId) {
    if (!projectId) throw new Error("projectId é obrigatório");

    const params = new URLSearchParams({ project_id: String(projectId) });
    if (towerId != null && towerId !== "") params.set("tower_id", String(towerId));

    const r = await fetch(`${API_URL}?${params.toString()}`);
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(t || "Erro ao listar tipologias da obra/torre");
    }
    return parseJsonSafe(r);
  },

  async replaceByContext(projectId, towerId, typologies = []) {
    if (!projectId) throw new Error("projectId é obrigatório");
    if (!towerId) throw new Error("towerId é obrigatório");

    const r = await fetch(`${API_URL}?action=replace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: Number(projectId),
        tower_id: Number(towerId),
        typologies,
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(t || "Erro ao salvar tipologias da obra/torre");
    }

    return parseJsonSafe(r);
  },
};
