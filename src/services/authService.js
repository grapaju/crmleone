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

const ADMIN_ROLE_VALUES = new Set(['admin', 'administrator', 'administrador']);
const AGENT_ROLE_VALUES = new Set(['agente', 'agent', 'corretor', 'user', 'usuario']);

const normalizeRole = (role, email) => {
  const roleValue = String(role || '').trim().toLowerCase();
  const emailValue = String(email || '').trim().toLowerCase();

  if (ADMIN_ROLE_VALUES.has(roleValue)) return 'admin';
  if (AGENT_ROLE_VALUES.has(roleValue)) return 'agente';

  // Compatibilidade com bases antigas em que o admin inicial pode vir sem role.
  if (emailValue === 'admin@imovelcrm.com') return 'admin';

  return 'agente';
};

const normalizeUser = (user) => {
  if (!user || !user.id) return null;
  return {
    ...user,
    role: normalizeRole(user.role, user.email),
    status: user.status || 'Ativo',
  };
};

export const authService = {
  async login(email, password) {
    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // garante envio/recebimento do cookie de sessão
      });
      if (!response.ok) return null;
      const user = await response.json();
      const normalizedUser = normalizeUser(user);
      if (normalizedUser) {
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        return normalizedUser;
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
      const parsedUser = user ? JSON.parse(user) : null;
      const normalizedUser = normalizeUser(parsedUser);

      if (normalizedUser && parsedUser) {
        if (normalizedUser.role !== parsedUser.role || normalizedUser.status !== parsedUser.status) {
          localStorage.setItem('user', JSON.stringify(normalizedUser));
        }
      }

      return normalizedUser;
    } catch (error) {
      return null;
    }
  },
};