
"use client";

import { useState, useEffect, Fragment, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LogOut, ChevronDown, AlignLeft, KeyRound, Expand, Shrink, Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import type { AppNotification, VehicleEntry } from '@/lib/types';
import { collection, query, onSnapshot, orderBy, Timestamp, doc, getDoc, updateDoc, where, writeBatch, getDocs } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { DocumentPreviewModal } from './PdfPreviewModal';
import { generateVehicleEntryImage } from '@/lib/pdf-generator';


const formatDisplayPhoneNumber = (val: string): string => {
    if (typeof val !== 'string' || !val) return "";
    const digits = val.replace(/\D/g, "");
    if (digits.length === 0) return "";
    let formatted = `(${digits.substring(0, 2)}`;
    if (digits.length > 2) {
        const end = digits.length === 11 ? 7 : 6;
        formatted += `) ${digits.substring(2, end)}`;
        if (digits.length > 6) {
            formatted += `-${digits.substring(end, 11)}`;
        }
    }
    return formatted;
};

export function AppHeader() {
  const { user, logout, users } = useAuth();
  const { toast } = useToast();
  const { toggleSidebar, isMobile } = useSidebar();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const isInitialNotificationsLoad = useRef(true);

  useEffect(() => {
    if (!db || !user || user.role === 'gate_agent' || user.role === 'exit_agent') return;

    const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      
      if (!isInitialNotificationsLoad.current) {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const newNotif = { id: change.doc.id, ...change.doc.data() } as AppNotification;
                toast({
                    title: "Nova Solicitação de Liberação",
                    description: `Veículo ${newNotif.plate1} (${newNotif.transportCompanyName}) aguarda aprovação.`,
                    duration: 60000,
                });
            }
        });
      }

      const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(fetchedNotifications);

      if (isInitialNotificationsLoad.current) {
        isInitialNotificationsLoad.current = false;
      }

    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [user, toast]);


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  useEffect(() => {
    if (!isDialogOpen) {
      setSelectedNotification(null);
    }
  }, [isDialogOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleApproveEntry = async (notification: AppNotification) => {
    if (!db) return;
    
    const vehicleDocRef = doc(db, 'vehicleEntries', notification.vehicleEntryId);
    const vehicleDocSnap = await getDoc(vehicleDocRef);

    if (!vehicleDocSnap.exists()) {
        toast({ variant: "destructive", title: "Erro", description: "Veículo não encontrado no banco de dados." });
        return;
    }
    const vehicle = { id: vehicleDocSnap.id, ...vehicleDocSnap.data() } as VehicleEntry;

    const agentWhoNotified = users.find(u => u.login === notification.createdBy);
    
    const updatedVehicleData = {
        status: 'entrada_liberada' as const,
        liberationTimestamp: Timestamp.fromDate(new Date()),
        liberatedBy: agentWhoNotified?.name || notification.createdBy, // Use agent's name, fallback to login
    };
    
    try {
        await updateDoc(vehicleDocRef, updatedVehicleData);
        
        const notificationsQuery = query(collection(db, 'notifications'), where('vehicleEntryId', '==', vehicle.id));
        const notificationSnapshot = await getDocs(notificationsQuery);
        if (!notificationSnapshot.empty) {
            const batch = writeBatch(db);
            notificationSnapshot.forEach(notificationDoc => {
                batch.delete(notificationDoc.ref);
            });
            await batch.commit();
        }

        const updatedVehicle: VehicleEntry = { ...vehicle, ...updatedVehicleData };

        toast({
            title: `Veículo ${updatedVehicle.plate1} Liberado!`,
            description: `Preparando documento para visualização...`,
            className: 'bg-green-600 text-white',
            icon: <CheckCircle className="h-6 w-6 text-white" />
        });

        const imageResult = await generateVehicleEntryImage(updatedVehicle);

        if (imageResult.success && imageResult.imageUrl) {
            setPreviewImageUrl(imageResult.imageUrl);
            setIsPreviewModalOpen(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro no Documento',
                description: `Falha ao gerar o documento para ${updatedVehicle.plate1}. Detalhe: ${imageResult.error || 'N/A'}`,
            });
        }
    } catch (error) {
        console.error("Error approving entry: ", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível liberar la entrada do veículo." });
    }
  };
  
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
  };

  const roleText = user?.role === 'admin' ? 'Administrador' : user?.role === 'gate_agent' ? 'Agente de Pátio' : user?.role === 'exit_agent' ? 'Agente de Saída' : 'Usuário';

  const NotificationBell = () => (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">{notifications.length}</Badge>
                )}
                <span className="sr-only">Notificações</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notificações</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-[30rem] p-0" align="end">
        <DropdownMenuLabel className="p-3 pb-2">Notificações de Liberação</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0"/>
        {notifications.length > 0 ? (
          <DropdownMenuGroup className="p-0">
            {notifications.map((notif, index) => (
              <Fragment key={notif.id}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex-col items-start gap-1 p-3 cursor-default focus:bg-accent/50">
                  <div className="flex justify-between w-full items-start">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Placa(s): {[notif.plate1, notif.plate2, notif.plate3].filter(Boolean).join(' / ')}</p>
                            <p className="text-xs text-muted-foreground">{notif.driverName}</p>
                            <p className="text-xs text-muted-foreground">{notif.transportCompanyName}</p>
                            {notif.internalDestinationName && <p className="text-xs text-muted-foreground">Destino: {notif.internalDestinationName}</p>}
                             {notif.driverPhone && <p className="text-xs text-muted-foreground">Telefone: {formatDisplayPhoneNumber(notif.driverPhone)}</p>}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap pl-2">
                      {formatDistanceToNow((notif.createdAt as Timestamp).toDate(), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  
                  <div className="w-full flex justify-end mt-2">
                      <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white h-8" 
                          onClick={() => {
                              setSelectedNotification(notif);
                              setIsDialogOpen(true);
                          }}
                      >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Liberar Entrada
                      </Button>
                  </div>
                </DropdownMenuItem>
                {index < notifications.length - 1 && <DropdownMenuSeparator className="my-0" />}
              </Fragment>
            ))}
          </DropdownMenuGroup>
        ) : (
          <div className="p-4 py-6 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-base text-foreground">Tudo em ordem!</p>
            <p className="text-xs mt-1">
              Não há notificações de liberação pendentes no momento.
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const agentName = selectedNotification ? (users.find(u => u.login === selectedNotification.createdBy)?.name || selectedNotification.createdBy) : '';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle Menu">
              <AlignLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                  {isFullscreen ? <Shrink className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                  <span className="sr-only">{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {user && user.role !== 'gate_agent' && user.role !== 'exit_agent' && <NotificationBell />}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col items-start md:flex">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{roleText}</span>
                  </div>
                  <ChevronDown className="ml-1 h-4 w-4 opacity-50 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.login}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/mudar-senha" passHref>
                  <DropdownMenuItem>
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Mudar Senha</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Liberação de {[selectedNotification?.plate1, selectedNotification?.plate2, selectedNotification?.plate3].filter(Boolean).join(' / ')}?</AlertDialogTitle>
            <AlertDialogDescription>
              O agente {agentName} solicitou a liberação. A liberação será registrada em nome dele. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedNotification) {
                  handleApproveEntry(selectedNotification);
                  setIsDialogOpen(false);
                }
              }}
            >
              Confirmar e Gerar Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentPreviewModal 
          isOpen={isPreviewModalOpen}
          onClose={handleClosePreview}
          imageUrl={previewImageUrl}
      />
    </>
  );
}
