
"use client";

import type { User, UserRole, NewUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (login: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (newUser: NewUser) => Promise<boolean>;
  updateUser: (updatedUser: User) => Promise<boolean>;
  findUserByLogin: (login: string) => Promise<User | undefined>;
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      toast({
        variant: 'destructive',
        title: 'Configuração Incompleta',
        description: 'As credenciais do Firebase não foram encontradas. Renomeie o arquivo .env para .env.local e preencha com suas chaves. Os dados não serão salvos.',
        duration: Infinity, // Keep the toast visible
      });
    }
  }, [toast]);
  
  const usersCollection = db ? collection(db, "users") : null;

  const refreshUsers = async () => {
    if (!usersCollection) return;
    const querySnapshot = await getDocs(query(usersCollection, orderBy("name")));
    const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    setUsers(usersList);
  };

  useEffect(() => {
    const initializeAuth = async () => {
        setIsLoading(true);
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        await refreshUsers();
        setIsLoading(false);
    };
    initializeAuth();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);

    if (loginInput.toLowerCase() === 'admin' && pass === 'Michelin') {
        const adminUser: User = { id: 'admin001', name: 'Administrador', login: 'admin', role: 'admin' };
        setUser(adminUser);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        setIsLoading(false);
        return true;
    }

    if (!usersCollection) {
        setIsLoading(false);
        return false;
    }

    try {
        const q = query(usersCollection, where("login", "==", loginInput.toLowerCase()), where("password", "==", pass));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const foundUser = { id: userDoc.id, ...userDoc.data() } as User;
            const { password, ...userToStore } = foundUser;
            setUser(userToStore);
            localStorage.setItem('currentUser', JSON.stringify(userToStore));
            setIsLoading(false);
            return true;
        }
    } catch (error) {
        console.error("Error during login:", error);
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

  const addUser = async (newUser: NewUser): Promise<boolean> => {
    if (!usersCollection) return false;
    const userExists = await findUserByLogin(newUser.login);
    if (userExists) return false;
    
    await addDoc(usersCollection, newUser);
    await refreshUsers();
    return true;
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
    if (!db) return false;
    const existingUserWithLogin = await findUserByLogin(updatedUser.login);
    if (existingUserWithLogin && existingUserWithLogin.id !== updatedUser.id) {
        return false; // Login already taken by another user
    }
    
    const userDoc = doc(db, 'users', updatedUser.id);
    await updateDoc(userDoc, updatedUser as any); 

    if (user && user.id === updatedUser.id) {
        const { password, ...userToStore } = updatedUser;
        setUser(userToStore);
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
    }
    await refreshUsers();
    return true;
  };

  const findUserByLogin = async (loginInput: string): Promise<User | undefined> => {
    if (!usersCollection) return undefined;
    const q = query(usersCollection, where("login", "==", loginInput.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return undefined;
  }

  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    if (!db) return { success: false, message: 'Base de dados não configurada.' };

    if (userId === 'admin001') {
      return { success: false, message: 'A senha do usuário administrador não pode ser alterada aqui.' };
    }
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const userData = userDocSnap.data();

    if (userData.password !== currentPasswordInput) {
      return { success: false, message: 'Senha atual incorreta.' };
    }
    
    await updateDoc(userDocRef, { password: newPasswordInput });
    return { success: true, message: 'Senha alterada com sucesso.' };
  };

  const deleteUser = async (userId: string): Promise<void> => {
    if (!db) return;
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);
    await refreshUsers();
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
