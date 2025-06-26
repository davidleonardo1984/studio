
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Edit, LogIn, LogOut, ListChecks, History, Users, Calendar, Sigma, TrendingUp, CalendarDays, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import type { VehicleEntry } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

// Stats Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

// Stats Section Component
function DashboardStats() {
    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        thisMonth: 0,
        thisYear: 0,
        dailyAvg: "0.00",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const now = new Date();

    useEffect(() => {
        const fetchEntriesAndCalculateStats = async () => {
            if (!db) {
                setError("O banco de dados não está configurado.");
                setIsLoading(false);
                return;
            }
            try {
                const entriesCollection = collection(db, 'vehicleEntries');
                const q = query(entriesCollection, orderBy('arrivalTimestamp', 'asc'));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setIsLoading(false);
                    return; // No data, stats remain at 0
                }

                const entries = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Ensure arrivalTimestamp is a Date object for calculation
                    const arrivalTimestamp = (data.arrivalTimestamp as Timestamp)?.toDate ? (data.arrivalTimestamp as Timestamp).toDate() : new Date(data.arrivalTimestamp);
                    return { ...data, arrivalTimestamp } as Omit<VehicleEntry, 'arrivalTimestamp'> & { arrivalTimestamp: Date };
                });

                const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                const todayEntries = entries.filter(e => e.arrivalTimestamp >= todayDate);

                const thisMonthEntries = entries.filter(e => 
                    e.arrivalTimestamp.getMonth() === now.getMonth() && e.arrivalTimestamp.getFullYear() === now.getFullYear()
                );

                const thisYearEntries = entries.filter(e => 
                    e.arrivalTimestamp.getFullYear() === now.getFullYear()
                );

                // Daily Average Calculation
                const firstEntryDate = entries[0].arrivalTimestamp;
                const startDate = new Date(firstEntryDate.getFullYear(), firstEntryDate.getMonth(), firstEntryDate.getDate());
                const timeDiff = todayDate.getTime() - startDate.getTime();
                const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
                const dailyAvg = (entries.length / daysDiff).toFixed(2);

                setStats({
                    total: entries.length,
                    today: todayEntries.length,
                    thisMonth: thisMonthEntries.length,
                    thisYear: thisYearEntries.length,
                    dailyAvg: dailyAvg,
                });

            } catch (err) {
                console.error("Error fetching stats:", err);
                setError("Não foi possível carregar as estatísticas de acesso.");
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Carregar Estatísticas',
                    description: 'Houve um problema ao buscar os dados de acesso. Pode ser necessário um índice no Firestore.'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchEntriesAndCalculateStats();
    }, [toast]);

    if (isLoading) {
        return (
            <div className="mb-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-muted rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-12 bg-muted rounded mb-1" />
                            <div className="h-3 w-32 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="mb-12">
                <Card className="border-destructive">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <div>
                            <CardTitle className="text-destructive">Erro ao Carregar Estatísticas</CardTitle>
                            <CardDescription>{error}</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-primary mb-4">Estatísticas de Acesso</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title="Entradas Hoje" value={stats.today} icon={Calendar} description="Registros desde à meia-noite" />
                <StatCard title="Entradas no Mês" value={stats.thisMonth} icon={CalendarDays} description={`Total para ${now.toLocaleString('pt-BR', { month: 'long' })}`} />
                <StatCard title="Entradas no Ano" value={stats.thisYear} icon={TrendingUp} description={`Total de registros em ${now.getFullYear()}`} />
                <StatCard title="Média Diária" value={stats.dailyAvg} icon={Sigma} description="Média de entradas por dia" />
                <StatCard title="Total de Entradas" value={stats.total} icon={History} description="Desde o início dos registros" />
            </div>
        </div>
    );
}

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
  const { user } = useAuth();
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
      
      {(user?.role === 'admin' || user?.canViewDashboardStats) && <DashboardStats />}

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
