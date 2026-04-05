const API_URL = '/api/property_images.php';
// base para recursos públicos (uploads, etc.)
export const API_BASE = '/api/';

const getImagesByProperty = async (id, type = 'property') => {
  // type: 'property' | 'project' | 'unit'
  const q = type === 'project' ? 'project_id' : (type === 'unit' ? 'unit_id' : 'property_id');
  const response = await fetch(`${API_URL}?${q}=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Erro ao buscar imagens');
  return await response.json();
};

// Upload de um arquivo via multipart/form-data
// uploadImage aceita opcionalmente isPrimary (0/1) para marcar capa no momento do upload
const uploadImage = async (id, file, isPrimary = 0, type = 'property') => {
  const form = new FormData();
  const fieldName = type === 'project' ? 'project_id' : (type === 'unit' ? 'unit_id' : 'property_id');
  // append both to form and as query param (fallback) to avoid servers that don't parse multipart POST fields
  // ensure project_id is always explicitly present when type === 'project'
  form.append(fieldName, id);
  if (type === 'project') {
    // use set to ensure a single project_id entry (overwrites if already present)
    if (typeof form.set === 'function') form.set('project_id', id);
    else form.append('project_id', id);
  }
  form.append('file', file, file.name);
  form.append('is_primary', isPrimary ? 1 : 0);

  // debug: list form keys (avoid printing binary)
  try {
    const entries = [];
    for (const pair of form.entries()) {
      // pair[1] may be a File; we log name/size for files
      if (pair[1] instanceof File) entries.push({ key: pair[0], name: pair[1].name, size: pair[1].size });
      else entries.push({ key: pair[0], value: pair[1] });
    }
    console.debug('propertyImageService.uploadImage FormData entries:', entries);
  } catch (e) {
    // ignore
  }

  // build query param and guarantee project_id is present in the URL when uploading a project image
  const q = `${fieldName}=${encodeURIComponent(id)}`;
  let url = API_URL.includes('?') ? `${API_URL}&${q}` : `${API_URL}?${q}`;
  if (type === 'project' && !url.includes('project_id=')) {
    const extra = `project_id=${encodeURIComponent(id)}`;
    url = `${url}&${extra}`;
  }

  console.debug('propertyImageService.uploadImage url:', url, 'fieldName:', fieldName, 'id:', id);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      body: form,
    });
  } catch (netErr) {
    console.error('Network error uploading image:', netErr);
    throw netErr;
  }

  const text = await response.text();
  try {
    const json = JSON.parse(text || '{}');
    if (!response.ok) throw new Error(JSON.stringify(json));
    return json;
  } catch (e) {
    // if not JSON, rethrow with raw text
    if (!response.ok) throw new Error(text || 'Erro ao enviar imagem');
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }
};

// Compatibilidade: saveImage aceita ainda o formato antigo (data_url) ou um objeto com file e um dos ids { property_id, project_id, unit_id }
const saveImage = async (image) => {
  // caso o chamador já envie um arquivo via File
  if (image && image.file && (image.property_id || image.project_id || image.unit_id)) {
    const isPrimary = image.is_primary ?? image.isPrimary ?? 0;
    if (image.project_id) return uploadImage(image.project_id, image.file, isPrimary, 'project');
    if (image.unit_id) return uploadImage(image.unit_id, image.file, isPrimary, 'unit');
    return uploadImage(image.property_id, image.file, isPrimary, 'property');
  }

  // fallback: se vier data_url (base64)
  if (image && image.data_url) {
    const method = image.id ? 'PUT' : 'POST';
    const url = image.id ? `${API_URL}?id=${image.id}` : API_URL;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(image),
    });

    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  }

  throw new Error('Formato de imagem inválido para saveImage');
};

const deleteImage = async (id) => {
  const response = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Erro ao deletar imagem');
  return true;
};

export const propertyImageService = {
  getImagesByProperty,
  uploadImage,
  saveImage,
  deleteImage,
};
