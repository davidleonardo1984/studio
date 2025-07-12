
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry, Driver } from '@/lib/types';
import { CheckCircle, Clock, Search, Loader2, AlertTriangle, ClipboardCopy, Bell, MapPin, Edit2, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';
import { useIsClient } from '@/hooks/use-is-client';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, Timestamp, getDocs, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { generateVehicleEntryImage } from '@/lib/pdf-generator';
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


const colorPalette = [
  { bg: 'bg-sky-100', text: 'text-sky-800' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
  { bg: 'bg-rose-100', text: 'text-rose-800' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { bg: 'bg-teal-100', text: 'text-teal-800' },
  { bg: 'bg-lime-100', text: 'text-lime-800' },
];

export default function AguardandoLiberacaoPage() {
  const { toast } = useToast();
  const { user, users } = useAuth();
  const router = useRouter();
  const [waitingVehicles, setWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [persons, setPersons] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const isClient = useIsClient();
  const [now, setNow] = useState(new Date());

  const [isLiberationDialogOpen, setIsLiberationDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);
  const [liberatedByName, setLiberatedByName] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); 

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!db) {
        setIsLoading(false);
        return;
    }
    const fetchPersons = async () => {
        try {
            const personsPromise = getDocs(query(collection(db, 'persons'), orderBy("name")));
            const [personsSnap] = await Promise.all([personsPromise]);
            setPersons(personsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
        } catch (error) {
            console.error("Failed to fetch persons:", error);
            toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar os dados de cadastro." });
        }
    };
    fetchPersons();
  }, [toast]);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    };
    setIsLoading(true);
    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('status', '==', 'aguardando_patio'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newVehicles: VehicleEntry[] = [];
      querySnapshot.forEach((doc) => {
        newVehicles.push({ id: doc.id, ...doc.data() } as VehicleEntry);
      });
      newVehicles.sort((a, b) => {
        const dateA = (a.arrivalTimestamp as any)?.toDate ? (a.arrivalTimestamp as any).toDate() : new Date(a.arrivalTimestamp as string);
        const dateB = (b.arrivalTimestamp as any)?.toDate ? (b.arrivalTimestamp as any).toDate() : new Date(b.arrivalTimestamp as string);
        return dateA.getTime() - dateB.getTime();
      });
      setWaitingVehicles(newVehicles);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching waiting vehicles:", error);
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar os veículos em tempo real." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!isLiberationDialogOpen) {
      setSelectedVehicle(null);
      setLiberatedByName('');
    }
  }, [isLiberationDialogOpen]);


  const calculateWaitingTime = useCallback((arrivalTimestamp: VehicleEntry['arrivalTimestamp'], currentTime: Date): string => {
    if (!arrivalTimestamp) return 'N/A';
    const arrivalDate = (arrivalTimestamp as any).toDate ? (arrivalTimestamp as any).toDate() : new Date(arrivalTimestamp as string);
    if (isNaN(arrivalDate.getTime())) return 'Inválido';

    let diff = currentTime.getTime() - arrivalDate.getTime();
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);

    const mins = Math.floor(diff / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || (days === 0 && hours === 0)) parts.push(`${mins}m`);
    
    if (parts.length === 0) return "Agora";

    return parts.join(' ');
  }, []);


  const filteredVehicles = useMemo(() => {
    return waitingVehicles.filter(v =>
      v.plate1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transportCompanyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.internalDestinationName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waitingVehicles, searchTerm]);
  
  const destinationColorMap = useMemo(() => {
    const uniqueDestinations = [...new Set(waitingVehicles.map(v => v.internalDestinationName))];
    const map = new Map<string, { bg: string, text: string }>();
    uniqueDestinations.forEach((destination, index) => {
      map.set(destination, colorPalette[index % colorPalette.length]);
    });
    return map;
  }, [waitingVehicles]);
  
  const handleEdit = (entryId: string) => {
    router.push(`/registro-entrada?id=${entryId}`);
  };

  const handleNotify = async (vehicle: VehicleEntry) => {
    if (!db || !user) return;
    
    const driver = persons.find(p => p.name.toLowerCase() === vehicle.driverName.toLowerCase());
    const phone = driver?.phone || '';

    try {
      const agentWhoNotified = users.find(u => u.login === user.login);
      
      await addDoc(collection(db, 'notifications'), {
        vehicleEntryId: vehicle.id,
        plate1: vehicle.plate1,
        plate2: vehicle.plate2 || '',
        plate3: vehicle.plate3 || '',
        driverName: vehicle.driverName,
        transportCompanyName: vehicle.transportCompanyName,
        internalDestinationName: vehicle.internalDestinationName,
        driverPhone: phone,
        createdAt: Timestamp.now(),
        createdBy: user.login,
      });

      const vehicleDocRef = doc(db, 'vehicleEntries', vehicle.id);
      await updateDoc(vehicleDocRef, { 
        notified: true, 
        notifiedBy: user.login,
        liberatedBy: agentWhoNotified?.name || user.login
      });

    } catch (error) {
      console.error("Error sending notification:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar a notificação." });
    }
  };


  const handleApproveAndPrint = async (vehicle: VehicleEntry, liberatedBy?: string) => {
    if (!db || !user) return;
  
    const vehicleDocRef = doc(db, 'vehicleEntries', vehicle.id);
    
    const updatedVehicleData: any = {
        status: 'entrada_liberada' as const,
        liberationTimestamp: Timestamp.fromDate(new Date()),
        liberatedBy: vehicle.notified ? vehicle.liberatedBy : liberatedBy,
    };
    
    try {
        await updateDoc(vehicleDocRef, updatedVehicleData);
        
        // Remove notification after approval
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

  const initiateLiberation = (vehicle: VehicleEntry) => {
    setSelectedVehicle(vehicle);
    if (vehicle.notified) {
      handleApproveAndPrint(vehicle);
    } else {
      setLiberatedByName('');
      setIsLiberationDialogOpen(true);
    }
  };
  
  const handleConfirmLiberation = () => {
    if (selectedVehicle) {
      handleApproveAndPrint(selectedVehicle, liberatedByName);
    }
    setIsLiberationDialogOpen(false);
  };


  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
  };

  const formatDate = (timestamp: VehicleEntry['arrivalTimestamp']) => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
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

    const handleCopyWaitingData = async () => {
        if (filteredVehicles.length === 0) {
        toast({ variant: 'destructive', title: 'Nenhum dado', description: 'Não há veículos aguardando para copiar.' });
        return;
        }

        const dataToCopy = filteredVehicles.map((vehicle, index) => {
        const driver = persons.find(p => p.name.toLowerCase() === vehicle.driverName.toLowerCase());
        const phone = driver?.phone ? formatDisplayPhoneNumber(driver.phone) : 'N/A';
        return [
            `Ordem: ${index + 1}`,
            `Motorista: ${vehicle.driverName}`,
            `Telefone: ${phone}`,
            `Transportadora / Empresa: ${vehicle.transportCompanyName}`,
            `Destino Interno: ${vehicle.internalDestinationName}`,
            `Placa 1: ${vehicle.plate1}`,
            `Observação: ${vehicle.observation || '-'}`,
            `Data/Hora Chegada: ${formatDate(vehicle.arrivalTimestamp)}`
        ].join('\n');
        }).join('\n\n---\n\n');

        try {
        await navigator.clipboard.writeText(dataToCopy);
        toast({ title: 'Dados Copiados!', description: 'Os dados dos veículos aguardando foram copiados.' });
        } catch (err) {
        console.error('Failed to copy: ', err);
        toast({ variant: 'destructive', title: 'Erro ao Copiar', description: 'Não foi possível copiar os dados.' });
        }
    };

  if (!isClient) {
    return (
      <div className="container mx-auto pb-8">
        <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="container mx-auto pb-8">
        <Card className="shadow-lg mt-4 max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-destructive flex items-center">
                    <AlertTriangle className="mr-3 h-6 w-6" />
                    Erro de Configuração do Banco de Dados
                </CardTitle>
                <CardDescription>
                    A conexão com o banco de dados não foi estabelecida.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Firebase não está conectado</AlertTitle>
                    <AlertDescription>
                       Por favor, verifique se as credenciais do seu projeto Firebase estão configuradas corretamente nas variáveis de ambiente. Os dados não podem ser carregados ou salvos sem esta configuração.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <>
    <div className="container mx-auto pb-8">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center -mt-4">
        <div>
            <h1 className="text-3xl font-bold text-primary font-headline">
                Veículos Aguardando Liberação
            </h1>
            <p className="text-muted-foreground">Lista de veículos no pátio que necessitam de aprovação para entrada.</p>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                    <CardTitle className="text-xl font-semibold text-primary">Lista de Espera ({filteredVehicles.length})</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <Input
                        id="searchWaiting"
                        type="text"
                        placeholder="Buscar por placa, motorista, destino..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:max-w-xs"
                        prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                        autoComplete="off"
                    />
                    {user?.role !== 'gate_agent' && (
                        <Button 
                            onClick={handleCopyWaitingData} 
                            variant="outline" 
                            size="sm" 
                            className="w-full sm:w-auto"
                            disabled={filteredVehicles.length === 0}
                        >
                            <ClipboardCopy className="mr-2 h-4 w-4" />
                            Copiar Dados
                        </Button>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Carregando veículos...</p>
             </div>
          ) : filteredVehicles.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Transportadora / Empresa</TableHead>
                  <TableHead>Destino Interno</TableHead>
                  <TableHead>Placa 1</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Data/Hora Chegada</TableHead>
                  <TableHead>Tempo no Pátio</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle, index) => {
                    const driver = persons.find(p => p.name.toLowerCase() === vehicle.driverName.toLowerCase());
                    const phone = driver?.phone ? formatDisplayPhoneNumber(driver.phone) : 'N/A';
                    const destinationColors = destinationColorMap.get(vehicle.internalDestinationName);
                    return (
                    <TableRow key={vehicle.id} className={cn(!!vehicle.notified && user?.role !== 'gate_agent' && 'bg-amber-100')}>
                        <TableCell className="py-1">{index + 1}</TableCell>
                        <TableCell className="py-1">{vehicle.driverName}</TableCell>
                        <TableCell className="py-1">{phone}</TableCell>
                        <TableCell className="py-1">
                            {vehicle.transportCompanyName}
                        </TableCell>
                        <TableCell className="py-1">
                            <span className={cn(
                                'inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap',
                                destinationColors?.bg,
                                destinationColors?.text
                            )}>
                                {vehicle.internalDestinationName}
                            </span>
                        </TableCell>
                        <TableCell className="py-1">{vehicle.plate1}</TableCell>
                        <TableCell className="max-w-xs truncate py-1">{vehicle.observation || '-'}</TableCell>
                        <TableCell className="py-1">{formatDate(vehicle.arrivalTimestamp)}</TableCell>
                        <TableCell className="font-medium text-amber-700 py-1">{calculateWaitingTime(vehicle.arrivalTimestamp, now)}</TableCell>
                        <TableCell className="text-right space-x-2 py-1">
                        {user?.role === 'gate_agent' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleNotify(vehicle)}
                                disabled={!!vehicle.notified}
                            >
                                <Bell className="mr-2 h-4 w-4" />
                                {vehicle.notified ? 'Notificado' : 'Notificar Liberação'}
                            </Button>
                        )}
                        {user?.role !== 'gate_agent' && (
                          <>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEdit(vehicle.id)}
                                className="w-36"
                            >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Editar Entrada
                            </Button>
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => initiateLiberation(vehicle)}
                                className="bg-green-600 hover:bg-green-700 text-white w-36"
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Liberar Entrada
                            </Button>
                          </>
                        )}
                        </TableCell>
                    </TableRow>
                    );
                })}
              </TableBody>
            </Table>
            </div>
          ) : (
             <div className="text-center py-12">
                <Clock className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-xl font-medium text-muted-foreground">
                    {searchTerm ? "Nenhum veículo encontrado com os termos da busca." : "Nenhum veículo aguardando liberação no momento."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    Quando um registro de entrada for marcado como "Aguardar no Pátio", ele aparecerá aqui.
                </p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
    
    <AlertDialog open={isLiberationDialogOpen} onOpenChange={setIsLiberationDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Confirmar Liberação de {selectedVehicle?.plate1}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Como esta entrada não foi notificada, informe quem está liberando para que conste no documento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="liberado-por-dialog" className="text-right">Liberado por (Opcional)</Label>
          <Input
            id="liberado-por-dialog"
            placeholder="Seu nome"
            value={liberatedByName}
            onChange={(e) => setLiberatedByName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmLiberation();
              }
            }}
            className="mt-2"
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmLiberation}>
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
