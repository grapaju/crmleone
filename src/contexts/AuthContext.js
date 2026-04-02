import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '@/services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser());

  const updateUserContext = useCallback((updatedUserData) => {
    const currentUser = authService.getCurrentUser();
    if(currentUser && currentUser.id === updatedUserData.id){
      const newUserData = { ...currentUser, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
       if (e.key === 'user') {
         setUser(authService.getCurrentUser());
       }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email, password) => {
    const loggedInUser = await authService.login(email, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      return loggedInUser;
    }
    return null;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = { user, login, logout, updateUserContext };

  return React.createElement(AuthContext.Provider, { value: value }, children);
};

export const useAuth = () => {
  return useContext(AuthContext);
};