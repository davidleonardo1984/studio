
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry, Driver } from '@/lib/types';
import { CheckCircle, Clock, Search, Loader2, AlertTriangle, ClipboardCopy, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';
import html2canvas from 'html2canvas';
import { useIsClient } from '@/hooks/use-is-client';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, Timestamp, getDocs, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';


const formatDateForImage = (timestamp: any) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('pt-BR');
};


const generateVehicleEntryImage = async (entry: VehicleEntry): Promise<{ success: boolean; imageUrl?: string; error?: any }> => {
  const pdfContentHtml = `
    <div id="pdf-content-${entry.id}" style="font-family: Arial, sans-serif; padding: 20px; width: 580px; border: 1px solid #ccc; background-color: #fff;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 20px;">ROMANEIO DE ENTRADA</h2>
      <div style="display: flex; flex-direction: column; justify-content: flex-start; align-items: center; height: 100px; margin-bottom: 15px; border: 2px dashed #333; background-color: #f9f9f9; padding: 0 15px 0 15px;">
        <p style="font-family: 'Libre Barcode 39 Text', 'Code 39', 'Courier New', monospace; font-size: 48px; text-align: center; margin: 0; color: #000; line-height: 0.9;">*${entry.barcode}*</p>
        <p style="font-size: 9px; text-align: center; margin: 2px 0 0 0; color: #555;">(CÓDIGO DE BARRAS)</p>
      </div>

      <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 11px; line-height: 1.4;">
        <div style="display: inline-block; width: 48%; margin-right: 2%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Chegada:</p>
          <p style="margin: 0;">${formatDateForImage(entry.arrivalTimestamp)}</p>
        </div>
        <div style="display: inline-block; width: 48%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Liberação:</p>
          <p style="margin: 0;">${formatDateForImage(entry.liberationTimestamp)}</p>
        </div>
      </div>

      <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; line-height: 1.5;">
          <div style="width: 55%;">
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Motorista:</span> ${entry.driverName}</p>
            ${entry.assistant1Name ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Ajudante 1:</span> ${entry.assistant1Name}</p>` : ''}
            ${entry.assistant2Name ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Ajudante 2:</span> ${entry.assistant2Name}</p>` : ''}
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Placa 1:</span> ${entry.plate1}</p>
            ${entry.plate2 ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Placa 2:</span> ${entry.plate2}</p>` : ''}
            ${entry.plate3 ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Placa 3:</span> ${entry.plate3}</p>` : ''}
          </div>
          <div style="width: 40%; text-align: left;">
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Transportadora / Empresa:</span>${entry.transportCompanyName}</p>
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Destino Interno:</span>${entry.internalDestinationName}</p>
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Tipo Mov.:</span>${entry.movementType}</p>
          </div>
        </div>
        
        <div style="font-size: 11px; line-height: 1.5; margin-top: 5px;">
          <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Observação:</span> ${entry.observation || '-'}</p>
        </div>
      </div>
      
      ${entry.liberatedBy ? `
      <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 11px; margin-top: 15px;">
        <p style="margin: 0;"><span style="font-weight: bold;">LIBERADO POR:</span> ${entry.liberatedBy.toUpperCase()}</p>
      </div>
      ` : ''}

      <hr style="margin-top: 15px; margin-bottom: 10px; border: 0; border-top: 1px solid #eee;" />
      
      <div style="margin-top: 20px; font-size: 11px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px 10px; border-radius: 4px;">
        <div style="display: inline-block; width: 45%; margin-right: 5%;">
          <p style="text-align: center; margin: 0 0 40px 0;">Assinatura Responsável</p>
          <hr style="border: 0; border-top: 1px solid #333; margin-bottom: 0;" />
        </div>
        <div style="display: inline-block; width: 45%;">
          <p style="text-align: center; margin: 0 0 40px 0;">Registro</p>
          <hr style="border: 0; border-top: 1px solid #333; margin-bottom: 0;" />
        </div>
      </div>

      <p style="text-align: center; font-size: 9px; margin-top: 25px; color: #777;">Portaria Única RES - Romaneio de Entrada</p>
    </div>
  `;

  const hiddenDiv = document.createElement('div');
  hiddenDiv.style.position = 'absolute';
  hiddenDiv.style.left = '-9999px';
  hiddenDiv.innerHTML = pdfContentHtml;
  document.body.appendChild(hiddenDiv);

  try {
    const contentElement = document.getElementById(`pdf-content-${entry.id}`);
    if (!contentElement) {
      console.error('PDF content element not found');
      document.body.removeChild(hiddenDiv);
      return { success: false, error: 'Image content element not found' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const canvas = await html2canvas(contentElement, { scale: 2, useCORS: true, allowTaint: true });
    const imageUrl = canvas.toDataURL('image/png');
    return { success: true, imageUrl };

  } catch (err) {
    console.error("Error generating image:", err);
    return { success: false, error: err };
  } finally {
    if (document.body.contains(hiddenDiv)) {
      document.body.removeChild(hiddenDiv);
    }
  }
};


export default function AguardandoLiberacaoPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [waitingVehicles, setWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [persons, setPersons] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for "Liberado por" dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [liberatedByName, setLiberatedByName] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);

  // State for PDF Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const isClient = useIsClient();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update the current time every minute to refresh the "time in yard" display
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // 60000 ms = 1 minute

    return () => clearInterval(timer);
  }, []);

  // Fetch persons data for phone numbers
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

  // Real-time listener for waiting vehicles
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    };
    setIsLoading(true);
    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('status', '==', 'aguardando_patio'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const vehicles: VehicleEntry[] = [];
      querySnapshot.forEach((doc) => {
        vehicles.push({ id: doc.id, ...doc.data() } as VehicleEntry);
      });
      // Sort client-side to avoid needing a composite index
      vehicles.sort((a, b) => {
        const dateA = (a.arrivalTimestamp as any)?.toDate ? (a.arrivalTimestamp as any).toDate() : new Date(a.arrivalTimestamp as string);
        const dateB = (b.arrivalTimestamp as any)?.toDate ? (b.arrivalTimestamp as any).toDate() : new Date(b.arrivalTimestamp as string);
        return dateA.getTime() - dateB.getTime(); // asc
      });
      setWaitingVehicles(vehicles);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching waiting vehicles:", error);
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar os veículos em tempo real." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);


  // Reset local state when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setSelectedVehicle(null);
      setLiberatedByName('');
    }
  }, [isDialogOpen]);

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
      v.transportCompanyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waitingVehicles, searchTerm]);
  
  const handleNotify = async (vehicle: VehicleEntry) => {
    if (!db || !user) return;
    
    // Find the driver's phone number
    const driver = persons.find(p => p.name.toLowerCase() === vehicle.driverName.toLowerCase());
    const phone = driver?.phone || ''; // Get phone or empty string

    try {
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        vehicleEntryId: vehicle.id,
        plate1: vehicle.plate1,
        driverName: vehicle.driverName,
        driverPhone: phone,
        createdAt: Timestamp.now(),
        createdBy: user.login,
      });

      // Mark vehicle as notified
      const vehicleDocRef = doc(db, 'vehicleEntries', vehicle.id);
      await updateDoc(vehicleDocRef, { notified: true });

      toast({
        title: 'Notificação Enviada!',
        description: `Os administradores foram notificados sobre o veículo ${vehicle.plate1}.`,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar a notificação." });
    }
  };


  const handleApproveEntry = async (vehicle: VehicleEntry, liberatedBy?: string) => {
    if (!db) return;
    const vehicleDocRef = doc(db, 'vehicleEntries', vehicle.id);
    const updatedVehicleData = {
        status: 'entrada_liberada' as const,
        liberationTimestamp: Timestamp.fromDate(new Date()),
        liberatedBy: liberatedBy?.trim() || '',
    };
    
    try {
        await updateDoc(vehicleDocRef, updatedVehicleData);
        
        // After approval, delete the corresponding notification
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

  const formatDate = (timestamp: VehicleEntry['arrivalTimestamp']) => {
    if (!timestamp) return 'N/A';
    // Firestore Timestamps have a toDate() method, legacy data might be strings
    const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
    return date.toLocaleString('pt-BR');
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
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="container mx-auto py-8">
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
    <div className="container mx-auto py-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold text-primary font-headline flex items-center">
                <Clock className="mr-3 h-8 w-8 text-accent" />
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
                        placeholder="Buscar por placa, motorista..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:max-w-xs"
                        prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
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
                    return (
                    <TableRow key={vehicle.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{vehicle.driverName}</TableCell>
                        <TableCell>{phone}</TableCell>
                        <TableCell>{vehicle.transportCompanyName}</TableCell>
                        <TableCell>{vehicle.plate1}</TableCell>
                        <TableCell className="max-w-xs truncate">{vehicle.observation || '-'}</TableCell>
                        <TableCell>{formatDate(vehicle.arrivalTimestamp)}</TableCell>
                        <TableCell className="font-medium text-amber-700">{calculateWaitingTime(vehicle.arrivalTimestamp, now)}</TableCell>
                        <TableCell className="text-right space-x-2">
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
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => {
                            setSelectedVehicle(vehicle);
                            setIsDialogOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" /> Liberar Entrada
                        </Button>
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
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Liberação de {selectedVehicle?.plate1}</AlertDialogTitle>
          <AlertDialogDescription>
            Este campo é opcional. Pressione Enter ou clique em confirmar para prosseguir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="liberado-por" className="text-right">Liberado por:</Label>
          <Input
            id="liberado-por"
            placeholder="Nome do liberador"
            value={liberatedByName}
            onChange={(e) => setLiberatedByName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if(selectedVehicle) {
                  handleApproveEntry(selectedVehicle, liberatedByName);
                  setIsDialogOpen(false);
                }
              }
            }}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (selectedVehicle) {
                handleApproveEntry(selectedVehicle, liberatedByName);
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
