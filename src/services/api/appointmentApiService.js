const BASE_URL = '/api';
// use calendar.php endpoint implemented in the backend
const RESOURCE = `${BASE_URL}/calendar.php`;

const listAppointments = async () => {
  const r = await fetch(RESOURCE);
  if (!r.ok) throw new Error(await r.text());
  const json = await r.json();
  return json && json.data ? json.data : json;
};

const getAppointment = async (id) => {
  const r = await fetch(`${RESOURCE}?id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(await r.text());
  const json = await r.json();
  return json && json.data ? json.data : json;
};

const saveAppointment = async (appointment) => {
  const method = appointment.id ? 'PUT' : 'POST';
  const url = appointment.id ? `${RESOURCE}?id=${encodeURIComponent(appointment.id)}` : RESOURCE;
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment),
  });
  if (!r.ok) throw new Error(await r.text());
  const json = await r.json();
  return json && json.data ? json.data : json;
};

const deleteAppointment = async (id) => {
  const r = await fetch(`${RESOURCE}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
  return true;
};

export const appointmentApiService = {
  listAppointments,
  getAppointment,
  saveAppointment,
  deleteAppointment,
};
