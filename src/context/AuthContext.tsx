
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

// Mock user data WITHOUT passwords.
const MOCK_USERS: Omit<User, 'password'>[] = [
    {
      id: 'admin001',
      name: 'Administrador',
      login: 'admin',
      role: 'admin',
    }
];

// This function simulates checking passwords on a backend.
// In a real app, this would be an API call.
const checkCredentials = (login: string, pass: string): Omit<User, 'password'> | null => {
    const lowerLogin = login.toLowerCase();
    // Special case for the hardcoded admin user for demo purposes
    if (lowerLogin === 'admin' && pass === 'Michelin') {
        return MOCK_USERS.find(u => u.login === 'admin') || null;
    }
    // In a real app, you would have logic here to check other users against a database.
    // For this demo, other users cannot log in as their passwords are not stored.
    return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS.map(u => ({...u, password: ''}))); // For user management list
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      // Ensure the stored user exists in our mock list
      const foundUser = MOCK_USERS.find(u => u.login.toLowerCase() === parsedUser.login.toLowerCase()); 
      if (foundUser) {
        setUser(foundUser);
      } else {
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if(user){
        const currentUserFromUsersArray = users.find(u => u.id === user.id);
        if(currentUserFromUsersArray){
            const {password, ...userToStore} = currentUserFromUsersArray;
            if(JSON.stringify(user) !== JSON.stringify(userToStore)){
                setUser(userToStore);
                localStorage.setItem('currentUser', JSON.stringify(userToStore));
            }
        } else {
            logout();
        }
    }
  }, [users, user]);


  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = checkCredentials(loginInput, pass);

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

  const addUser = (newUser: User): boolean => {
    if (users.some(u => u.login.toLowerCase() === newUser.login.toLowerCase())) {
      return false; 
    }
    // Note: The password for new users is not actually stored or used for login in this mock setup.
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
    return true;
  }

  const findUserByLogin = (loginInput: string): User | undefined => {
    return users.find(u => u.login.toLowerCase() === loginInput.toLowerCase());
  }

  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    // This feature is disabled because client-side password management is insecure.
    // In a real application, this would be a secure API call to a backend server.
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: false, message: 'Função desabilitada. A alteração de senha requer um backend seguro.' };
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
