
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { VehicleEntryFormData, VehicleEntry, TransportCompany, Driver, InternalDestination } from '@/lib/types';
import { Save, SendToBack, Clock, CheckCircle, Search, Printer, ClipboardCopy, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, where, onSnapshot } from 'firebase/firestore';
import html2canvas from 'html2canvas';
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
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';

const mockMovementTypes = ["CARGA", "DESCARGA", "PRESTAÇÃO DE SERVIÇO", "TRANSFERENCIA INTERNA", "DEVOLUÇÃO", "VISITA", "OUTROS"];

const entrySchema = z.object({
  driverName: z.string().min(1, { message: 'Nome do motorista é obrigatório.' }),
  assistant1Name: z.string().optional().transform(val => val === "" ? undefined : val),
  assistant2Name: z.string().optional().transform(val => val === "" ? undefined : val),
  transportCompanyName: z.string().min(1, { message: 'Transportadora / Empresa é obrigatória.' }),
  plate1: z.string().min(7, { message: 'Placa 1 é obrigatória (mín. 7 caracteres).' }).max(8),
  plate2: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 2 inválida (mín. 7 caracteres)."}),
  plate3: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 3 inválida (mín. 7 caracteres)."}),
  internalDestinationName: z.string().min(1, { message: 'Destino interno é obrigatório.' }),
  movementType: z.string().min(1, { message: 'Tipo de movimentação é obrigatório.' }),
  observation: z.string().max(500, { message: 'Observação muito longa (máx. 500 caracteres).' }).optional(),
});

const generateBarcode = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};


const generateVehicleEntryImage = async (entry: VehicleEntry): Promise<{ success: boolean; imageUrl?: string; error?: any }> => {
  const pdfContentHtml = `
    <div id="pdf-content-${entry.id}" style="font-family: Arial, sans-serif; padding: 20px; width: 580px; border: 1px solid #ccc; background-color: #fff;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 20px;">ROMANEIO DE ENTRADA</h2>
      <div style="display: flex; flex-direction: column; justify-content: flex-start; align-items: center; height: 100px; margin-bottom: 15px; border: 2px dashed #333; background-color: #f9f9f9; padding: 0 15px 0 15px;">
        <p style="font-family: 'Libre Barcode 39 Text', 'Code 39', 'Courier New', monospace; font-size: 48px; text-align: center; margin: 0; color: #000; line-height: 0.9;">*${entry.id}*</p>
        <p style="font-size: 9px; text-align: center; margin: 2px 0 0 0; color: #555;">(CÓDIGO DE BARRAS)</p>
      </div>

      <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 11px; line-height: 1.4;">
        <div style="display: inline-block; width: 48%; margin-right: 2%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Chegada:</p>
          <p style="margin: 0;">${new Date(entry.arrivalTimestamp).toLocaleString('pt-BR')}</p>
        </div>
        ${entry.liberationTimestamp ? `
        <div style="display: inline-block; width: 48%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Liberação:</p>
          <p style="margin: 0;">${new Date(entry.liberationTimestamp).toLocaleString('pt-BR')}</p>
        </div>
        ` : `
        <div style="display: inline-block; width: 48%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Liberação:</p>
          <p style="margin: 0;">-</p>
        </div>
        `}
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
      console.error('Image content element not found');
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


export default function RegistroEntradaPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssistants, setShowAssistants] = useState(false);
  
  const [currentWaitingVehicles, setCurrentWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [liberatedByName, setLiberatedByName] = useState('');
  const [approvalContext, setApprovalContext] = useState<{ type: 'new_entry' | 'waiting_list'; vehicle?: VehicleEntry } | null>(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [persons, setPersons] = useState<Driver[]>([]);
  const [internalDestinations, setInternalDestinations] = useState<InternalDestination[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setDataLoading(true);
        try {
            const companiesPromise = getDocs(query(collection(db, 'transportCompanies'), orderBy("name")));
            const personsPromise = getDocs(query(collection(db, 'persons'), orderBy("name")));
            const destinationsPromise = getDocs(query(collection(db, 'internalDestinations'), orderBy("name")));
            
            const [companiesSnap, personsSnap, destinationsSnap] = await Promise.all([companiesPromise, personsPromise, destinationsPromise]);

            setTransportCompanies(companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportCompany)));
            setPersons(personsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
            setInternalDestinations(destinationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalDestination)));

        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar os dados de cadastro." });
        } finally {
            setDataLoading(false);
        }
    };
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('status', '==', 'aguardando_patio'), orderBy('arrivalTimestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const vehicles: VehicleEntry[] = [];
        querySnapshot.forEach((doc) => {
            vehicles.push({ id: doc.id, ...doc.data() } as VehicleEntry);
        });
        setCurrentWaitingVehicles(vehicles);
    }, (error) => {
        console.error("Error fetching waiting vehicles:", error);
        toast({ variant: "destructive", title: "Erro em Tempo Real", description: "Não foi possível carregar a lista de espera." });
    });
    
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!isDialogOpen) {
      setApprovalContext(null);
      setLiberatedByName('');
    }
  }, [isDialogOpen]);


  const form = useForm<VehicleEntryFormData>({
    resolver: zodResolver(entrySchema),
    mode: "onBlur",
    defaultValues: {
      driverName: '',
      assistant1Name: '',
      assistant2Name: '',
      transportCompanyName: '',
      plate1: '',
      plate2: '',
      plate3: '',
      internalDestinationName: '',
      movementType: '', 
      observation: '',
    },
  });

  const handleFormSubmit = async (data: VehicleEntryFormData, status: 'aguardando_patio' | 'entrada_liberada', liberatedBy?: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    setIsSubmitting(true);
    
    const currentTime = new Date().toISOString();
    const newEntryData: Omit<VehicleEntry, 'id'> = {
        ...data,
        id: generateBarcode(), // This is actually used as a unique identifier before it becomes the doc ID
        arrivalTimestamp: currentTime,
        status,
        registeredBy: user.login,
        ...(status === 'entrada_liberada' && {
            liberationTimestamp: currentTime,
            liberatedBy,
        }),
    };

    try {
        const docRef = await addDoc(collection(db, 'vehicleEntries'), newEntryData);
        const createdEntry: VehicleEntry = { ...newEntryData, id: docRef.id };

        if (status === 'aguardando_patio') {
            toast({
                title: 'Registro Enviado para o Pátio',
                description: `Veículo ${createdEntry.plate1} aguardando liberação.`,
                className: 'bg-yellow-500 text-white',
                icon: <Clock className="h-6 w-6 text-white" />
            });
        } else { 
            toast({
                title: `Entrada de ${createdEntry.plate1} Registrada!`,
                description: `Preparando documento para visualização...`,
                className: 'bg-green-600 text-white',
                icon: <CheckCircle className="h-6 w-6 text-white" />
            });

            const imageResult = await generateVehicleEntryImage(createdEntry);
            
            if (imageResult.success && imageResult.imageUrl) {
                setPreviewImageUrl(imageResult.imageUrl);
                setIsPreviewModalOpen(true);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro no Documento',
                    description: `Falha ao gerar o documento para ${createdEntry.plate1}. Detalhe: ${imageResult.error || 'N/A'}`,
                });
            }
        }
    } catch (error) {
        console.error("Error saving entry:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o registro de entrada.' });
    }

    form.reset();
    setShowAssistants(false);
    setIsSubmitting(false);
  };

  const filteredWaitingVehicles = useMemo(() => {
    if (!searchTerm) return currentWaitingVehicles;
    return currentWaitingVehicles.filter(v =>
      v.plate1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transportCompanyName.toLowerCase().includes(searchTerm.toLowerCase())
    ); 
  }, [currentWaitingVehicles, searchTerm]);

  const handleApproveEntry = async (vehicle: VehicleEntry, liberatedBy?: string) => {
    const vehicleDocRef = doc(db, 'vehicleEntries', vehicle.id);
    const updatedData = { 
        status: 'entrada_liberada',
        liberationTimestamp: new Date().toISOString(), 
        liberatedBy: liberatedBy?.trim() || ''
    };

    try {
        await updateDoc(vehicleDocRef, updatedData);
        const updatedVehicle = { ...vehicle, ...updatedData };
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
        console.error("Error approving entry:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível aprovar a entrada do veículo.' });
    }
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
    if (filteredWaitingVehicles.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum dado', description: 'Não há veículos aguardando para copiar.' });
      return;
    }

    const dataToCopy = filteredWaitingVehicles.map((vehicle, index) => {
      const driver = persons.find(p => p.name === vehicle.driverName);
      const phone = driver?.phone ? formatDisplayPhoneNumber(driver.phone) : 'N/A';
      return [
        `Ordem: ${index + 1}`,
        `Motorista: ${vehicle.driverName}`,
        `Telefone: ${phone}`,
        `Transportadora / Empresa: ${vehicle.transportCompanyName}`,
        `Placa 1: ${vehicle.plate1}`,
        `Observação: ${vehicle.observation || '-'}`,
        `Data/Hora Chegada: ${new Date(vehicle.arrivalTimestamp).toLocaleString('pt-BR')}`
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

  const initiateNewEntryApproval = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setApprovalContext({ type: 'new_entry' });
      setIsDialogOpen(true);
    } else {
      toast({ variant: 'destructive', title: 'Formulário Inválido', description: 'Por favor, corrija os erros para prosseguir.' });
    }
  };

  const handleConfirmApproval = () => {
    if (!approvalContext) return;

    if (approvalContext.type === 'new_entry') {
      handleFormSubmit(form.getValues(), 'entrada_liberada', liberatedByName);
    } else if (approvalContext.type === 'waiting_list' && approvalContext.vehicle) {
      handleApproveEntry(approvalContext.vehicle, liberatedByName);
    }
    
    setIsDialogOpen(false);
  };
  
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
  };


  return (
    <>
    <div className="container mx-auto py-8 space-y-8">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary font-headline">Registro de Nova Entrada</CardTitle>
          <CardDescription>Preencha os dados abaixo para registrar la entrada de um veículo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Motorista</FormLabel>
                       <FormControl>
                        <Input
                          placeholder={dataLoading ? "CARREGANDO..." : "Digite ou selecione o motorista"}
                          {...field}
                          list="driver-list"
                          disabled={dataLoading}
                        />
                      </FormControl>
                      <datalist id="driver-list">
                        {persons.map((person) => (
                          <option key={person.id} value={person.name} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transportCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transportadora / Empresa</FormLabel>
                       <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={dataLoading ? "CARREGANDO..." : "Digite ou selecione a Transportadora / Empresa"}
                            {...field}
                            list="transport-company-list"
                            disabled={dataLoading}
                          />
                           {dataLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                        </div>
                      </FormControl>
                      <datalist id="transport-company-list">
                        {transportCompanies.map((company) => (
                          <option key={company.id} value={company.name} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => setShowAssistants(!showAssistants)}>
                {showAssistants ? 'Ocultar' : 'Adicionar'} Ajudantes
              </Button>

              {showAssistants && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md">
                   <FormField
                    control={form.control}
                    name="assistant1Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ajudante 1 (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={dataLoading ? "CARREGANDO..." : "Digite ou selecione o ajudante 1"}
                            {...field}
                            value={field.value ?? ''}
                            list="assistant-list"
                            disabled={dataLoading}
                          />
                        </FormControl>
                        <datalist id="assistant-list">
                          {persons.map((person) => (
                            <option key={person.id} value={person.name} />
                          ))}
                        </datalist>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assistant2Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ajudante 2 (Opcional)</FormLabel>
                         <FormControl>
                          <Input
                            placeholder={dataLoading ? "CARREGANDO..." : "Digite ou selecione o ajudante 2"}
                            {...field}
                            value={field.value ?? ''}
                            list="assistant-list"
                            disabled={dataLoading}
                          />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="plate1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa 1</FormLabel>
                      <FormControl><Input placeholder="AAA-1234" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plate2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa 2 (Opcional)</FormLabel>
                      <FormControl><Input placeholder="BBB-5678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plate3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa 3 (Opcional)</FormLabel>
                      <FormControl><Input placeholder="CCC-9012" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="internalDestinationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino Interno</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={dataLoading ? "CARREGANDO..." : "Digite ou selecione o destino"}
                          {...field}
                          list="destination-list"
                          disabled={dataLoading}
                        />
                      </FormControl>
                      <datalist id="destination-list">
                        {internalDestinations.map((dest) => (
                          <option key={dest.id} value={dest.name} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="movementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Movimentação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {mockMovementTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes adicionais..." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
            <Button
                variant="outline"
                onClick={form.handleSubmit(data => handleFormSubmit(data, 'aguardando_patio'))}
                disabled={isSubmitting || dataLoading}
                className="w-full sm:w-auto"
            >
                {isSubmitting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <SendToBack className="mr-2 h-4 w-4" /> }
                Aguardar no Pátio
            </Button>
            <Button
                onClick={initiateNewEntryApproval}
                disabled={isSubmitting || dataLoading}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
                {isSubmitting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" /> }
                Liberar Entrada e Imprimir
            </Button>
        </CardFooter>
      </Card>

      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
                <CardTitle className="text-xl font-semibold text-primary font-headline flex items-center">
                    <Clock className="mr-3 h-7 w-7 text-accent" />
                    Veículos Aguardando Liberação ({filteredWaitingVehicles.length})
                </CardTitle>
                <CardDescription>Lista de veículos no pátio que necessitam de aprovação para entrada.</CardDescription>
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
                <Button 
                    onClick={handleCopyWaitingData} 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto"
                    disabled={filteredWaitingVehicles.length === 0}
                >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copiar Dados
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWaitingVehicles.length > 0 ? (
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitingVehicles.map((vehicle, index) => {
                  const driver = persons.find(p => p.name === vehicle.driverName);
                  const phone = driver?.phone ? formatDisplayPhoneNumber(driver.phone) : 'N/A';
                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{vehicle.driverName}</TableCell>
                      <TableCell>{phone}</TableCell>
                      <TableCell>{vehicle.transportCompanyName}</TableCell>
                      <TableCell>{vehicle.plate1}</TableCell>
                      <TableCell className="max-w-xs truncate">{vehicle.observation || '-'}</TableCell>
                      <TableCell>{new Date(vehicle.arrivalTimestamp).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setApprovalContext({ type: 'waiting_list', vehicle });
                            setIsDialogOpen(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Printer className="mr-2 h-4 w-4" /> Liberar Entrada
                        </Button>
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
                    {searchTerm ? "Nenhum veículo encontrado." : "Nenhum veículo aguardando liberação."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    Veículos enviados para o pátio aparecerão aqui.
                </p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>

    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {approvalContext?.type === 'new_entry' 
              ? `Confirmar Liberação de ${form.getValues().plate1}`
              : `Confirmar Liberação de ${approvalContext?.vehicle?.plate1}`
            }
          </AlertDialogTitle>
          <AlertDialogDescription>
            Este campo é opcional. Pressione Enter ou clique em confirmar para prosseguir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="liberado-por-dialog" className="text-right">Liberado por:</Label>
          <Input
            id="liberado-por-dialog"
            placeholder="Nome do liberador"
            value={liberatedByName}
            onChange={(e) => setLiberatedByName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmApproval();
              }
            }}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmApproval}>
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
