
"use client";

import type { User, UserRole, NewUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } from 'firebase/firestore';


interface AuthContextType {
  user: User | null;
  login: (login: string, pass: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (newUser: NewUser) => Promise<{success: boolean; message?: string}>;
  updateUser: (updatedUser: User) => Promise<{success: boolean; message?: string}>;
  findUserByLogin: (login: string) => User | undefined;
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = () => {
        setIsLoading(true);
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to initialize auth from sessionStorage:", error);
            sessionStorage.removeItem('currentUser');
        } finally {
            // Loading will be set to false by the Firestore listener
        }
    };
    initializeAuth();
  }, []);

  // Listen for real-time updates to the users collection
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
        setIsLoading(false);
        // Fallback to a hardcoded admin if firebase is not set up
        setUsers([{ id: '1', name: 'Administrador Padrão', login: 'admin', password: 'Michelin', role: 'admin' }]);
        return;
    };
    
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy("name"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userList: User[] = [];
        querySnapshot.forEach((doc) => {
            userList.push({ id: doc.id, ...doc.data() } as User);
        });
        // Ensure there's at least one admin user if the collection is empty
        if (userList.length === 0) {
            setUsers([{ id: '1', name: 'Administrador Padrão', login: 'admin', password: 'Michelin', role: 'admin' }]);
        } else {
            setUsers(userList);
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching users in real-time:", error);
        toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar os usuários do sistema. Verifique as regras do Firestore." });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const login = async (loginInput: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
        const normalizedLogin = loginInput.toLowerCase();
        // The `users` state is kept in sync by the listener, so we can check it directly.
        const foundUser = users.find(u => u.login.toLowerCase() === normalizedLogin && u.password === pass);

        if (foundUser) {
            const { password, ...userToStore } = foundUser;
            setUser(userToStore as User);
            sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
            return userToStore as User;
        }

        setUser(null);
        return null;

    } catch(error) {
        console.error("Login error:", error);
        toast({ variant: 'destructive', title: 'Erro de Login', description: 'Ocorreu um erro ao tentar fazer login.' });
        return null;
    } finally {
        setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
    router.push('/login');
  };
  
  const findUserByLogin = (loginInput: string): User | undefined => {
      return users.find(u => u.login.toLowerCase() === loginInput.toLowerCase());
  };

  const addUser = async (newUser: NewUser): Promise<{success: boolean, message?: string}> => {
    if (!isFirebaseConfigured || !db) return { success: false, message: "Banco de dados não configurado." };
    if (findUserByLogin(newUser.login)) {
        return { success: false, message: "Este login já está em uso." };
    }
    try {
        await addDoc(collection(db, 'users'), newUser);
        return { success: true };
    } catch (error) {
        console.error("Error adding user:", error);
        return { success: false, message: "Erro ao adicionar usuário no banco de dados." };
    }
  };

  const updateUser = async (updatedUser: User): Promise<{success: boolean, message?: string}> => {
    if (!isFirebaseConfigured || !db) return { success: false, message: "Banco de dados não configurado." };
    
    const existingUserWithLogin = findUserByLogin(updatedUser.login);
    if (existingUserWithLogin && existingUserWithLogin.id !== updatedUser.id) {
        return { success: false, message: `Este login já está em uso por outro usuário.` };
    }

    try {
        const userDoc = doc(db, 'users', updatedUser.id);
        const { id, ...dataToUpdate } = updatedUser; 
        await updateDoc(userDoc, dataToUpdate);

        if (user && user.id === updatedUser.id) {
            const { password, ...userToStore } = updatedUser;
            setUser(userToStore);
            sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
        }
        return { success: true };
    } catch (error) {
        console.error("Error updating user:", error);
        return { success: false, message: "Erro ao atualizar usuário no banco de dados." };
    }
  };
  
  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    if (!isFirebaseConfigured || !db) return { success: false, message: "Banco de dados não configurado." };
    
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) {
        return { success: false, message: "Usuário não encontrado." };
    }
    if (userToUpdate.password !== currentPasswordInput) {
        return { success: false, message: "Senha atual incorreta." };
    }
    try {
        const userDoc = doc(db, 'users', userId);
        await updateDoc(userDoc, { password: newPasswordInput });
        return { success: true, message: "Senha alterada com sucesso." };
    } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, message: "Erro ao alterar a senha no banco de dados." };
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
     if (!isFirebaseConfigured || !db) return false;
     try {
        await deleteDoc(doc(db, 'users', userId));
        return true;
     } catch (error) {
        console.error("Error deleting user:", error);
        return false;
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
