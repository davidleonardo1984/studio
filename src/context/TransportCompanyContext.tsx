
"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { TransportCompany } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

interface TransportCompanyContextType {
  companies: TransportCompany[];
  isLoading: boolean;
  addCompany: (newCompanyData: { name: string }) => Promise<void>;
  updateCompany: (companyId: string, updatedCompanyData: { name: string }) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const TransportCompanyContext = createContext<TransportCompanyContextType | undefined>(undefined);

export const TransportCompanyProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<TransportCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanies = async () => {
    setIsLoading(true);
    if (!db) {
        // Silently fail if db is not configured, or show a toast
        console.warn("Firebase is not configured. Transport companies cannot be fetched.");
        setIsLoading(false);
        return;
    }
    const companiesCollection = collection(db, 'transportCompanies');

    try {
      const q = query(companiesCollection, orderBy("name"));
      const snapshot = await getDocs(q);
      const companiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportCompany));
      setCompanies(companiesList);
    } catch (error)      {
      console.error("Failed to fetch transport companies:", error);
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar as Transportadoras / Empresas." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCompany = async (newCompanyData: { name: string }) => {
    if (!db) {
      toast({ variant: 'destructive', title: "Erro de Configuração", description: "O Firebase não está configurado." });
      throw new Error("Firebase not configured.");
    }
    const companiesCollection = collection(db, 'transportCompanies');
    try {
      const docRef = await addDoc(companiesCollection, newCompanyData);
      const newCompany = { id: docRef.id, ...newCompanyData };
      setCompanies(prevCompanies => 
        [...prevCompanies, newCompany].sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("Error adding company:", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível adicionar a Transportadora / Empresa." });
      throw error; // Re-throw to be caught in the form
    }
  };
  
  const updateCompany = async (companyId: string, updatedCompanyData: { name: string }) => {
     if (!db) {
      toast({ variant: 'destructive', title: "Erro de Configuração", description: "O Firebase não está configurado." });
      throw new Error("Firebase not configured.");
    }
    try {
      const companyDoc = doc(db, 'transportCompanies', companyId);
      await updateDoc(companyDoc, updatedCompanyData);
      setCompanies(prevCompanies => 
        prevCompanies
          .map(c => c.id === companyId ? { ...c, ...updatedCompanyData } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("Error updating company:", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível atualizar a Transportadora / Empresa." });
      throw error;
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!db) {
      toast({ variant: 'destructive', title: "Erro de Configuração", description: "O Firebase não está configurado." });
      throw new Error("Firebase not configured.");
    }
    try {
      const companyDoc = doc(db, 'transportCompanies', companyId);
      await deleteDoc(companyDoc);
      setCompanies(prevCompanies => prevCompanies.filter(c => c.id !== companyId));
      toast({ title: 'Excluído!', description: 'A empresa foi removida com sucesso.' });
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível excluir a Transportadora / Empresa." });
      throw error;
    }
  };


  return (
    <TransportCompanyContext.Provider value={{ companies, isLoading, addCompany, updateCompany, deleteCompany, refreshCompanies: fetchCompanies }}>
      {children}
    </TransportCompanyContext.Provider>
  );
};

export const useTransportCompanies = (): TransportCompanyContextType => {
  const context = useContext(TransportCompanyContext);
  if (context === undefined) {
    throw new Error('useTransportCompanies must be used within a TransportCompanyProvider');
  }
  return context;
};
