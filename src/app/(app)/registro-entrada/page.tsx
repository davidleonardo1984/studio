
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { VehicleEntryFormData, VehicleEntry, TransportCompany, Driver, InternalDestination } from '@/lib/types';
import { SendToBack, CheckCircle, Printer, Loader2, AlertTriangle, LogIn, Edit2, Trash2, Save, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, Timestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateVehicleEntryImage } from '@/lib/pdf-generator';
import { isAfter, parseISO, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Local PersonForm schema and component
const personSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório (mín. 3 caracteres).'),
  cpf: z.string(),
  cnh: z.string().optional(),
  cnhExpirationDate: z.string().optional(),
  phone: z.string().optional(),
  isBlocked: z.boolean().default(false).optional(),
  isForeigner: z.boolean().default(false).optional(),
}).superRefine((data, ctx) => {
    if (data.cnh && data.cnh.trim() !== '') {
        if (!data.cnhExpirationDate || data.cnhExpirationDate.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vencimento da CNH é obrigatório quando a CNH é preenchida.',
                path: ['cnhExpirationDate'],
            });
        }
    }
    if (!data.isForeigner) {
        if (!data.cpf || data.cpf.length !== 11) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'CPF deve ter 11 dígitos.',
                path: ['cpf'],
            });
        } else if (!/^\d+$/.test(data.cpf)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'CPF deve conter apenas números.',
                path: ['cpf'],
            });
        }
    }
});
type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  allPersons: Driver[];
}

function PersonForm({ onSuccess, onCancel, allPersons }: PersonFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: { name: '', cpf: '', cnh: '', cnhExpirationDate: '', phone: '', isBlocked: false, isForeigner: false },
  });
  
  const { watch, setValue } = form;
  const isForeigner = watch('isForeigner');

  useEffect(() => {
    if (isForeigner) {
      setValue('cpf', '');
      form.clearErrors('cpf');
    }
  }, [isForeigner, form, setValue]);

  const onSubmit = async (formData: PersonFormData) => {
    setIsSubmitting(true);
    try {
        if (!db) throw new Error("Firebase não configurado");

        if (!formData.isForeigner) {
            const isDuplicateCpf = allPersons.some(p => p.cpf === formData.cpf);
            if (isDuplicateCpf) {
                form.setError("cpf", { type: "manual", message: "Este CPF já está cadastrado." });
                setIsSubmitting(false);
                return;
            }
        }

        const isDuplicateName = allPersons.some(p => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
        if (isDuplicateName) {
            form.setError("name", { type: "manual", message: "Este nome já está cadastrado." });
            setIsSubmitting(false);
            return;
        }

        const dataToSave: Partial<Driver> = { ...formData, cnhExpirationDate: formData.cnhExpirationDate || '' };
        if(formData.isForeigner) { dataToSave.cpf = ''; }

        await addDoc(collection(db, 'persons'), dataToSave);
        toast({ title: "Pessoa cadastrada!", description: `${formData.name} foi cadastrado com sucesso.` });
        
        onSuccess();
        form.reset();

    } catch (error) {
        console.error("Error saving person:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível salvar a pessoa." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
      let rawValue = e.target.value.replace(/\D/g, "");
      if (rawValue.length > 11) { rawValue = rawValue.substring(0, 11); }
      fieldOnChange(rawValue);
  };
  
  const formatDisplayPhoneNumber = (val: string): string => {
      if (typeof val !== 'string' || !val) return "";
      const digits = val.replace(/\D/g, "");
      if (digits.length === 0) return "";
      let formatted = `(${digits.substring(0, 2)}`;
      if (digits.length > 2) {
          const end = digits.length === 11 ? 7 : 6;
          formatted += `) ${digits.substring(2, end)}`;
          if (digits.length > 6) { formatted += `-${digits.substring(end, 11)}`; }
      }
      return formatted;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Carlos Alberto" {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF (apenas números)</FormLabel><FormControl><Input placeholder="12345678900" {...field} value={isForeigner ? "ESTRANGEIRO" : field.value} maxLength={11} autoComplete="off" disabled={isForeigner} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="cnh" render={({ field }) => ( <FormItem><FormLabel>CNH (Opcional)</FormLabel><FormControl><Input placeholder="Número da CNH" {...field} value={field.value ?? ''} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="cnhExpirationDate" render={({ field }) => (<FormItem><FormLabel>Vencimento CNH</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="flex flex-col h-full justify-end"><FormLabel>Telefone (Opcional)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} value={formatDisplayPhoneNumber(field.value || "")} onChange={(e) => handlePhoneChange(e, field.onChange)} type="tel" autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="isForeigner" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                    <div className="space-y-0.5"><FormLabel>Estrangeiro</FormLabel><FormDescription>Marque se a pessoa não possuir CPF.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Estrangeiro" /></FormControl>
                </FormItem>
            )} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Pessoa
            </Button>
        </div>
      </form>
    </Form>
  );
}


const mockMovementTypes = ["CARGA", "DESCARGA", "PRESTAÇÃO DE SERVIÇO", "TRANSFERENCIA INTERNA", "DEVOLUÇÃO", "VISITA", "OUTROS"];

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

  const [isEditActionDialogOpen, setIsEditActionDialogOpen] = useState(false);
  const [updatedDataForAction, setUpdatedDataForAction] = useState<VehicleEntryFormData | null>(null);

  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [persons, setPersons] = useState<Driver[]>([]);
  const [internalDestinations, setInternalDestinations] = useState<InternalDestination[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [isCnhAlertOpen, setIsCnhAlertOpen] = useState(false);
  const [expiredDriver, setExpiredDriver] = useState<Driver | null>(null);
  const [showCnhUpdate, setShowCnhUpdate] = useState(false);
  const [newCnhExpirationDate, setNewCnhExpirationDate] = useState('');

  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  
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
    mode: 'onBlur',
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

  const { watch } = form;
  const driverNameValue = watch('driverName');

  const selectedDriverDetails = useMemo(() => {
      if (!driverNameValue) return null;
      return persons.find(p => p.name.toLowerCase() === driverNameValue.toLowerCase()) || null;
  }, [driverNameValue, persons]);

  const isSelectedDriverBlocked = !!selectedDriverDetails?.isBlocked;

  const handleDriverBlur = useCallback(() => {
    if (showCnhUpdate) return;
    const driverName = form.getValues('driverName');
    if (!driverName) return;

    const driver = persons.find(p => p.name.toLowerCase() === driverName.toLowerCase());

    if (driver?.isBlocked) {
      // Zod validation is already triggered by form's onBlur, showing the FormMessage.
      // We return here to prevent the CNH check.
      return;
    }
    
    if (driver?.cnh && driver.cnhExpirationDate) {
      try {
        const expirationDate = parseISO(driver.cnhExpirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isAfter(today, expirationDate)) {
          setExpiredDriver(driver);
          setIsCnhAlertOpen(true);
        }
      } catch (e) {
        console.error("Invalid CNH expiration date format for driver:", driver.name, e);
      }
    }
  }, [form, persons, showCnhUpdate]);


  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const val = e.target.value;
    if (!val) {
      fieldOnChange('');
      return;
    }
    const input = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = input.substring(0, 7);

    if (formatted.length > 3) {
        formatted = formatted.slice(0, 3) + '-' + formatted.slice(3);
    }
    fieldOnChange(formatted);
  };
  
  const fetchAllData = useCallback(async () => {
    if (!db) {
        setDataLoading(false);
        return;
    }
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
  }, [toast]);


  const handlePersonCreated = () => {
    fetchAllData(); 
    setIsPersonFormOpen(false); 
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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

    if (persons.length > 0) { // Fetch entry only after persons are loaded
        fetchEntry();
    }
  }, [searchParams, form, router, toast, persons.length]);

  useEffect(() => {
    if (!isDialogOpen) {
      setIsApprovingNewEntry(false);
      setLiberatedByName('');
    }
  }, [isDialogOpen]);
  
  const handleUpdateCnhDate = async () => {
    if (!expiredDriver || !newCnhExpirationDate || !db) return;
    setIsSubmitting(true);
    try {
        const driverDocRef = doc(db, 'persons', expiredDriver.id);
        await updateDoc(driverDocRef, { cnhExpirationDate: newCnhExpirationDate });
        
        setPersons(prev => prev.map(p => 
            p.id === expiredDriver.id ? { ...p, cnhExpirationDate: newCnhExpirationDate } : p
        ));
        
        toast({ title: "Sucesso!", description: `Vencimento da CNH de ${expiredDriver.name} atualizado.` });
        setShowCnhUpdate(false);
        setExpiredDriver(null);
        setNewCnhExpirationDate('');
    } catch(error) {
        console.error("Error updating CNH date:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar a data da CNH." });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleFormSubmit = async (data: VehicleEntryFormData, status: 'aguardando_patio' | 'entrada_liberada', liberatedBy?: string) => {
    if (!user || !db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado ou conexão com banco de dados falhou.' });
      return;
    }
    setIsSubmitting(true);
    
    const driver = persons.find(p => p.name.toLowerCase() === data.driverName.toLowerCase());

    const currentTime = new Date();
    const newEntryData: any = {
        ...data,
        isForeigner: driver?.isForeigner || false,
        barcode: generateBarcode(),
        arrivalTimestamp: Timestamp.fromDate(currentTime),
        status,
        registeredBy: user.login,
    };

    if (status === 'entrada_liberada') {
        newEntryData.liberationTimestamp = Timestamp.fromDate(currentTime);
        if (liberatedBy?.trim()) {
            newEntryData.liberatedBy = liberatedBy.trim();
        }
    }

    try {
        const docRef = await addDoc(collection(db, 'vehicleEntries'), newEntryData);
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

  const initiateEditActionDialog = (data: VehicleEntryFormData) => {
    setUpdatedDataForAction(data);
    setIsEditActionDialogOpen(true);
  };

  const handleSaveOnly = async () => {
    if (!editingEntry || !updatedDataForAction || !db) return;
    setIsSubmitting(true);
    setIsEditActionDialogOpen(false);
    
    const driver = persons.find(p => p.name.toLowerCase() === updatedDataForAction.driverName.toLowerCase());
    const dataToUpdate: any = {
        ...updatedDataForAction,
        isForeigner: driver?.isForeigner || false,
    };

    try {
        const entryDocRef = doc(db, 'vehicleEntries', editingEntry.id);
        await updateDoc(entryDocRef, dataToUpdate);
        toast({ title: 'Alterações Salvas', description: `Os dados do veículo ${updatedDataForAction.plate1} foram atualizados.` });
        router.back();
    } catch (error) {
        console.error("Error saving entry (save only):", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as alterações." });
    } finally {
        setIsSubmitting(false);
        setUpdatedDataForAction(null);
    }
  };

  const handleSaveAndLiberate = async () => {
    if (!editingEntry || !updatedDataForAction || !db) return;
    setIsSubmitting(true);
    setIsEditActionDialogOpen(false);
    
    const driver = persons.find(p => p.name.toLowerCase() === updatedDataForAction.driverName.toLowerCase());

    try {
        const entryDocRef = doc(db, 'vehicleEntries', editingEntry.id);
        const updateData: any = { 
            ...updatedDataForAction,
            isForeigner: driver?.isForeigner || false,
            status: 'entrada_liberada',
            liberationTimestamp: Timestamp.fromDate(new Date()),
            liberatedBy: editingEntry.liberatedBy || user?.name || user?.login
        };
        
        await updateDoc(entryDocRef, updateData);
        
        const updatedEntry: VehicleEntry = { ...editingEntry, ...updateData };

        toast({
            title: 'Entrada Liberada!',
            description: `Preparando documento para visualização...`,
            className: 'bg-green-600 text-white'
        });

        const imageResult = await generateVehicleEntryImage(updatedEntry);
        
        if (imageResult.success && imageResult.imageUrl) {
            setPreviewImageUrl(imageResult.imageUrl);
            setIsPreviewModalOpen(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro no Documento',
                description: `Falha ao gerar o documento. ${imageResult.error || ''}`,
            });
            router.back();
        }
    } catch (error) {
        console.error("Error updating and liberating entry:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as alterações e liberar a entrada." });
    } finally {
        setIsSubmitting(false);
        setUpdatedDataForAction(null);
    }
  };

  const handleSaveAndReprint = async () => {
    if (!editingEntry || !updatedDataForAction || !db) return;
    setIsSubmitting(true);
    setIsEditActionDialogOpen(false);
    
    const driver = persons.find(p => p.name.toLowerCase() === updatedDataForAction.driverName.toLowerCase());
    const dataToUpdate: any = {
        ...updatedDataForAction,
        isForeigner: driver?.isForeigner || false,
    };

    try {
      const entryDocRef = doc(db, 'vehicleEntries', editingEntry.id);
      await updateDoc(entryDocRef, dataToUpdate);

      const updatedEntry: VehicleEntry = { ...editingEntry, ...dataToUpdate };

      toast({
        title: 'Documento Gerado!',
        description: `Preparando documento atualizado para visualização...`,
        className: 'bg-green-600 text-white'
      });

      const imageResult = await generateVehicleEntryImage(updatedEntry);
      
      if (imageResult.success && imageResult.imageUrl) {
        setPreviewImageUrl(imageResult.imageUrl);
        setIsPreviewModalOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro no Documento',
          description: `Falha ao gerar o documento. ${imageResult.error || ''}`,
        });
        router.back();
      }

    } catch (error) {
      console.error("Error saving and reprinting entry:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar e reimprimir o documento." });
    } finally {
      setIsSubmitting(false);
      setUpdatedDataForAction(null);
    }
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry || !db) {
      return;
    }
    
    const allowedToDelete = user?.role === 'admin' || user?.role === 'user';
    if (!allowedToDelete) {
      toast({ variant: "destructive", title: "Não permitido", description: "Você não tem permissão para excluir este registro." });
      return;
    }

    setIsSubmitting(true);
    try {
      const entryDocRef = doc(db, 'vehicleEntries', editingEntry.id);
      await deleteDoc(entryDocRef);
      toast({ title: 'Registro Excluído!', description: `O registro do veículo ${editingEntry.plate1} foi removido.` });
      router.back();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o registro." });
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
    if (editingEntry) {
      setEditingEntry(null);
      form.reset();
      router.back();
    } else {
      router.push('/registro-entrada');
    }
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
    <div className="container mx-auto pb-8 space-y-4">
      <div className="flex justify-between items-center -mt-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">
            {editingEntry ? 'Editar Registro de Entrada' : 'Registro de Entrada de Veículo'}
          </h1>
          <p className="text-muted-foreground">
            {editingEntry ? `Alterando dados do veículo ${editingEntry.plate1}.` : 'Preencha os dados abaixo para registrar a entrada de um veículo.'}
          </p>
        </div>
      </div>
      <Card className="shadow-xl w-full">
        <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-semibold text-primary">{editingEntry ? 'Editar Registro' : 'Registro de Entrada'}</CardTitle>
                <Dialog open={isPersonFormOpen} onOpenChange={setIsPersonFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Cadastrar Nova Pessoa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Cadastro Rápido de Pessoa</DialogTitle>
                            <DialogDescription>
                                Cadastre um novo motorista ou ajudante. Após salvar, ele estará disponível na lista.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <PersonForm
                                onSuccess={handlePersonCreated}
                                onCancel={() => setIsPersonFormOpen(false)}
                                allPersons={persons}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
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
                                onBlur={(e) => {
                                    field.onBlur(e);
                                    handleDriverBlur();
                                }}
                                disabled={dataLoading || isSubmitting}
                                list="driver-list"
                                autoComplete="off"
                                className={cn(isSelectedDriverBlocked && 'text-destructive font-bold')}
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
                                autoComplete="off"
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

               {showCnhUpdate && expiredDriver && (
                <Card className="p-4 border-amber-400 bg-amber-50">
                    <Label className="font-semibold text-amber-800">Atualizar CNH Vencida de {expiredDriver.name}</Label>
                     <div className="flex items-center gap-2 mt-2">
                        <Input 
                            type="date"
                            value={newCnhExpirationDate}
                            onChange={(e) => setNewCnhExpirationDate(e.target.value)}
                        />
                        <Button 
                            size="sm" 
                            onClick={handleUpdateCnhDate} 
                            disabled={isSubmitting || !newCnhExpirationDate}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Save className="mr-2 h-4 w-4" /> Salvar
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                                setShowCnhUpdate(false);
                                setNewCnhExpirationDate('');
                                setExpiredDriver(null);
                            }}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Card>
              )}

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
                                autoComplete="off"
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
                                autoComplete="off"
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
                      <FormControl>
                        <Input 
                          placeholder="AAA-1234" 
                          {...field}
                          onChange={(e) => handlePlateChange(e, field.onChange)}
                          disabled={isSubmitting} 
                          maxLength={8}
                          noAutoUppercase
                          autoComplete="off"
                        />
                      </FormControl>
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
                      <FormControl>
                        <Input 
                          placeholder="BBB-5678" 
                          {...field}
                          onChange={(e) => handlePlateChange(e, field.onChange)}
                          disabled={isSubmitting} 
                          maxLength={8}
                          noAutoUppercase
                          autoComplete="off"
                         />
                      </FormControl>
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
                      <FormControl>
                        <Input 
                          placeholder="CCC-9012" 
                          {...field}
                          onChange={(e) => handlePlateChange(e, field.onChange)}
                          disabled={isSubmitting} 
                          maxLength={8}
                          noAutoUppercase
                          autoComplete="off"
                        />
                      </FormControl>
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
                                autoComplete="off"
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
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
            {editingEntry ? (
                <>
                    <div>
                        {(user?.role === 'admin' || user?.role === 'user') && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir Registro
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja excluir permanentemente o registro do veículo {editingEntry.plate1}? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteEntry}
                                            className="bg-destructive hover:bg-destructive/90"
                                        >
                                            Sim, Excluir
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={form.handleSubmit(initiateEditActionDialog)}
                            disabled={isSubmitting || dataLoading}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </>
            ) : (
                <div className="flex justify-end w-full gap-4">
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
                </div>
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
            Se desejar que um nome apareça no campo 'Liberado por' do documento, informe-o abaixo. Caso contrário, deixe em branco e o campo não será exibido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="liberado-por-dialog" className="text-right">Liberado por (Opcional)</Label>
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
            autoComplete="off"
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

    <AlertDialog open={isEditActionDialogOpen} onOpenChange={setIsEditActionDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Ação de Edição</AlertDialogTitle>
                <AlertDialogDescription>
                    Escolha a ação desejada para o veículo {editingEntry?.plate1}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            {editingEntry?.status === 'aguardando_patio' ? (
                <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                    <Button variant="outline" onClick={handleSaveOnly} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar e Manter no Pátio
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveAndLiberate} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Liberar Entrada e Imprimir
                    </Button>
                </AlertDialogFooter>
            ) : (
                 <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                    <Button variant="outline" onClick={handleSaveOnly} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar sem Reimprimir
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveAndReprint} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar e Reimprimir Documento
                    </Button>
                </AlertDialogFooter>
            )}
        </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={isCnhAlertOpen} onOpenChange={setIsCnhAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive" />
                    CNH Vencida
                </AlertDialogTitle>
                <AlertDialogDescription>
                    A CNH do motorista <strong>{expiredDriver?.name}</strong> está vencida desde {expiredDriver?.cnhExpirationDate ? new Date(expiredDriver.cnhExpirationDate).toLocaleDateString('pt-BR') : 'N/A'}. 
                    Deseja atualizar a data de vencimento agora ou continuar com o registro?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => {
                    setShowCnhUpdate(true);
                    setNewCnhExpirationDate(format(new Date(), 'yyyy-MM-dd'));
                    setIsCnhAlertOpen(false);
                }}>
                    Atualizar Dados
                </AlertDialogAction>
                <AlertDialogCancel onClick={() => setIsCnhAlertOpen(false)}>Manter e Continuar</AlertDialogCancel>
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
