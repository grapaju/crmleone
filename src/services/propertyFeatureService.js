const API_URL = '/api/property_features.php';

const savePropertyFeatures = async (propertyId, featureIds = []) => {
  const payload = { property_id: propertyId, features: featureIds };
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const getPropertyFeatures = async (propertyId) => {
  const r = await fetch(`${API_URL}?property_id=${encodeURIComponent(propertyId)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export const propertyFeatureService = {
  savePropertyFeatures,
  getPropertyFeatures,
};
