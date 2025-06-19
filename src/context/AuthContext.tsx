
"use client";

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (login: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (newUser: User) => boolean;
  updateUser: (updatedUser: User) => boolean;
  findUserByLogin: (login: string) => User | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin user
const ADMIN_USER: User = {
  id: 'admin001',
  name: 'Administrador',
  login: 'ADMIN', // Changed from 'admin'
  password: 'MICHELIN', // Changed from 'michelin'
  role: 'admin',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([ADMIN_USER]); // Initialize with admin
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for persisted user (e.g., in localStorage)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
       // Re-validate user, e.g. if roles changed. For this demo, just set.
      const foundUser = users.find(u => u.login === parsedUser.login);
      if (foundUser) setUser(foundUser); else localStorage.removeItem('currentUser');
    }
    setIsLoading(false);
  }, [users]);


  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // Case-insensitive login comparison for admin, but password is case sensitive
    const foundUser = users.find(u => {
      if (u.login.toUpperCase() === 'ADMIN' && u.login.toUpperCase() === loginInput.toUpperCase()) {
        return u.password === pass;
      }
      return u.login === loginInput && u.password === pass;
    });

    if (foundUser) {
      const { password, ...userToStore } = foundUser; // Don't store plain password
      setUser(userToStore);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      setIsLoading(false);
      return true;
    }
    setUser(null);
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const addUser = (newUser: User): boolean => {
    // Ensure login is unique, case-insensitive for new users to prevent "admin" vs "ADMIN" conflicts.
    if (users.some(u => u.login.toUpperCase() === newUser.login.toUpperCase())) {
      return false; // User with this login already exists
    }
    setUsers(prevUsers => [...prevUsers, newUser]);
    return true;
  };

  const updateUser = (updatedUser: User): boolean => {
     // Check if new login conflicts with an existing user (excluding self)
    if (users.some(u => u.id !== updatedUser.id && u.login.toUpperCase() === updatedUser.login.toUpperCase())) {
      // Potentially set form error or toast here, for now just block update
      console.error("Login conflict during update");
      return false; 
    }

    setUsers(prevUsers => 
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
    // If current user is updated, update the user state and localStorage
    if (user && user.id === updatedUser.id) {
      const { password, ...userToStore } = updatedUser;
      setUser(userToStore);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
    }
    return true;
  }

  const findUserByLogin = (loginInput: string): User | undefined => {
    // Case-insensitive find for login
    return users.find(u => u.login.toUpperCase() === loginInput.toUpperCase());
  }


  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, users, addUser, updateUser, findUserByLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

