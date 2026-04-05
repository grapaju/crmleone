const API_URL = "/api/appointments.php";
import { leadService } from "./leadService";

async function parseJsonSafe(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Resposta JSON inválida: ${text}`);
    }
  }
  // If not JSON, just return the text
  return text;
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

// normalize API appointment (DB shape) to frontend-friendly object
// normalize API appointment (DB shape) to frontend-friendly object
const normalizeAppointment = (a) => {
  if (!a) return null;
  return {
    id: a.id ?? a.ID ?? null,
    title: a.title ?? a.event_name ?? a.name ?? a.titulo ?? "",
    description: a.description ?? a.notes ?? a.observacoes ?? "",
    type: a.type ?? a.event_type ?? "Outro",
    // backend stores `start` and `end` under several possible names
    start:
      a.start ??
      a.event_date ??
      a.data_inicio ??
      a.start_date ??
      a.inicio ??
      null,
    end: a.end ?? a.event_time ?? a.data_fim ?? a.end_date ?? a.termino ?? null,
    agent_id: a.agent_id ?? a.agentId ?? a.usuario_id ?? a.user_id ?? null,
    // provide multiple name variants the UI expects
    agent_name:
      a.agent_name ??
      a.agent ??
      a.agentName ??
      a.user_name ??
      a.usuario_nome ??
      a.name ??
      null,
    agent: a.agent_name ?? a.agent ?? a.agent ?? null,
    lead_id: a.lead_id ?? a.leadId ?? a.client_id ?? null,
    // client/lead name
    lead_name:
      a.lead_name ??
      a.client ??
      a.lead ??
      a.client_name ??
      a.cliente_nome ??
      null,
    client: a.client ?? a.lead ?? null,
    property_id: a.property_id ?? a.propertyId ?? a.imovel_id ?? null,
    // keep legacy propertyId for other code
    propertyId: a.property_id ?? a.propertyId ?? null,
    // human-friendly property/project fields used in cards
    property_title:
      a.property_title ??
      a.property_name ??
      a.imovel_titulo ??
      a.propertyTitle ??
      null,
    property_address:
      a.property_address ??
      a.address ??
      a.endereco ??
      a.property_address ??
      null,
    project_id: a.project_id ?? a.projectId ?? null,
    project_name: a.project_name ?? a.project ?? a.projeto_nome ?? null,
    status: a.status ?? a.state ?? "Pendente",
    created_at: a.created_at ?? a.createdAt ?? null,
    updated_at: a.updated_at ?? a.updatedAt ?? null,
    origin_tag: a.origin_tag ?? a.origem ?? (/(Gerado por Dica)/i.test(a.description || a.notes || '') ? 'Gerado por Dica' : null),
  };
};

// Convert frontend appointment shape to API payload shape
const denormalizeAppointment = (a) => {
  if (!a) return {};
  return {
    id: a.id ?? undefined,
    title: a.title ?? a.name ?? "",
    description: a.description ?? a.notes ?? a.observacoes ?? "",
    type: a.type ?? "Ligar",
    start: a.start ?? a.event_date ?? a.data_inicio ?? null,
    end: a.end ?? a.event_time ?? a.data_fim ?? null,
    agent_id: a.agent_id ?? a.agentId ?? a.usuario_id ?? null,
    agent_name: a.agent_name ?? a.agent ?? a.agentName ?? null,
    lead_id: a.lead_id ?? a.leadId ?? a.client_id ?? null,
    client: a.client ?? a.lead ?? null,
    property_id: a.property_id ?? a.propertyId ?? a.imovel_id ?? null,
    project_id: a.project_id ?? a.projectId ?? null,
    status: a.status ?? "Pendente",
    origin_tag: a.origin_tag ?? a.origem ?? undefined,
  };
};

// Allowed enum values from DB schema (keeps frontend in sync with DB enums)
// Source: database schema `appointments` (see attachments)
const ALLOWED_TYPES = [
  "Ligar",
  "Email",
  "Reunião",
  "Tarefa",
  "Mensagem",
  "Visita",

];
const ALLOWED_STATUSES = ["Pendente", "Confirmado", "Cancelado", "Concluído", "Não Realizado"];

const validateEnums = (a) => {
  if (!a || typeof a !== "object") return a;
  const copy = { ...a };
  if (!copy.type || !ALLOWED_TYPES.includes(copy.type)) copy.type = "Ligar";
  if (!copy.status || !ALLOWED_STATUSES.includes(copy.status))
    copy.status = "Pendente";
  return copy;
};

const getAppointments = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || "Erro ao buscar compromissos");
  }
  const raw = await parseJsonSafe(response);
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && Array.isArray(raw.value)) list = raw.value;
  else if (raw && Array.isArray(raw.data)) list = raw.data;
  else if (raw && Array.isArray(raw.appointments)) list = raw.appointments;
  else if (raw && typeof raw === 'object') list = [raw];
  const normalized = list.map(normalizeAppointment).filter(Boolean);
  try { console.debug('[APPT FETCH:NORMALIZED SAMPLE]', normalized.slice(0,3)); } catch(_) {}
  return normalized;
};

const getAppointmentById = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`);
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || "Erro ao buscar projeto");
  }
  const res = await parseJsonSafe(response);
  // backend sometimes wraps results: { value: [...] } or { data: [...] } or returns an array
  let item = null;
  if (Array.isArray(res)) item = res[0] ?? null;
  else if (res && Array.isArray(res.value)) item = res.value[0] ?? null;
  else if (res && Array.isArray(res.data)) item = res.data[0] ?? null;
  else item = res;
  return normalizeAppointment(item);
};

// Local fallback for appointments
const localGetAppointments = () => {
  try {
    const data = localStorage.getItem("appointments");
    const arr = data ? JSON.parse(data) : [];
    return (Array.isArray(arr)?arr:[]).map(normalizeAppointment).filter(Boolean);
  } catch {
    return [];
  }
};

const getAppointmentsByPropertyId = async (propertyId) => {
  try {
    const all = await getAppointments();
    return (all || []).filter(
      (a) => String(a.propertyId ?? a.property_id ?? "") === String(propertyId)
    );
  } catch (e) {
    // fallback to local storage if API fails
    const all = localGetAppointments();
    return (all || []).filter(
      (a) => String(a.propertyId ?? a.property_id ?? "") === String(propertyId)
    );
  }
};

const saveAppointment = async (appointment) => {
  try {
    // ensure enums are valid before sending to API
    const validated = validateEnums(appointment);
    // Frontend validations: title and start required, end must be >= start
    if (!validated || typeof validated !== "object") {
      throw new ValidationError("Dados do compromisso inválidos.");
    }
    const title = (validated.title ?? "").toString().trim();
    if (!title) throw new ValidationError("O título é obrigatório.");

    const startRaw = validated.start ?? validated.data_inicio ?? null;
    if (!startRaw)
      throw new ValidationError("A data/hora de início é obrigatória.");
    const startDate = new Date(startRaw);
    if (isNaN(startDate.getTime()))
      throw new ValidationError("Data/hora de início inválida.");

    const endRaw = validated.end ?? validated.data_fim ?? null;
    let endDate = null;
    if (endRaw) {
      endDate = new Date(endRaw);
      if (isNaN(endDate.getTime()))
        throw new ValidationError("Data/hora de término inválida.");
      if (startDate.getTime() > endDate.getTime())
        throw new ValidationError(
          "A data/hora de início deve ser anterior à data/hora de término."
        );
    }

    let payload = denormalizeAppointment(validated);

    // Aliases explícitos (backend usa apenas start/end, mas garantimos compatibilidade)
    payload.start_date = payload.start_date || payload.start;
    payload.event_date = payload.event_date || payload.start;
    payload.data_inicio = payload.data_inicio || payload.start;
    payload.end_date = payload.end_date || payload.end;
    payload.data_fim = payload.data_fim || payload.end;

    // --- Normalização explícita de datas para formato SQL (YYYY-MM-DD HH:mm:ss) ---
    const toSqlDateTime = (value) => {
      if (!value) return value;
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return value;
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      } catch { return value; }
    };
    const originalStart = payload.start;
    const originalEnd = payload.end;
    payload.start = toSqlDateTime(payload.start);
    if (payload.end) payload.end = toSqlDateTime(payload.end);
    if (!payload.end) payload.end = payload.start;
    // Sincroniza aliases após normalizar
    payload.start_date = payload.start;
    payload.event_date = payload.start;
    payload.data_inicio = payload.start;
    payload.end_date = payload.end;
    payload.data_fim = payload.end;

    try { console.debug('[APPT SAVE:DATE]', { before: { start: originalStart, end: originalEnd }, after: { start: payload.start, end: payload.end } }); } catch(_) {}

    // Attach current user (agent) info from localStorage if present
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user && user.id) {
          payload.agent_id = payload.agent_id ?? user.id;
          payload.usuario_id = payload.usuario_id ?? user.id;
          payload.agent_name = payload.agent_name ?? user.name ?? user.nome ?? null;
        }
      }
    } catch (_) {}

    const method = payload.id ? "PUT" : "POST";
    const url = payload.id ? `${API_URL}?id=${payload.id}` : API_URL;

    // Log bruto antes do fetch
    try { console.debug('[APPT SAVE:REQUEST]', { method, url, payload }); } catch(_) {}

    const bodyStr = JSON.stringify(payload);
    // Log tamanho e hash simples
    try { console.debug('[APPT SAVE:REQUEST META]', { length: bodyStr.length }); } catch(_) {}

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });

    // Log status bruto
    let cloneText = '';
    try {
      cloneText = await response.clone().text();
      console.debug('[APPT SAVE:RESPONSE RAW]', { status: response.status, body: cloneText.slice(0,500) });
    } catch(_) {}

    if (!response.ok) {
      throw new Error(cloneText || 'Erro ao salvar compromisso');
    }

    let res; let saved;
    try { res = JSON.parse(cloneText); } catch { res = cloneText; }
    saved = normalizeAppointment(res);
    try { console.debug('[APPT SAVE:RESPONSE NORMALIZED]', saved); } catch(_) {}

    // Refresh lead score async
    try {
      const leadId = saved?.lead_id ?? saved?.leadId ?? null;
      if (leadId) leadService.getLeadById(leadId).catch(()=>{});
    } catch(_) {}
    return saved;
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    console.warn('API saveAppointment fallback (erro):', e);
    let appointments = localGetAppointments();
    if (appointment.id) {
      appointments = appointments.map(a => String(a.id) === String(appointment.id) ? appointment : a);
    } else {
      appointment.id = Date.now();
      appointments.push(appointment);
    }
    localStorage.setItem('appointments', JSON.stringify(appointments));
    return appointment;
  }
};

const deleteAppointment = async (id) => {
  const response = await fetch(`${API_URL}?id=${id}`, { method: "DELETE" });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || "Erro ao deletar projeto");
  }
  // API retorna mensagem JSON; tente parse ou retorne true
  try {
    return await parseJsonSafe(response);
  } catch (_) {
    return true;
  }
};

export const appointmentService = {
  getAppointments,
  getAppointmentById,
  getAppointmentsByPropertyId,
  saveAppointment,
  deleteAppointment,
};
