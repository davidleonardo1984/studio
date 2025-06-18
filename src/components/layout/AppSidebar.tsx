
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, LogIn, LogOut, ClipboardList, Edit3, Users, History, Building, Truck, MapPin, Settings, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Painel Inicial', icon: Home },
  { href: '/registro-entrada', label: 'Registro de Entrada', icon: LogIn },
  { href: '/registro-saida', label: 'Registro de Saída', icon: LogOut },
  { href: '/cadastros-gerais', label: 'Cadastros Gerais', icon: Edit3 },
  { href: '/historico-acesso', label: 'Histórico de Acesso', icon: History },
  { href: '/cadastro-acesso', label: 'Cadastro de Acesso', icon: Users, adminOnly: true },
  { href: '/aguardando-liberacao', label: 'Aguardando Liberação', icon: ClipboardList },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || (item.adminOnly && user?.role === 'admin')
  );

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="flex items-center justify-between p-2">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors">
          <ShieldCheck className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg group-data-[collapsible=icon]:hidden font-headline">PortariaRES</span>
        </Link>
        <SidebarTrigger className="group-data-[collapsible=icon]:hidden text-sidebar-foreground hover:text-sidebar-primary" />
      </SidebarHeader>
      <SidebarContent asChild>
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-2">
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    tooltip={{children: item.label, side: "right", className: "bg-sidebar-accent text-sidebar-accent-foreground"}}
                    className="justify-start"
                  >
                    <>
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      {user && (
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="justify-start w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
                 tooltip={{children: "Sair", side: "right", className: "bg-destructive text-destructive-foreground"}}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Sair</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
