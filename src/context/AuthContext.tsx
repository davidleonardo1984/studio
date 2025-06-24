
"use client";

import type { User, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (login: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  users: User[];
  addUser: (newUser: User) => Promise<boolean>;
  updateUser: (updatedUser: User) => Promise<boolean>;
  findUserByLogin: (login: string) => User | undefined;
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HARDCODED_ADMIN_USER = {
    id: 'admin001',
    name: 'Administrador',
    login: 'admin',
    role: 'admin' as UserRole,
};

// This function simulates checking passwords on a backend.
// In a real app, this would be an API call with hashed passwords.
const checkCredentials = async (login: string, pass: string): Promise<User | null> => {
    const lowerLogin = login.toLowerCase();
    
    // Special case for the hardcoded admin user for demo purposes
    if (lowerLogin === 'admin' && pass === 'Michelin') {
        return HARDCODED_ADMIN_USER;
    }

    // Check against Firestore for other users. THIS IS INSECURE FOR A REAL APP.
    const q = query(collection(db, "users"), where("login", "==", lowerLogin), where("password", "==", pass));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const { password, ...userData } = userDoc.data(); // Exclude password from returned user object
        return { id: userDoc.id, ...userData } as User;
    }
    
    return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initial load: check local storage, then fetch users
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Listen for real-time updates to the users collection
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList: User[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        
        // Ensure admin user is always in the list for management purposes
        if (!usersList.some(u => u.login === 'admin')) {
             usersList.unshift(HARDCODED_ADMIN_USER);
        }
        setUsers(usersList);
    }, (error) => {
        console.error("Error fetching users:", error);
        // Fallback to just admin if firestore fails
        setUsers([HARDCODED_ADMIN_USER]);
    });
    
    return () => unsubscribe();
  }, []);

  // Update current user if their data changes in the main list
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
            // Current user was deleted, log out
            logout();
        }
    }
  }, [users, user]);


  const login = async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    const foundUser = await checkCredentials(loginInput, pass);

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

  const addUser = async (newUser: User): Promise<boolean> => {
    const existingUser = findUserByLogin(newUser.login);
    if (existingUser) {
      return false; 
    }
    // In a real app, hash the password here before saving
    await addDoc(collection(db, "users"), newUser);
    return true;
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
    const userRef = doc(db, "users", updatedUser.id);
    // Ensure login uniqueness on update
    if (users.some(u => u.id !== updatedUser.id && u.login.toLowerCase() === updatedUser.login.toLowerCase())) {
      return false; 
    }
    // Don't save an empty password field to the database if it wasn't changed
    const { password, ...userData } = updatedUser;
    const dataToUpdate: any = userData;
    if (password) {
        dataToUpdate.password = password; // In a real app, hash this
    }
    await updateDoc(userRef, dataToUpdate);
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

  const deleteUser = async (userId: string) => {
    await deleteDoc(doc(db, "users", userId));
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
