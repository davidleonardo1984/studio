
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry, TransportCompany } from '@/lib/types';
import { Download, Printer, Search, Truck, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import type { DateRange } from "react-day-picker";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc as firestoreDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';
import { useIsClient } from '@/hooks/use-is-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


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

export default function HistoricoAcessoPage() {
  const { toast } = useToast();
  const isClient = useIsClient();
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
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

  useEffect(() => {
    if (!db) {
        setCompaniesLoading(false);
        return;
    }
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      try {
        const companiesCollection = collection(db, 'transportCompanies');
        const q = query(companiesCollection, orderBy("name"));
        const snapshot = await getDocs(q);
        setTransportCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportCompany)));
      } catch (error) {
        console.error("Failed to fetch transport companies:", error);
        toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar as Transportadoras / Empresas." });
      } finally {
        setCompaniesLoading(false);
      }
    };
    fetchCompanies();
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
        vehicles.sort((a, b) => new Date(b.arrivalTimestamp).getTime() - new Date(a.arrivalTimestamp).getTime());
        setVehiclesInsideFactory(vehicles);
    }, (error) => {
        console.error("Error fetching vehicles inside factory:", error);
        toast({ variant: "destructive", title: "Erro em Tempo Real", description: "Não foi possível atualizar a lista de veículos na fábrica." });
    });

    return () => unsubscribe();
  }, [toast]);


  const handleSearch = useCallback(async () => {
    if (!db) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
        // Build the base query, always ordering by date. This is efficient.
        let q = query(collection(db, 'vehicleEntries'), orderBy('arrivalTimestamp', 'desc'));

        // Apply date range filter on the server, as it's the most effective one.
        if (filters.dateRange?.from) {
            q = query(q, where('arrivalTimestamp', '>=', Timestamp.fromDate(filters.dateRange.from)));
        }
        if (filters.dateRange?.to) {
            const toDate = new Date(filters.dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            q = query(q, where('arrivalTimestamp', '<=', Timestamp.fromDate(toDate)));
        }
        
        const querySnapshot = await getDocs(q);
        let results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleEntry));

        // Apply other filters on the client-side for flexibility
        if (filters.transportCompany.trim()) {
            results = results.filter(entry => 
                entry.transportCompanyName.toLowerCase().includes(filters.transportCompany.trim().toLowerCase())
            );
        }
        if (filters.driverName.trim()) {
            results = results.filter(entry => 
                entry.driverName.toLowerCase().includes(filters.driverName.trim().toLowerCase())
            );
        }
        if (filters.plate.trim()) {
             results = results.filter(entry => 
                entry.plate1.toLowerCase().includes(filters.plate.trim().toLowerCase()) ||
                entry.plate2?.toLowerCase().includes(filters.plate.trim().toLowerCase()) ||
                entry.plate3?.toLowerCase().includes(filters.plate.trim().toLowerCase())
            );
        }

        setFilteredEntries(results);

    } catch (error) {
        console.error("Error searching entries:", error);
        if (error instanceof Error && error.message.includes("index")) {
            toast({
                variant: 'destructive',
                title: 'Erro de Banco de Dados',
                description: 'A consulta requer um índice. Tente usar menos filtros ou contate o suporte.',
                duration: 8000
            });
        } else {
            toast({ variant: 'destructive', title: 'Erro de Busca', description: 'Não foi possível realizar a busca no histórico.' });
        }
    } finally {
        setIsSearching(false);
    }
  }, [filters, toast]);


  const handleExportToCSV = () => {
    if (filteredEntries.length === 0) {
        toast({variant: 'destructive', title: "Nenhum dado", description: "Não há dados para exportar com os filtros atuais."});
        return;
    }
    const headers = ["ID/CÓDIGO", "MOTORISTA", "AJUDANTE1", "AJUDANTE2", "TRANSPORTADORA / EMPRESA", "PLACA1", "PLACA2", "PLACA3", "DESTINO INTERNO", "TIPO MOV.", "OBSERVAÇÃO", "DATA/HORA CHEGADA", "DATA/HORA LIBERAÇÃO", "LIBERADO POR", "DATA/HORA SAÍDA", "STATUS", "REGISTRADO POR"];
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
            escapeCsvField(new Date(e.arrivalTimestamp).toLocaleString('pt-BR')),
            escapeCsvField(e.liberationTimestamp ? new Date(e.liberationTimestamp).toLocaleString('pt-BR') : ''),
            escapeCsvField(e.liberatedBy || ''),
            escapeCsvField(e.exitTimestamp ? new Date(e.exitTimestamp).toLocaleString('pt-BR') : ''),
            escapeCsvField(
                e.status === 'saiu' ? 'Saiu' :
                e.status === 'entrada_liberada' ? 'Na fábrica' :
                'No pátio' 
            ),
            escapeCsvField(e.registeredBy)
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

  const resetFilters = () => {
    setFilters({ transportCompany: '', driverName: '', plate: '', dateRange: undefined });
    setFilteredEntries([]);
    setHasSearched(false);
  };
  
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
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
    <div className="container mx-auto py-8 space-y-8">
      <div>
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
                <Label htmlFor="transportCompanyFilter">Transportadora / Empresa</Label>
                <div className="relative">
                  <Input
                    id="transportCompanyFilter"
                    placeholder={companiesLoading ? "CARREGANDO..." : "FILTRAR POR TRANSPORTADORA / EMPRESA..."}
                    value={filters.transportCompany}
                    onChange={(e) => setFilters(prev => ({ ...prev, transportCompany: e.target.value }))}
                    disabled={companiesLoading}
                    list="transport-company-filter-list"
                  />
                   {companiesLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                </div>
                <datalist id="transport-company-filter-list">
                  {transportCompanies.map((company) => (
                    <option key={company.id} value={company.name} />
                  ))}
                </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="driverNameFilter">Nome do Motorista</Label>
              <Input
                id="driverNameFilter"
                placeholder="FILTRAR POR NOME..."
                value={filters.driverName}
                onChange={(e) => setFilters(prev => ({...prev, driverName: e.target.value}))}
              />
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
          <Button onClick={handleExportToCSV} variant="default" disabled={filteredEntries.length === 0}><Download className="mr-2 h-4 w-4" /> EXPORTAR PARA CSV</Button>
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
                        <TableHead>CHEGADA</TableHead>
                        <TableHead>LIBERAÇÃO</TableHead>
                        <TableHead>SAÍDA</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead className="text-right">AÇÕES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">{entry.barcode}</TableCell>
                          <TableCell>{entry.driverName}</TableCell>
                          <TableCell>{entry.transportCompanyName}</TableCell>
                          <TableCell>{entry.plate1}</TableCell>
                          <TableCell>{new Date(entry.arrivalTimestamp).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{entry.liberationTimestamp ? new Date(entry.liberationTimestamp).toLocaleString('pt-BR') : 'N/A'}</TableCell>
                          <TableCell>{entry.exitTimestamp ? new Date(entry.exitTimestamp).toLocaleString('pt-BR') : 'N/A'}</TableCell>
                          <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                                  entry.status === 'saiu' ? 'bg-red-100 text-red-700' :
                                  entry.status === 'entrada_liberada' ? 'bg-green-100 text-green-700' :
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                                  {entry.status === 'saiu' ? 'Saiu' : entry.status === 'entrada_liberada' ? 'Na fábrica' : 'No pátio'}
                              </span>
                          </TableCell>
                          <TableCell className="text-right">
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
                    <p className="text-muted-foreground text-center py-8">NENHUM REGISTRO ENCONTRADO COM OS FILTROS APLICADOS.</p>
                )
             ) : (
                <div className="text-center py-12">
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
          <CardTitle className="text-xl font-semibold text-primary flex items-center"><Truck className="mr-2 h-5 w-5" />Veículos Atualmente na Fábrica ({vehiclesInsideFactory.length})</CardTitle>
          <CardDescription>Lista de veículos que registraram entrada e ainda não saíram.</CardDescription>
        </CardHeader>
        <CardContent>
           {vehiclesInsideFactory.length > 0 ? (
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
                {vehiclesInsideFactory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{entry.barcode}</TableCell>
                    <TableCell>{entry.plate1}</TableCell>
                    <TableCell>{entry.driverName}</TableCell>
                    <TableCell>{entry.transportCompanyName}</TableCell>
                    <TableCell>{new Date(entry.arrivalTimestamp).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{entry.liberationTimestamp ? new Date(entry.liberationTimestamp).toLocaleString('pt-BR') : 'N/A'}</TableCell>
                     <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full whitespace-nowrap bg-green-100 text-green-700">
                            Na fábrica
                        </span>
                    </TableCell>
                    <TableCell className="text-right">
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
            <p className="text-muted-foreground text-center py-8">NENHUM VEÍCULO DENTRO DA FÁBRICA NO MOMENTO.</p>
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
