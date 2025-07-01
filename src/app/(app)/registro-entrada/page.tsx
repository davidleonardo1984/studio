
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { VehicleEntryFormData, VehicleEntry, TransportCompany, Driver, InternalDestination } from '@/lib/types';
import { SendToBack, CheckCircle, Printer, Loader2, AlertTriangle, LogIn, Edit2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';

const mockMovementTypes = ["CARGA", "DESCARGA", "PRESTAÇÃO DE SERVIÇO", "TRANSFERENCIA INTERNA", "DEVOLUÇÃO", "VISITA", "OUTROS"];

// Base schema for fields that don't depend on fetched data
const baseSchema = z.object({
  plate1: z.string().min(7, { message: 'Placa 1 é obrigatória (mín. 7 caracteres).' }).max(8),
  plate2: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 2 inválida (mín. 7 caracteres)."}),
  plate3: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 3 inválida (mín. 7 caracteres)."}),
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingEntry, setEditingEntry] = useState<VehicleEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssistants, setShowAssistants] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [liberatedByName, setLiberatedByName] = useState('');
  const [isApprovingNewEntry, setIsApprovingNewEntry] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [persons, setPersons] = useState<Driver[]>([]);
  const [internalDestinations, setInternalDestinations] = useState<InternalDestination[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const entrySchema = useMemo(() => {
    const personMap = new Map(persons.map(p => [p.name.toLowerCase(), p]));
    const companySet = new Set(transportCompanies.map(c => c.name.toLowerCase()));
    const destinationSet = new Set(internalDestinations.map(d => d.name.toLowerCase()));

    return baseSchema.extend({
        driverName: z.string().min(1, { message: 'Nome do motorista é obrigatório.' })
            .refine(val => personMap.has(val.toLowerCase()), { message: "Motorista não cadastrado." })
            .refine(val => {
                const person = personMap.get(val.toLowerCase());
                return !person?.isBlocked;
            }, { message: "Este motorista está com acesso bloqueado." }),

        assistant1Name: z.string().optional()
            .refine(val => !val || personMap.has(val.toLowerCase()), { message: "Ajudante 1 não cadastrado." })
            .refine(val => {
                if (!val) return true;
                const person = personMap.get(val.toLowerCase());
                return !person?.isBlocked;
            }, { message: "Ajudante 1 está com acesso bloqueado." }),
        
        assistant2Name: z.string().optional()
            .refine(val => !val || personMap.has(val.toLowerCase()), { message: "Ajudante 2 não cadastrado." })
            .refine(val => {
                if (!val) return true;
                const person = personMap.get(val.toLowerCase());
                return !person?.isBlocked;
            }, { message: "Ajudante 2 está com acesso bloqueado." }),

        transportCompanyName: z.string().min(1, { message: 'Transportadora / Empresa é obrigatória.' }).refine(val => companySet.has(val.toLowerCase()), { message: "Transportadora / Empresa não cadastrada." }),
        
        internalDestinationName: z.string().min(1, { message: 'Destino interno é obrigatório.' }).refine(val => destinationSet.has(val.toLowerCase()), { message: "Destino interno não cadastrado." }),
    });
  }, [persons, transportCompanies, internalDestinations]);


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

  useEffect(() => {
    if (!db) {
        setDataLoading(false);
        return;
    }
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
    const entryId = searchParams.get('id');
    if (!entryId || !db) {
        setEditingEntry(null);
        form.reset({
            driverName: '', assistant1Name: '', assistant2Name: '',
            transportCompanyName: '', plate1: '', plate2: '', plate3: '',
            internalDestinationName: '', movementType: '', observation: '',
        });
        return;
    }

    const fetchEntry = async () => {
        setDataLoading(true);
        try {
            const entryDocRef = doc(db, 'vehicleEntries', entryId);
            const entryDocSnap = await getDoc(entryDocRef);

            if (entryDocSnap.exists()) {
                const entryData = { id: entryDocSnap.id, ...entryDocSnap.data() } as VehicleEntry;
                setEditingEntry(entryData);
                form.reset({
                    driverName: entryData.driverName,
                    assistant1Name: entryData.assistant1Name || '',
                    assistant2Name: entryData.assistant2Name || '',
                    transportCompanyName: entryData.transportCompanyName,
                    plate1: entryData.plate1,
                    plate2: entryData.plate2 || '',
                    plate3: entryData.plate3 || '',
                    internalDestinationName: entryData.internalDestinationName,
                    movementType: entryData.movementType,
                    observation: entryData.observation || '',
                });
                if (entryData.assistant1Name || entryData.assistant2Name) {
                    setShowAssistants(true);
                }
            } else {
                toast({ variant: "destructive", title: "Erro", description: "Registro de entrada não encontrado." });
                router.push('/historico-acesso');
            }
        } catch (error) {
            console.error("Error fetching entry:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados para edição." });
        } finally {
            setDataLoading(false);
        }
    };

    fetchEntry();
  }, [searchParams, db, form, router, toast]);

  useEffect(() => {
    if (!isDialogOpen) {
      setIsApprovingNewEntry(false);
      setLiberatedByName('');
    }
  }, [isDialogOpen]);

  const handleFormSubmit = async (data: VehicleEntryFormData, status: 'aguardando_patio' | 'entrada_liberada', liberatedBy?: string) => {
    if (!user || !db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado ou conexão com banco de dados falhou.' });
      return;
    }
    setIsSubmitting(true);
    
    const currentTime = new Date();
    const newEntryData: Omit<VehicleEntry, 'id'> = {
        ...data,
        barcode: generateBarcode(),
        arrivalTimestamp: Timestamp.fromDate(currentTime),
        status,
        registeredBy: user.login,
        ...(status === 'entrada_liberada' && {
            liberationTimestamp: Timestamp.fromDate(currentTime),
            liberatedBy,
        }),
    };

    try {
        const docRef = await addDoc(collection(db, 'vehicleEntries'), newEntryData as any);
        const createdEntry: VehicleEntry = { ...newEntryData, id: docRef.id };

        if (status === 'aguardando_patio') {
            toast({
                title: 'Registro Enviado para o Pátio',
                description: `Veículo ${createdEntry.plate1} (Cód: ${createdEntry.barcode}) aguardando liberação.`,
                className: 'bg-yellow-500 text-white',
                icon: <SendToBack className="h-6 w-6 text-white" />
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

  const handleUpdateSubmit = async (data: VehicleEntryFormData) => {
    if (!editingEntry || !db || !user) return;

    setIsSubmitting(true);
    try {
        const entryDocRef = doc(db, 'vehicleEntries', editingEntry.id);
        await updateDoc(entryDocRef, data as any);
        
        toast({
            title: 'Registro Atualizado!',
            description: `O registro do veículo ${data.plate1} foi atualizado com sucesso.`,
            className: 'bg-green-600 text-white'
        });
        router.back();

    } catch (error) {
        console.error("Error updating entry:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as alterações." });
    } finally {
        setIsSubmitting(false);
    }
  };


  const initiateNewEntryApproval = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setIsApprovingNewEntry(true);
      setIsDialogOpen(true);
    } else {
      toast({ variant: 'destructive', title: 'Formulário Inválido', description: 'Por favor, corrija os erros para prosseguir.' });
    }
  };

  const handleConfirmApproval = () => {
    if (!isApprovingNewEntry) return;
    handleFormSubmit(form.getValues(), 'entrada_liberada', liberatedByName);
    setIsDialogOpen(false);
  };
  
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
  };

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
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">
            {editingEntry ? 'Editar Registro de Entrada' : 'Registro de Entrada de Veículo'}
          </h1>
          <p className="text-muted-foreground">
            {editingEntry ? `Alterando dados do veículo ${editingEntry.plate1}.` : 'Preencha os dados abaixo para registrar a entrada de um veículo.'}
          </p>
        </div>
      </div>
      <Card className="shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold text-primary">{editingEntry ? 'Editar Registro' : 'Registro de Entrada'}</CardTitle>
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
                                placeholder={dataLoading ? "CARREGANDO..." : "Digite o nome do motorista"}
                                {...field}
                                disabled={dataLoading || isSubmitting}
                                list="driver-list"
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
                            <Input
                                placeholder={dataLoading ? "CARREGANDO..." : "Digite o nome da Transportadora / Empresa"}
                                {...field}
                                disabled={dataLoading || isSubmitting}
                                list="company-list"
                            />
                        </FormControl>
                        <datalist id="company-list">
                            {transportCompanies.map((company) => (
                                <option key={company.id} value={company.name} />
                            ))}
                        </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => setShowAssistants(!showAssistants)} disabled={isSubmitting}>
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
                                placeholder={dataLoading ? "CARREGANDO..." : "Digite o nome do ajudante 1"}
                                {...field}
                                value={field.value ?? ''}
                                disabled={dataLoading || isSubmitting}
                                list="assistant-list"
                            />
                        </FormControl>
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
                                placeholder={dataLoading ? "CARREGANDO..." : "Digite o nome do ajudante 2"}
                                {...field}
                                value={field.value ?? ''}
                                disabled={dataLoading || isSubmitting}
                                list="assistant-list"
                            />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <datalist id="assistant-list">
                        {persons.map((person) => (
                            <option key={person.id} value={person.name} />
                        ))}
                    </datalist>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="plate1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa 1</FormLabel>
                      <FormControl><Input placeholder="AAA-1234" {...field} disabled={isSubmitting} /></FormControl>
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
                      <FormControl><Input placeholder="BBB-5678" {...field} disabled={isSubmitting} /></FormControl>
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
                      <FormControl><Input placeholder="CCC-9012" {...field} disabled={isSubmitting} /></FormControl>
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
                                placeholder={dataLoading ? "CARREGANDO..." : "Digite o destino interno"}
                                {...field}
                                disabled={dataLoading || isSubmitting}
                                list="destination-list"
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
                      <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting}>
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
                    <FormControl><Textarea placeholder="Detalhes adicionais..." {...field} rows={3} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
            {editingEntry ? (
              <>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={form.handleSubmit(handleUpdateSubmit)}
                    disabled={isSubmitting || dataLoading}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
              </>
            ) : (
              <>
                <Button
                    variant="outline"
                    onClick={form.handleSubmit(data => handleFormSubmit(data, 'aguardando_patio'))}
                    disabled={isSubmitting || dataLoading}
                    className="w-full sm:w-auto"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendToBack className="mr-2 h-4 w-4" /> }
                    Aguardar no Pátio
                </Button>
                <Button
                    onClick={initiateNewEntryApproval}
                    disabled={isSubmitting || dataLoading}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" /> }
                    Liberar Entrada e Imprimir
                </Button>
              </>
            )}
        </CardFooter>
      </Card>
    </div>

    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Confirmar Liberação de {form.getValues().plate1}
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
