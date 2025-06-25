
"use client";

import type { User, UserRole, NewUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Hardcoded initial users, including the admin
const mockUsers: User[] = [
  { id: '1', name: 'Administrador', login: 'admin', password: 'Michelin', role: 'admin' },
];

interface AuthContextType {
  user: User | null;
  login: (login: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (newUser: NewUser) => Promise<boolean>;
  updateUser: (updatedUser: User) => Promise<boolean>;
  findUserByLogin: (login: string) => User | undefined;
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = () => {
        setIsLoading(true);
        try {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to initialize auth from localStorage:", error);
        } finally {
            setIsLoading(false);
        }
    };
    initializeAuth();
  }, []);

  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);

    const normalizedLogin = loginInput.toLowerCase();
    
    const foundUser = users.find(u => u.login.toLowerCase() === normalizedLogin && u.password === pass);

    if (foundUser) {
      const { password, ...userToStore } = foundUser;
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

  const findUserByLogin = (loginInput: string): User | undefined => {
      return users.find(u => u.login.toLowerCase() === loginInput.toLowerCase());
  };
  
  const addUser = async (newUser: NewUser): Promise<boolean> => {
    if (findUserByLogin(newUser.login)) {
        return false; // User already exists
    }
    const userWithId: User = { ...newUser, id: Date.now().toString() };
    setUsers(prevUsers => [...prevUsers, userWithId]);
    return true;
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
     // Check if the new login is already taken by another user
    const existingUserWithLogin = findUserByLogin(updatedUser.login);
    if (existingUserWithLogin && existingUserWithLogin.id !== updatedUser.id) {
        return false; 
    }

    setUsers(prevUsers => {
      const newUsers = prevUsers.map(u => (u.id === updatedUser.id ? updatedUser : u));
      if (user && user.id === updatedUser.id) {
        const { password, ...userToStore } = updatedUser;
        setUser(userToStore);
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
      }
      return newUsers;
    });
    return true;
  };

  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    let success = false;
    let message = 'Usuário não encontrado.';
    
    setUsers(prevUsers => {
        const userToUpdate = prevUsers.find(u => u.id === userId);
        if (!userToUpdate) {
            return prevUsers;
        }
        if (userToUpdate.password !== currentPasswordInput) {
            message = 'Senha atual incorreta.';
            return prevUsers;
        }

        const newUsers = prevUsers.map(u => u.id === userId ? { ...u, password: newPasswordInput } : u);
        success = true;
        message = 'Senha alterada com sucesso.';
        return newUsers;
    });

    return { success, message };
  };

  const deleteUser = async (userId: string): Promise<void> => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, users, addUser, updateUser, findUserByLogin, changePassword, deleteUser }}>
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
