"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'gate_agent') {
          router.replace('/aguardando-liberacao');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="space-y-4 p-8 rounded-lg shadow-xl bg-card">
        <h1 className="text-2xl font-bold text-center text-primary">Carregando Portaria Única RES...</h1>
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
