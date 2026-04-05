const API_BASE = "/api";

export const salesTableService = {
  // -------- Sales Tables --------
  getTables: async () => {
  const res = await fetch(`${API_BASE}/sales_tables.php`);
  if (!res.ok) return [];
  try { return await res.json(); } catch (e) { console.error('Invalid JSON from getTables', e); return []; }
  },
  getTableById: async (id) => {
  const res = await fetch(`${API_BASE}/sales_tables.php?id=${id}`);
  if (!res.ok) return null;
  try { return await res.json(); } catch (e) { console.error('Invalid JSON from getTableById', e); return null; }
  },
  addTable: async (table) => {
    let body, options = { method: 'POST' };
    // if any attachment has a fileObject, send multipart/form-data
    if (Array.isArray(table.attachments) && table.attachments.some(a => a && a.fileObject)) {
      const fd = new FormData();
      // Only include existing attachments metadata (no fileObject) in the payload to avoid duplication.
      const attachmentsMeta = (table.attachments || []).filter(a => !a.fileObject).map(a => ({ name: a.name, size: a.size, path: a.path || a.url || null }));
      const payload = { ...table, attachments: attachmentsMeta };
      fd.append('payload', JSON.stringify(payload));
      table.attachments.forEach((a, idx) => {
        if (a && a.fileObject) fd.append('files[]', a.fileObject, a.name);
      });
      body = fd;
      options.body = body;
    } else {
      // Ensure we don't serialize fileObject in JSON mode
      const cleaned = { ...table, attachments: (table.attachments || []).map(a => ({ name: a.name, size: a.size, path: a.path || a.url || null })) };
      body = JSON.stringify(cleaned);
      options.body = body;
      options.headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch(`${API_BASE}/sales_tables.php`, options);
    if (!res.ok) throw new Error('Failed to add table');
    try { return await res.json(); } catch (e) { console.error('Invalid JSON from addTable', e); return null; }
  },
  updateTable: async (id, updatedTable) => {
    let options = {};
    // When sending files, use POST + _method=PUT so PHP populates $_FILES (PUT + multipart isn't parsed by PHP)
    if (Array.isArray(updatedTable.attachments) && updatedTable.attachments.some(a => a && a.fileObject)) {
      options.method = 'POST';
      const fd = new FormData();
      // attachmentsMeta should include only existing attachments (no fileObject) to avoid duplication
      const attachmentsMeta = (updatedTable.attachments || []).filter(a => !a.fileObject).map(a => ({ name: a.name, size: a.size, path: a.path || a.url || null }));
      const payload = { ...updatedTable, attachments: attachmentsMeta };
      fd.append('payload', JSON.stringify(payload));
      // method override for the backend to treat this as PUT
      fd.append('_method', 'PUT');
      updatedTable.attachments.forEach((a) => { if (a && a.fileObject) fd.append('files[]', a.fileObject, a.name); });
      options.body = fd;
    } else {
      options.method = 'PUT';
      const cleaned = { ...updatedTable, attachments: (updatedTable.attachments || []).map(a => ({ name: a.name, size: a.size, path: a.path || a.url || null })) };
      options.body = JSON.stringify(cleaned);
      options.headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch(`${API_BASE}/sales_tables.php?id=${id}`, options);
    if (!res.ok) throw new Error('Failed to update table');
    try { return await res.json(); } catch (e) { console.error('Invalid JSON from updateTable', e); return null; }
  },
  deleteTable: async (id) => {
    const res = await fetch(`${API_BASE}/sales_tables.php?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error('Failed to delete table');
  },

  // -------- History --------
  getHistory: async () => {
  const res = await fetch(`${API_BASE}/history.php`);
  if (!res.ok) return [];
  try { return await res.json(); } catch (e) { console.error('Invalid JSON from getHistory', e); return []; }
  },
  addHistoryEntry: async (entry) => {
    const res = await fetch(`${API_BASE}/history.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return res.json();
  },

  // -------- Automations --------
  getAutomations: async () => {
  const res = await fetch(`${API_BASE}/automations.php`);
  if (!res.ok) return [];
  try { return await res.json(); } catch (e) { console.error('Invalid JSON from getAutomations', e); return []; }
  },
  deleteAutomation: async (id) => {
    await fetch(`${API_BASE}/automations.php?id=${id}`, {
      method: "DELETE",
    });
  },
  createAutomation: async (payload) => {
    const res = await fetch(`${API_BASE}/automations.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create automation');
    try { return await res.json(); } catch (e) { console.error('Invalid JSON from createAutomation', e); return null; }
  },
  toggleAutomationStatus: async (id) => {
  const res = await fetch(`${API_BASE}/automations.php?id=${id}&toggle=1`, {
      method: "PATCH",
    });
  if (!res.ok) throw new Error('Failed to toggle automation');
  try { return await res.json(); } catch (e) { console.error('Invalid JSON from toggleAutomationStatus', e); return null; }
  },
};
