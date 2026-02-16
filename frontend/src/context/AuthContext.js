import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

// Ensure the word 'export' is right here before 'const AuthProvider'
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('userInfo'); // Required for session persistence 
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData)); // Stores JWT and Role [cite: 43, 46]
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo'); // Required for clearing tokens [cite: 47]
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};