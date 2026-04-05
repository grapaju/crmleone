const API_URL = '/api/features.php';

const getFeatures = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const txt = await response.text().catch(() => 'Erro ao buscar features');
    throw new Error(txt || 'Erro ao buscar features');
  }
  return await response.json();
};

const getFeatureById = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`);
  if (!response.ok) throw new Error('Erro ao buscar feature');
  return await response.json();
};

const saveFeature = async (feature) => {
  const method = feature.id ? 'PUT' : 'POST';
  const url = feature.id ? `${API_URL}?id=${feature.id}` : API_URL;

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature),
  });

  if (!response.ok) throw new Error('Erro ao salvar feature');
  return await response.json();
};

const deleteFeature = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Erro ao deletar feature');
  return true;
};

export const featureService = {
  getFeatures,
  getFeatureById,
  saveFeature,
  deleteFeature,
};
