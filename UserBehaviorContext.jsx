import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('nextech_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (email, password) => {
    // Mock login, just store the email
    setUser({ email });
    localStorage.setItem('nextech_user', JSON.stringify({ email }));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nextech_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
