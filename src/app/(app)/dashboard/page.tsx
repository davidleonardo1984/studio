
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Edit, LogIn, LogOut, ListChecks, History, Users } from "lucide-react";

interface QuickLinkProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const QuickLinkCard: React.FC<QuickLinkProps> = ({ href, title, description, icon: Icon }) => (
  <Link href={href} passHref>
    <Card className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-primary group-hover:text-accent transition-colors">{title}</CardTitle>
        <Icon className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <div className="p-4 pt-0">
        <Button variant="outline" size="sm" className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
          Acessar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  </Link>
);

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline mb-4">
          Bem-vindo à Portaria Única RES
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Gerencie o fluxo de entrada e saída da sua fábrica com eficiência e segurança.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12">
        <QuickLinkCard 
          href="/registro-entrada" 
          title="Registrar Entrada" 
          description="Cadastre novas entradas de veículos e motoristas."
          icon={LogIn} 
        />
        <QuickLinkCard 
          href="/registro-saida" 
          title="Registrar Saída" 
          description="Dê baixa em veículos que estão saindo da fábrica."
          icon={LogOut} 
        />
        <QuickLinkCard 
          href="/aguardando-liberacao" 
          title="Aguardando Liberação" 
          description="Veículos no pátio aguardando aprovação."
          icon={ListChecks} 
        />
        <QuickLinkCard 
          href="/historico-acesso" 
          title="Histórico de Acessos" 
          description="Consulte todos os registros de entrada e saída."
          icon={History} 
        />
      </div>

      <Card className="mb-12 overflow-hidden shadow-xl">
        <div>
          <div className="p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-semibold text-primary mb-3 font-headline">Gerenciamento Completo</h2>
            <p className="text-muted-foreground mb-6">
              A Portaria Única RES oferece ferramentas robustas para cadastros gerais, controle de usuários e relatórios detalhados, otimizando a segurança e a logística da sua operação.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/cadastros-gerais" passHref><Button variant="secondary"><Edit className="mr-2 h-4 w-4" />Cadastros Gerais</Button></Link>
              <Link href="/cadastro-acesso" passHref><Button variant="secondary"><Users className="mr-2 h-4 w-4" />Usuários</Button></Link>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Para suporte ou dúvidas, contate o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
