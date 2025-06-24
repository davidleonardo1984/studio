
"use client";

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersStore } from '@/lib/in-memory-store';

interface AuthContextType {
  user: User | null;
  login: (login: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (newUser: Omit<User, 'id'>) => Promise<boolean>;
  updateUser: (updatedUser: User) => Promise<boolean>;
  findUserByLogin: (login: string) => User | undefined;
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUsers = () => {
    setUsers(usersStore.getUsers());
  };

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    refreshUsers();
    setIsLoading(false);
  }, []);


  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    const foundUser = usersStore.checkCredentials(loginInput, pass);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
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

  const addUser = async (newUser: Omit<User, 'id'>): Promise<boolean> => {
    const added = usersStore.addUser(newUser);
    if (added) {
      refreshUsers();
    }
    return !!added;
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
    const updated = usersStore.updateUser(updatedUser);
    if (updated) {
      // If the currently logged-in user is being updated, update the context state as well
      if(user && user.id === updated.id) {
          const { password, ...userToStore } = updated;
          setUser(userToStore);
          localStorage.setItem('currentUser', JSON.stringify(userToStore));
      }
      refreshUsers();
    }
    return !!updated;
  };

  const findUserByLogin = (loginInput: string): User | undefined => {
    return usersStore.findUserByLogin(loginInput);
  }

  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    const userToUpdate = usersStore.findUserById(userId);
    if (!userToUpdate || userToUpdate.password !== currentPasswordInput) {
        return { success: false, message: 'Senha atual incorreta.' };
    }
    usersStore.updateUser({ ...userToUpdate, password: newPasswordInput });
    refreshUsers();
    return { success: true, message: 'Senha alterada com sucesso.' };
  };

  const deleteUser = async (userId: string): Promise<void> => {
    const success = usersStore.deleteUser(userId);
      if (success) {
          refreshUsers();
      }
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
