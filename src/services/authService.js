const mockUsers = [
  { 
    id: '3', 
    name: 'Administrador', 
    email: 'admin@imovelcrm.com', 
    password: 'admin', 
    role: 'admin', 
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100' 
  },
  { 
    id: '1', 
    name: 'Carlos Silva', 
    email: 'carlos@imovelcrm.com', 
    password: '123', 
    role: 'agente', 
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' 
  },
];

export const authService = {
  async login(email, password) {
    try {
      const response = await fetch('http://localhost/v4/api/php-api-crm/public/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // garante envio/recebimento do cookie de sessão
      });
      if (!response.ok) return null;
      const user = await response.json();
      if (user && user.id) {
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  },
};