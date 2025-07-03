
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry, TransportCompany, Driver } from '@/lib/types';
import { Download, Printer, Search, Truck, RotateCcw, Loader2, AlertTriangle, Trash2, Edit2 } from 'lucide-react';
import type { DateRange } from "react-day-picker";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, Timestamp, writeBatch } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';
import { useIsClient } from '@/hooks/use-is-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';


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
          ${entry.observation ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Observação:</span> ${entry.observation}</p>` : ''}
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


const escapeCsvField = (field: any): string => {
  if (field === null || typeof field === 'undefined') {
    return '';
  }
  let stringField = String(field);
  if (stringField.search(/("|,|\n)/g) >= 0) {
    stringField = '"' + stringField.replace(/"/g, '""') + '"';
  }
  return stringField;
};

const calculateDuration = (start: VehicleEntry['arrivalTimestamp'], end: VehicleEntry['arrivalTimestamp']): string => {
    if (!start || !end) return 'N/A';

    const startDate = (start as any).toDate ? (start as any).toDate() : new Date(start as string);
    const endDate = (end as any).toDate ? (end as any).toDate() : new Date(end as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 'N/A';
    }

    let diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) diff = 0;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const mins = Math.floor(diff / (1000 * 60));
    diff -= mins * (1000 * 60);
    const secs = Math.floor(diff / 1000);

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};


export default function HistoricoAcessoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isClient = useIsClient();
  const router = useRouter();
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [persons, setPersons] = useState<Driver[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [vehiclesInsideFactory, setVehiclesInsideFactory] = useState<VehicleEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<VehicleEntry[]>([]);
  
  const [filters, setFilters] = useState({
    transportCompany: '',
    driverName: '',
    plate: '',
    dateRange: undefined as DateRange | undefined,
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [vehiclesInsideSearchTerm, setVehiclesInsideSearchTerm] = useState('');

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
        
        const [companiesSnap, personsSnap] = await Promise.all([companiesPromise, personsPromise]);

        setTransportCompanies(companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportCompany)));
        setPersons(personsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));

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
    if (!db) return;
    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('status', '==', 'entrada_liberada'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const vehicles: VehicleEntry[] = [];
        querySnapshot.forEach((doc) => {
            vehicles.push({ id: doc.id, ...doc.data() } as VehicleEntry);
        });
        // Sort client-side
        vehicles.sort((a, b) => {
          const dateA = (a.arrivalTimestamp as any)?.toDate ? (a.arrivalTimestamp as any).toDate() : new Date(a.arrivalTimestamp as string);
          const dateB = (b.arrivalTimestamp as any)?.toDate ? (b.arrivalTimestamp as any).toDate() : new Date(b.arrivalTimestamp as string);
          return dateB.getTime() - dateA.getTime();
        });
        setVehiclesInsideFactory(vehicles);
    }, (error) => {
        console.error("Error fetching vehicles inside factory:", error);
        toast({ variant: "destructive", title: "Erro em Tempo Real", description: "Não foi possível atualizar la lista de veículos na fábrica." });
    });

    return () => unsubscribe();
  }, [toast]);


  const handleSearch = useCallback(async () => {
    if (!db) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
        // Fetch all entries ordered by date. Filtering is done client-side
        // for robustness against data inconsistencies and to avoid complex index requirements.
        const q = query(collection(db, 'vehicleEntries'), orderBy('arrivalTimestamp', 'desc'));
        
        const querySnapshot = await getDocs(q);
        let allEntries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleEntry));

        const { dateRange, driverName, transportCompany, plate } = filters;

        const filteredResults = allEntries.filter(entry => {
            // Handle both string and Timestamp objects for arrivalTimestamp
            const arrivalDate = (entry.arrivalTimestamp as any).toDate 
                ? (entry.arrivalTimestamp as any).toDate() 
                : new Date(entry.arrivalTimestamp as string);

            // Date Range Filter
            if (dateRange?.from && arrivalDate < dateRange.from) {
                return false;
            }
            if (dateRange?.to) {
                const toDate = new Date(dateRange.to);
                toDate.setHours(23, 59, 59, 999); // Set to end of day for inclusive range
                if (arrivalDate > toDate) {
                    return false;
                }
            }

            // Driver Name Filter
            if (driverName.trim()) {
                const searchTerm = driverName.trim().toLowerCase();
                const driverMatch = entry.driverName.toLowerCase().includes(searchTerm) ||
                    (entry.assistant1Name && entry.assistant1Name.toLowerCase().includes(searchTerm)) ||
                    (entry.assistant2Name && entry.assistant2Name.toLowerCase().includes(searchTerm));
                if (!driverMatch) return false;
            }

            // Transport Company Filter
            if (transportCompany.trim()) {
                const companyMatch = entry.transportCompanyName.toLowerCase().includes(transportCompany.trim().toLowerCase());
                if (!companyMatch) return false;
            }

            // Plate Filter
            if (plate.trim()) {
                const plateSearchTerm = plate.trim().toLowerCase();
                const plateMatch = entry.plate1.toLowerCase().includes(plateSearchTerm) ||
                    (entry.plate2 && entry.plate2.toLowerCase().includes(plateSearchTerm)) ||
                    (entry.plate3 && entry.plate3.toLowerCase().includes(plateSearchTerm));
                if (!plateMatch) return false;
            }

            return true; // Entry passes all filters
        });

        setFilteredEntries(filteredResults);

    } catch (error) {
        console.error("Error searching entries:", error);
        toast({ variant: 'destructive', title: 'Erro de Busca', description: 'Não foi possível realizar a busca no histórico.' });
    } finally {
        setIsSearching(false);
    }
  }, [filters, toast]);
  
  const formatDate = (timestamp: VehicleEntry['arrivalTimestamp']) => {
    if (!timestamp) return 'N/A';
    // Firestore Timestamps have a toDate() method, legacy data might be strings
    const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
    return date.toLocaleString('pt-BR');
  };

  const handleDeleteOldEntries = async () => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'Banco de dados não configurado.' });
      return;
    }

    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - 365);
    const cutOffTimestamp = Timestamp.fromDate(cutOffDate);

    setIsSearching(true);

    try {
      const q = query(collection(db, 'vehicleEntries'), where('arrivalTimestamp', '<', cutOffTimestamp));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'Nenhum Registro Antigo', description: 'Não há registros com mais de 365 dias para excluir.' });
        return;
      }

      const batchArray: ReturnType<typeof writeBatch>[] = [];
      let currentBatch = writeBatch(db);
      querySnapshot.docs.forEach((doc, index) => {
        currentBatch.delete(doc.ref);
        if ((index + 1) % 500 === 0) {
          batchArray.push(currentBatch);
          currentBatch = writeBatch(db);
        }
      });
      batchArray.push(currentBatch);

      await Promise.all(batchArray.map(batch => batch.commit()));

      toast({
        title: 'Registros Excluídos',
        description: `${querySnapshot.size} registro(s) com mais de 365 dias foram excluídos com sucesso.`,
        className: 'bg-green-600 text-white',
      });

      handleSearch(); // Refresh the data

    } catch (error) {
      console.error("Error deleting old entries:", error);
      toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Não foi possível excluir os registros antigos.' });
    } finally {
      setIsSearching(false);
    }
  };


  const handleExportToCSV = () => {
    if (filteredEntries.length === 0) {
        toast({variant: 'destructive', title: "Nenhum dado", description: "Não há dados para exportar com os filtros atuais."});
        return;
    }
    const headers = [
      "ID/CÓDIGO", "MOTORISTA", "AJUDANTE1", "AJUDANTE2", "TRANSPORTADORA / EMPRESA", 
      "PLACA1", "PLACA2", "PLACA3", "DESTINO INTERNO", "TIPO MOV.", "OBSERVAÇÃO", 
      "DATA/HORA CHEGADA", "DATA/HORA LIBERAÇÃO", "TEMPO PÁTIO (HH:MM:SS)", "LIBERADO POR", "DATA/HORA SAÍDA", 
      "TEMPO FÁBRICA (HH:MM:SS)", "STATUS", "REGISTRADO POR"
    ];
    const csvRows = [
        headers.map(escapeCsvField).join(','),
        ...filteredEntries.map(e => [
            escapeCsvField(e.barcode),
            escapeCsvField(e.driverName),
            escapeCsvField(e.assistant1Name || ''),
            escapeCsvField(e.assistant2Name || ''),
            escapeCsvField(e.transportCompanyName),
            escapeCsvField(e.plate1),
            escapeCsvField(e.plate2 || ''),
            escapeCsvField(e.plate3 || ''),
            escapeCsvField(e.internalDestinationName),
            escapeCsvField(e.movementType),
            escapeCsvField(e.observation || ''),
            escapeCsvField(formatDate(e.arrivalTimestamp)),
            escapeCsvField(formatDate(e.liberationTimestamp)),
            escapeCsvField(calculateDuration(e.arrivalTimestamp, e.liberationTimestamp)),
            escapeCsvField(e.liberatedBy || ''),
            escapeCsvField(formatDate(e.exitTimestamp)),
            escapeCsvField(calculateDuration(e.liberationTimestamp, e.exitTimestamp)),
            escapeCsvField(
                e.status === 'saiu' ? 'Saiu' :
                e.status === 'entrada_liberada' ? 'Na fábrica' :
                'No pátio' 
            ),
            escapeCsvField(e.registeredBy),
        ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `historico_acesso_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({title: "Exportado!", description: "Dados exportados para CSV."});
    } else {
         toast({variant: 'destructive', title: "Erro", description: "Seu navegador não suporta a exportação direta."});
    }
  };
  
  const handlePrintEntry = async (entry: VehicleEntry) => {
    toast({
        title: 'Gerando Documento',
        description: `Preparando documento para ${entry.plate1}...`,
    });

    const imageResult = await generateVehicleEntryImage(entry);
    
    if (imageResult.success && imageResult.imageUrl) {
      setPreviewImageUrl(imageResult.imageUrl);
      setIsPreviewModalOpen(true);
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro no Documento',
            description: `Falha ao gerar o documento para ${entry.plate1}. Detalhe: ${imageResult.error || 'N/A'}`,
        });
    }
  };
  
  const handleEdit = (entryId: string) => {
    router.push(`/registro-entrada?id=${entryId}`);
  };

  const resetFilters = () => {
    setFilters({ transportCompany: '', driverName: '', plate: '', dateRange: undefined });
    setFilteredEntries([]);
    setHasSearched(false);
  };
  
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
  };

  const filteredVehiclesInsideFactory = useMemo(() => {
    if (!vehiclesInsideSearchTerm.trim()) {
      return vehiclesInsideFactory;
    }
    const lowercasedTerm = vehiclesInsideSearchTerm.toLowerCase();
    return vehiclesInsideFactory.filter(v =>
      v.barcode.toLowerCase().includes(lowercasedTerm) ||
      v.plate1.toLowerCase().includes(lowercasedTerm) ||
      v.driverName.toLowerCase().includes(lowercasedTerm) ||
      v.transportCompanyName.toLowerCase().includes(lowercasedTerm)
    );
  }, [vehiclesInsideFactory, vehiclesInsideSearchTerm]);
  
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
    <div className="container mx-auto pb-8 space-y-4">
      <div className="pt-2">
        <h1 className="text-3xl font-bold text-primary font-headline">Histórico de Acesso</h1>
        <p className="text-muted-foreground">Consulte, filtre e exporte os registros de entrada e saída.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Filtros e Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="driverNameFilter">Nome do Motorista / Ajudante</Label>
               <div className="relative">
                    <Input
                      id="driverNameFilter"
                      placeholder={dataLoading ? "CARREGANDO..." : "FILTRAR POR NOME..."}
                      value={filters.driverName}
                      onChange={(e) => setFilters(prev => ({...prev, driverName: e.target.value}))}
                      disabled={dataLoading}
                      list="driver-filter-list"
                    />
                    {dataLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                </div>
                <datalist id="driver-filter-list">
                    {persons.map((person) => (
                        <option key={person.id} value={person.name} />
                    ))}
                </datalist>
            </div>
             <div className="space-y-1">
                <Label htmlFor="transportCompanyFilter">Transportadora / Empresa</Label>
                <div className="relative">
                  <Input
                    id="transportCompanyFilter"
                    placeholder={dataLoading ? "CARREGANDO..." : "FILTRAR POR TRANSPORTADORA / EMPRESA..."}
                    value={filters.transportCompany}
                    onChange={(e) => setFilters(prev => ({ ...prev, transportCompany: e.target.value }))}
                    disabled={dataLoading}
                    list="transport-company-filter-list"
                  />
                   {dataLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                </div>
                <datalist id="transport-company-filter-list">
                  {transportCompanies.map((company) => (
                    <option key={company.id} value={company.name} />
                  ))}
                </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plateFilter">Placa</Label>
              <Input id="plateFilter" placeholder="FILTRAR POR PLACA..." value={filters.plate} onChange={(e) => setFilters(prev => ({...prev, plate: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>Período de Chegada</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => setFilters(prev => ({...prev, dateRange: range}))}
                className="w-full"
              />
            </div>
          </div>
           <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="mr-2 h-4 w-4" /> 
                  {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            <Button onClick={resetFilters} variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> LIMPAR FILTROS</Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 justify-end">
           {user?.role === 'admin' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSearching}>
                  <Trash2 className="mr-2 h-4 w-4" /> EXCLUIR REGISTROS ANTIGOS
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você tem certeza que deseja excluir permanentemente todos os registros de acesso com mais de 365 dias? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleDeleteOldEntries}
                  >
                    Sim, Excluir Registros
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleExportToCSV} variant="default" disabled={filteredEntries.length === 0 || isSearching}><Download className="mr-2 h-4 w-4" /> EXPORTAR PARA CSV</Button>
        </CardFooter>
      </Card>
      
       <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Resultados ({filteredEntries.length})</CardTitle>
        </CardHeader>
          <CardContent>
             {isSearching ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Buscando registros...</p>
                </div>
             ) : hasSearched ? (
                 filteredEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID/CÓDIGO</TableHead>
                        <TableHead>MOTORISTA</TableHead>
                        <TableHead>TRANSPORTADORA / EMPRESA</TableHead>
                        <TableHead>PLACA 1</TableHead>
                        <TableHead>PLACA 2</TableHead>
                        <TableHead>PLACA 3</TableHead>
                        <TableHead>CHEGADA</TableHead>
                        <TableHead>LIBERAÇÃO</TableHead>
                        <TableHead>SAÍDA</TableHead>
                        <TableHead>TEMPO PÁTIO</TableHead>
                        <TableHead>TEMPO FÁBRICA</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead className="text-right">AÇÕES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs py-1">{entry.barcode}</TableCell>
                          <TableCell className="py-1">{entry.driverName}</TableCell>
                          <TableCell className="py-1">{entry.transportCompanyName}</TableCell>
                          <TableCell className="py-1">{entry.plate1}</TableCell>
                          <TableCell className="py-1">{entry.plate2 || '-'}</TableCell>
                          <TableCell className="py-1">{entry.plate3 || '-'}</TableCell>
                          <TableCell className="py-1">{formatDate(entry.arrivalTimestamp)}</TableCell>
                          <TableCell className="py-1">{formatDate(entry.liberationTimestamp)}</TableCell>
                          <TableCell className="py-1">{formatDate(entry.exitTimestamp)}</TableCell>
                          <TableCell className="py-1">{calculateDuration(entry.arrivalTimestamp, entry.liberationTimestamp)}</TableCell>
                          <TableCell className="py-1">{calculateDuration(entry.liberationTimestamp, entry.exitTimestamp)}</TableCell>
                          <TableCell className="py-1">
                              <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                                  entry.status === 'saiu' ? 'bg-red-100 text-red-700' :
                                  entry.status === 'entrada_liberada' ? 'bg-green-100 text-green-700' :
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                                  {entry.status === 'saiu' ? 'Saiu' : entry.status === 'entrada_liberada' ? 'Na fábrica' : 'No pátio'}
                              </span>
                          </TableCell>
                          <TableCell className="text-right py-1">
                            <Button variant="ghost" size="icon" onClick={() => handlePrintEntry(entry)} title="Reimprimir Documento">
                              <Printer className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">NENHUM REGISTRO ENCONTRADO COM OS FILTROS APLICADOS.</p>
                )
             ) : (
                <div className="text-center py-4">
                    <Search className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-xl font-medium text-muted-foreground">
                        APLIQUE UM FILTRO PARA COMEÇAR
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Utilize os campos acima e clique em "Buscar" para consultar o histórico.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>


      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <Truck className="mr-2 h-5 w-5" />
                Veículos Atualmente na Fábrica ({filteredVehiclesInsideFactory.length})
              </CardTitle>
              <CardDescription>Lista de veículos que registraram entrada e ainda não saíram.</CardDescription>
            </div>
            <div className="w-full sm:w-auto">
              <Input
                placeholder="Buscar por ID, placa, motorista..."
                value={vehiclesInsideSearchTerm}
                onChange={(e) => setVehiclesInsideSearchTerm(e.target.value)}
                prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                className="w-full sm:w-auto sm:max-w-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
           {filteredVehiclesInsideFactory.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID/CÓDIGO</TableHead>
                  <TableHead>PLACA 1</TableHead>
                  <TableHead>MOTORISTA</TableHead>
                  <TableHead>TRANSPORTADORA / EMPRESA</TableHead>
                  <TableHead>CHEGADA</TableHead>
                  <TableHead>LIBERAÇÃO</TableHead>
                  <TableHead>STATUS</TableHead>
                   <TableHead className="text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehiclesInsideFactory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs py-1">{entry.barcode}</TableCell>
                    <TableCell className="py-1">{entry.plate1}</TableCell>
                    <TableCell className="py-1">{entry.driverName}</TableCell>
                    <TableCell className="py-1">{entry.transportCompanyName}</TableCell>
                    <TableCell className="py-1">{formatDate(entry.arrivalTimestamp)}</TableCell>
                    <TableCell className="py-1">{formatDate(entry.liberationTimestamp)}</TableCell>
                     <TableCell className="py-1">
                        <span className="px-2 py-1 text-xs rounded-full whitespace-nowrap bg-green-100 text-green-700">
                            Na fábrica
                        </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2 py-1">
                       {user?.role !== 'gate_agent' && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry.id)} title="Editar Registro">
                              <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      <Button variant="ghost" size="icon" onClick={() => handlePrintEntry(entry)} title="Reimprimir Documento">
                        <Printer className="h-4 w-4 text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {vehiclesInsideSearchTerm ? "Nenhum veículo encontrado com os termos da busca." : "NENHUM VEÍCULO DENTRO DA FÁBRICA NO MOMENTO."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>

    <DocumentPreviewModal 
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        imageUrl={previewImageUrl}
    />
    </>
  );
}
