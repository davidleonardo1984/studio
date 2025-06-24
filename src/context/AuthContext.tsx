
"use client";

import type { User, UserRole, NewUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

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
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const usersCollection = collection(db, "users");

  const refreshUsers = async () => {
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

    // Special case for hardcoded admin user
    if (loginInput.toLowerCase() === 'admin' && pass === 'Michelin') {
        const adminUser: User = { id: 'admin001', name: 'Administrador', login: 'admin', role: 'admin' };
        setUser(adminUser);
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        setIsLoading(false);
        return true;
    }

    // Check Firestore for other users
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
    const userExists = await findUserByLogin(newUser.login);
    if (userExists) return false;
    
    await addDoc(usersCollection, newUser);
    await refreshUsers();
    return true;
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
    const existingUserWithLogin = await findUserByLogin(updatedUser.login);
    if (existingUserWithLogin && existingUserWithLogin.id !== updatedUser.id) {
        return false; // Login already taken by another user
    }
    
    const userDoc = doc(db, 'users', updatedUser.id);
    await updateDoc(userDoc, updatedUser as any); // Use 'as any' to avoid TS issues with password field

    if (user && user.id === updatedUser.id) {
        const { password, ...userToStore } = updatedUser;
        setUser(userToStore);
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
    }
    await refreshUsers();
    return true;
  };

  const findUserByLogin = async (loginInput: string): Promise<User | undefined> => {
    const q = query(usersCollection, where("login", "==", loginInput.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return undefined;
  }

  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDocs(query(usersCollection, where(doc.id, "==", userId), where("password", "==", currentPasswordInput)));

    if (userDoc.empty) {
        return { success: false, message: 'Senha atual incorreta.' };
    }
    
    await updateDoc(userDocRef, { password: newPasswordInput });
    return { success: true, message: 'Senha alterada com sucesso.' };
  };

  const deleteUser = async (userId: string): Promise<void> => {
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
