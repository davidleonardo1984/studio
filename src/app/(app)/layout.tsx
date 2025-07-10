
"use client";

import { useEffect, type ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';


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
    // Show a full-page loading skeleton or a simpler loading state
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
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-full w-full">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-background w-full">
            {children}
          </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
