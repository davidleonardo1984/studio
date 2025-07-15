
"use client";

import React, { useEffect, type ReactNode, useState } from 'react';
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
  const [isFocusMode, setIsFocusMode] = useState(false);

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

  // Special handling for focus mode on specific pages
  useEffect(() => {
     if (pathname === '/registro-saida') {
       // The page itself will handle its focus state, we just need to provide the right layout
     } else {
       setIsFocusMode(false);
     }
  }, [pathname]);

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

  // A bit of a hack to get the focus mode button to work from the child page
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // @ts-ignore
      return React.cloneElement(child, { isFocusMode, setIsFocusMode });
    }
    return child;
  });


  return (
    <SidebarProvider defaultOpen={!isFocusMode}>
        {!isFocusMode && <AppSidebar />}
        <SidebarInset className={`flex h-screen flex-col ${isFocusMode ? 'ml-0' : ''}`}>
        {!isFocusMode && <AppHeader />}
        <main className={`flex-1 overflow-auto bg-background ${isFocusMode ? 'p-0' : ''}`}>
          <div className={`${isFocusMode ? 'h-full flex items-center justify-center' : 'p-4 sm:p-6 lg:p-8'}`}>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
