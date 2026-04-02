const API_URL = 'http://localhost/v4/api/php-api-crm/public/projects.php';

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

  // Não é JSON — lance com o texto para ajudar o debug
  throw new Error(text || 'Resposta inesperada do servidor');
}

const getProjects = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || 'Erro ao buscar projetos');
  }
  return await parseJsonSafe(response);
};

const getProjectById = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`);
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || 'Erro ao buscar projeto');
  }
  return await parseJsonSafe(response);
};

const saveProject = async (project) => {
  const method = project.id ? 'PUT' : 'POST';
  const url = project.id ? `${API_URL}?id=${project.id}` : API_URL;

  // Normalizar payload para snake_case usado pelo backend
  const payload = {
    id: project.id,
    property_type: project.property_type ?? project.propertyType ?? 'project',
    project_name: project.project_name ?? project.projectName ?? project.title ?? null,
    developer_name: project.developer_name ?? project.developerName ?? project.developer ?? null,
    project_type: project.project_type ?? project.projectType ?? null,
    project_status: project.project_status ?? project.projectStatus ?? project.status ?? null,
    endereco: project.endereco ?? project.address ?? null,
    bairro: project.bairro ?? project.neighborhood ?? null,
    cidade: project.cidade ?? project.city ?? null,
    zip_code: project.zip_code ?? project.cep ?? project.zipCode ?? null,
    delivery_date: project.delivery_date ?? project.deliveryDate ?? null,
    features: project.features ?? project.projectFeatures ?? project.featuresList ?? null,
    towers: project.towers ?? null,
    units: project.units ?? null,
    image: project.image ?? project.image_url ?? project.imageUrl ?? null,
  };

  // Para updates parciais, remova campos nulos do payload antes de enviar
  if (method === 'PUT') {
    Object.keys(payload).forEach(key => {
      if (key === 'id') return;
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || 'Erro ao salvar projeto');
  }
  return await parseJsonSafe(response);
};

const deleteProject = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || 'Erro ao deletar projeto');
  }
  // API retorna mensagem JSON; tente parse ou retorne true
  try {
    return await parseJsonSafe(response);
  } catch (_) {
    return true;
  }
};

export const projectService = {
  getProjects,
  getProjectById,
  saveProject,
  deleteProject,
};
