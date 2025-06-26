
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
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, LogIn, LogOut, Edit3, Users, History, KeyRound, ShieldCheck, ListChecks } from 'lucide-react';
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
  { href: '/aguardando-liberacao', label: 'Aguardando Liberação', icon: ListChecks },
  { href: '/cadastros-gerais', label: 'Cadastros Gerais', icon: Edit3 },
  { href: '/historico-acesso', label: 'Histórico de Acesso', icon: History },
  { href: '/cadastro-acesso', label: 'Cadastro de Acesso', icon: Users, adminOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (user?.role === 'gate_agent') {
      return item.href === '/aguardando-liberacao';
    }
    return !item.adminOnly || (item.adminOnly && user?.role === 'admin');
  });

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="flex items-center justify-between p-2">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors">
          <ShieldCheck className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg group-data-[collapsible=icon]:hidden font-headline">Portaria Única RES</span>
        </Link>
      </SidebarHeader>
      <SidebarContent asChild>
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-2">
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} >
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    tooltip={{children: item.label, side: "right", className: "bg-sidebar-accent text-sidebar-accent-foreground"}}
                    className="justify-start"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <div className="text-center text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          <p>Desenvolvido por David Leonardo</p>
          <p>Versão 1.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
