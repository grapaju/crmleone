const API_URL = "/api/properties.php";

const getProperties = async () => {
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const getPropertyById = async (id) => {
  // Guard: don't call API with undefined/null/empty id
  if (id === undefined || id === null || String(id).trim() === "") return null;
  const safeId = encodeURIComponent(String(id));
  const r = await fetch(`${API_URL}?id=${safeId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const createProperty = async (property) => {
  const payload = {
    title: property.title,
    price: property.price,
    address: property.address,
    city: property.city,
    state: property.state,
    zip_code: property.zip_code,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking: property.parking,
    area: property.area,
    type: property.type,
    status: property.status,
    property_type: property.property_type ?? "property",
    agent_id: property.agent_id ?? null,
    // images e features são tratados em services separados
    // novo: description e tags
    description: property.description ?? property.descricao ?? undefined,
    tags: property.tags ?? undefined,
  };

  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const updateProperty = async (id, property) => {
  const payload = {
    title: property.title,
    price: property.price,
    address: property.address,
    city: property.city,
    state: property.state,
    zip_code: property.zip_code,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking: property.parking,
    area: property.area,
    type: property.type,
    status: property.status,
    property_type: property.property_type,
    agent_id: property.agent_id,
    // novo: description e tags
    description: property.description ?? property.descricao ?? undefined,
    tags: property.tags ?? undefined,
  };

  // API espera o id dentro do corpo para PUT (properties.php usa $data['id'])
  payload.id = id;

  const r = await fetch(`${API_URL}?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const saveProperty = async (property) => {
  if (property.id) return updateProperty(property.id, property);
  return createProperty(property);
};

const deleteProperty = async (id) => {
  const r = await fetch(`${API_URL}?id=${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return true;
};

export const propertyService = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  saveProperty,
  deleteProperty,
};
