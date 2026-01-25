
"use client";

import React, { useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

const AppSidebar = dynamic(() => import('@/components/layout/AppSidebar').then(mod => mod.AppSidebar), {
  ssr: false,
});

const AppHeader = dynamic(() => import('@/components/layout/AppHeader').then(mod => mod.AppHeader), {
  ssr: false,
  loading: () => <Skeleton className="sticky top-0 z-10 h-16 w-full border-b" />,
});


export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'gate_agent') {
      const allowedPaths = ['/aguardando-liberacao', '/mudar-senha'];
      if (!allowedPaths.includes(pathname)) {
        router.replace('/aguardando-liberacao');
      }
    } else if (user.role === 'exit_agent') {
      const allowedPaths = ['/registro-saida', '/mudar-senha'];
      if (!allowedPaths.includes(pathname)) {
        router.replace('/registro-saida');
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 p-8 rounded-lg shadow-xl bg-card">
          <h1 className="text-2xl font-bold text-center text-primary">Verificando acesso...</h1>
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset className={`flex h-screen flex-col`}>
        <AppHeader />
        <main className={`flex-1 overflow-auto bg-background`}>
          <div className={`p-4 sm:p-6 lg:p-8`}>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
