
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
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin user
const ADMIN_USER: User = {
  id: 'admin001',
  name: 'Administrador',
  login: 'admin',
  password: 'Michelin', 
  role: 'admin',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([ADMIN_USER]); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      const foundUser = users.find(u => u.login.toLowerCase() === parsedUser.login.toLowerCase()); 
      if (foundUser) {
        const { password, ...userToSet } = foundUser; // Ensure password is not in the user state
        setUser(userToSet);
      } else {
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []); // Run only once on mount initially

  useEffect(() => {
    // This effect ensures if users array is updated (e.g. by admin), the current user's data is also updated if they are the one changed.
    if(user){
        const currentUserFromUsersArray = users.find(u => u.id === user.id);
        if(currentUserFromUsersArray){
            const {password, ...userToStore} = currentUserFromUsersArray;
            if(JSON.stringify(user) !== JSON.stringify(userToStore)){ // Prevents unnecessary updates
                setUser(userToStore);
                localStorage.setItem('currentUser', JSON.stringify(userToStore));
            }
        } else { // Current user was deleted by admin
            logout();
        }
    }
  }, [users, user]);


  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = users.find(u => {
      if (u.login === 'admin' && loginInput.toLowerCase() === 'admin') { // Admin login check: input 'admin' (case-insensitive) matches stored 'admin'
        return u.password === pass; // Password is case-sensitive: 'Michelin'
      }
      return u.login === loginInput && u.password === pass; // Other users: case-sensitive login and password
    });

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

  const addUser = (newUser: User): boolean => {
    if (users.some(u => u.login.toLowerCase() === newUser.login.toLowerCase())) {
      return false; 
    }
    setUsers(prevUsers => [...prevUsers, newUser]);
    return true;
  };

  const updateUser = (updatedUser: User): boolean => {
    if (users.some(u => u.id !== updatedUser.id && u.login.toLowerCase() === updatedUser.login.toLowerCase())) {
      return false; 
    }
    setUsers(prevUsers => 
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
    // User state and localStorage are updated via the useEffect hook observing 'users'
    return true;
  }

  const findUserByLogin = (loginInput: string): User | undefined => {
    return users.find(u => u.login.toLowerCase() === loginInput.toLowerCase());
  }

  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
    
    let userIndex = -1;
    const userToUpdate = users.find((u, index) => {
        if(u.id === userId) {
            userIndex = index;
            return true;
        }
        return false;
    });

    if (!userToUpdate || userIndex === -1) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    // Check current password (case-sensitive)
    if (userToUpdate.password !== currentPasswordInput) {
      return { success: false, message: 'Senha atual incorreta. Verifique e tente novamente.' };
    }

    if (userToUpdate.password === newPasswordInput) {
        return { success: false, message: 'Nova senha não pode ser igual à senha atual.' };
    }

    const updatedUsers = [...users];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: newPasswordInput };
    setUsers(updatedUsers);

    return { success: true, message: 'Senha alterada com sucesso!' };
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, users, addUser, updateUser, findUserByLogin, changePassword }}>
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
