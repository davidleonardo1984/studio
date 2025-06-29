
"use client";

import { useEffect, type ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BellRing } from 'lucide-react';


export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'gateNotification' && event.newValue) {
        try {
          const { plate1, timestamp } = JSON.parse(event.newValue);
          // Check timestamp to avoid showing stale notifications on page load
          if (Date.now() - timestamp < 5000) { 
            setNotificationBanner(`Solicitação de liberação para o veículo ${plate1} foi enviada!`);
            setTimeout(() => {
              setNotificationBanner(null);
            }, 10000); // Hide after 10 seconds
          }
        } catch (e) {
            console.error("Failed to parse storage event for notification banner", e)
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
            {notificationBanner && (
              <Alert className="bg-amber-100 border-amber-400 text-amber-800 mb-6 animate-in fade-in-50">
                  <BellRing className="h-5 w-5 text-amber-600" />
                  <AlertTitle>Nova Solicitação de Liberação</AlertTitle>
                  <AlertDescription>{notificationBanner}</AlertDescription>
              </Alert>
            )}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
