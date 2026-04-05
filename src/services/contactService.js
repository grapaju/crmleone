const API_URL = '/api/contacts.php';

export const contactService = {
  async getContacts() {
    const response = await fetch(API_URL);
    return await response.json();
  },

  async getContactById(id) {
    const response = await fetch(`${API_URL}?id=${id}`);
    return await response.json();
  },

  async addContact(contact) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact)
    });
    return await response.json();
  },

  async updateContact(id, updatedContact) {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updatedContact })
    });
    return await response.json();
  },

  async deleteContact(id) {
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'DELETE'
    });
    return await response.json();
  }
};
