
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry } from '@/lib/types';
import { Download, Printer, Trash2, Search, Truck, RotateCcw, CheckCircle } from 'lucide-react';
import type { DateRange } from "react-day-picker";
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
import { entriesStore, waitingYardStore } from '@/lib/vehicleEntryStores'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const generateVehicleEntryPdf = async (entry: VehicleEntry): Promise<{ success: boolean; action: 'print_dialog_opened' | 'opened_in_new_tab' | 'downloaded_fallback' | 'error'; error?: any }> => {
  const pdfContentHtml = `
    <div id="pdf-content-${entry.id}" style="font-family: Arial, sans-serif; padding: 20px; width: 580px; border: 1px solid #ccc; background-color: #fff;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 20px;">COMPROVANTE DE ENTRADA</h2>
      <div style="text-align: center; margin-bottom: 25px; padding: 15px; border: 2px dashed #333; background-color: #f9f9f9;">
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 3px; margin: 0; color: #000;">${entry.id}</p>
        <p style="font-size: 10px; margin: 5px 0 0 0; color: #555;">(CÓDIGO DE BARRAS)</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tbody>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Motorista:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.driverName}</td></tr>
          ${entry.assistant1Name ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Ajudante 1:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.assistant1Name}</td></tr>` : ''}
          ${entry.assistant2Name ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Ajudante 2:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.assistant2Name}</td></tr>` : ''}
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Transportadora:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.transportCompanyName}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Placa 1:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.plate1}</td></tr>
          ${entry.plate2 ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Placa 2:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.plate2}</td></tr>` : ''}
          ${entry.plate3 ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Placa 3:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.plate3}</td></tr>` : ''}
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Destino Interno:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.internalDestinationName}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Tipo Mov.:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.movementType}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Observação:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.observation || '-'}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Data/Hora Chegada:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${new Date(entry.arrivalTimestamp).toLocaleString('pt-BR')}</td></tr>
          ${entry.liberationTimestamp ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Data/Hora Liberação:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${new Date(entry.liberationTimestamp).toLocaleString('pt-BR')}</td></tr>` : ''}
          <tr><td style="padding: 6px; font-weight: bold;">Registrado Por:</td><td style="padding: 6px;">${entry.registeredBy}</td></tr>
        </tbody>
      </table>
      <p style="text-align: center; font-size: 10px; margin-top: 25px; color: #777;">Portaria Única RES - Comprovante de Entrada</p>
    </div>
  `;

  const hiddenDiv = document.createElement('div');
  hiddenDiv.style.position = 'absolute';
  hiddenDiv.style.left = '-9999px';
  hiddenDiv.innerHTML = pdfContentHtml;
  document.body.appendChild(hiddenDiv);

  const contentElement = document.getElementById(`pdf-content-${entry.id}`);
  if (!contentElement) {
    console.error('PDF content element not found');
     if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv);
    return { success: false, action: 'error', error: 'PDF content element not found' };
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(contentElement, { scale: 2 });
  } catch (canvasError) {
    console.error("Error generating canvas:", canvasError);
    if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv);
    return { success: false, action: 'error', error: 'Canvas generation failed' };
  }

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidthCanvas = canvas.width;
  const imgHeightCanvas = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidthCanvas, pdfHeight / imgHeightCanvas);
  const imgX = (pdfWidth - imgWidthCanvas * ratio) / 2;
  const imgY = 15; 
  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidthCanvas * ratio, imgHeightCanvas * ratio);
    
  return new Promise((resolve) => {
    const pdfBlob = pdf.output('blob');
    let blobUrl = URL.createObjectURL(pdfBlob);
    let iframe: HTMLIFrameElement | null = null;
    let cleanupTimeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = ''; 
      }
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
        iframe = null;
      }
      if (document.body.contains(hiddenDiv)) {
        document.body.removeChild(hiddenDiv);
      }
      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId);
      }
    };

    iframe = document.createElement('iframe');
    iframe.id = `print-iframe-${entry.id}`;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const loadTimeout = setTimeout(() => {
      if (!iframe) return;
      console.warn(`Iframe for ${entry.id} timed out. Falling back to new tab.`);
      const newWindow = window.open(blobUrl, '_blank');
      if (newWindow) {
        resolve({ success: true, action: 'opened_in_new_tab' });
      } else {
        console.warn(`New tab for ${entry.id} blocked. Falling back to download.`);
        pdf.save(`comprovante-entrada-${entry.id}.pdf`);
        resolve({ success: true, action: 'downloaded_fallback' });
      }
      cleanup();
    }, 7000);

    iframe.onload = () => {
      if (!iframe) return;
      clearTimeout(loadTimeout);
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          resolve({ success: true, action: 'print_dialog_opened' });
          cleanupTimeoutId = setTimeout(cleanup, 3000); 
        } else {
          throw new Error("Iframe contentWindow not available.");
        }
      } catch (printError) {
        console.error(`Error triggering print dialog for ${entry.id}:`, printError);
        const newWindow = window.open(blobUrl, '_blank');
        if (newWindow) {
          resolve({ success: true, action: 'opened_in_new_tab' });
        } else {
          console.warn(`New tab for ${entry.id} blocked after print error. Falling back to download.`);
          pdf.save(`comprovante-entrada-${entry.id}.pdf`);
          resolve({ success: true, action: 'downloaded_fallback' });
        }
        cleanup();
      }
    };

    iframe.onerror = (e) => {
      if (!iframe) return;
      clearTimeout(loadTimeout);
      console.error(`Error loading PDF into iframe for ${entry.id}:`, e);
      const newWindow = window.open(blobUrl, '_blank');
      if (newWindow) {
        resolve({ success: true, action: 'opened_in_new_tab' });
      } else {
        console.warn(`New tab for ${entry.id} blocked after iframe error. Falling back to download.`);
        pdf.save(`comprovante-entrada-${entry.id}.pdf`);
        resolve({ success: true, action: 'downloaded_fallback' });
      }
      cleanup();
    };
    iframe.src = blobUrl;
  }).catch(error => {
      console.error("Error in PDF generation promise:", error);
      if (document.body.contains(hiddenDiv)) document.body.removeChild(hiddenDiv);
      return { success: false, action: 'error', error: "PDF generation process failed" };
  });
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
  const [allEntries, setAllEntries] = useState<VehicleEntry[]>([]);

  useEffect(() => {
    const syncAllEntries = () => {
      const combined = [...entriesStore, ...waitingYardStore];
      if (JSON.stringify(allEntries) !== JSON.stringify(combined)) {
        setAllEntries(combined);
      }
    };
    syncAllEntries();
    const intervalId = setInterval(syncAllEntries, 2000);
    return () => clearInterval(intervalId);
  }, [allEntries]);


  const [filters, setFilters] = useState({
    transportCompany: '',
    plate: '',
    dateRange: undefined as DateRange | undefined,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const areAnyFiltersOrSearchActive = useMemo(() => {
    return (
        searchTerm.trim() !== '' ||
        filters.transportCompany.trim() !== '' ||
        filters.plate.trim() !== '' ||
        !!filters.dateRange?.from 
    );
  }, [searchTerm, filters]);

  const filteredEntries = useMemo(() => {
    if (searchTerm.trim()) { 
        const lowerSearchTerm = searchTerm.trim().toLowerCase();
        return allEntries
            .filter(e =>
                Object.values(e).some(val => String(val).toLowerCase().includes(lowerSearchTerm))
            )
            .sort((a,b) => new Date(b.arrivalTimestamp).getTime() - new Date(a.arrivalTimestamp).getTime());
    }

    let tempEntries = [...allEntries];
    const lowerPlate = filters.plate.trim().toLowerCase();

    if (filters.transportCompany.trim()) {
        tempEntries = tempEntries.filter(e => e.transportCompanyName.toLowerCase().includes(filters.transportCompany.trim().toLowerCase()));
    }
    if (filters.plate.trim()) {
        tempEntries = tempEntries.filter(e =>
            (e.plate1?.toLowerCase() || '').includes(lowerPlate) ||
            (e.plate2?.toLowerCase() || '').includes(lowerPlate) ||
            (e.plate3?.toLowerCase() || '').includes(lowerPlate)
        );
    }
    if (filters.dateRange?.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        tempEntries = tempEntries.filter(e => new Date(e.arrivalTimestamp) >= fromDate);
    }
    if (filters.dateRange?.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        tempEntries = tempEntries.filter(e => new Date(e.arrivalTimestamp) <= toDate);
    }
    
    if (!filters.transportCompany.trim() && !filters.plate.trim() && !filters.dateRange?.from && !searchTerm.trim()){
      return [];
    }


    return tempEntries.sort((a, b) => new Date(b.arrivalTimestamp).getTime() - new Date(a.arrivalTimestamp).getTime());
  }, [allEntries, filters, searchTerm]);


  const vehiclesInsideFactory = useMemo(() => {
    return allEntries.filter(e => e.status === 'entrada_liberada')
                     .sort((a,b) => new Date(a.arrivalTimestamp).getTime() - new Date(b.arrivalTimestamp).getTime());
  }, [allEntries]);


  const handleExportToCSV = () => {
    if (filteredEntries.length === 0) {
        toast({variant: 'destructive', title: "Nenhum dado", description: "Não há dados para exportar com os filtros atuais."});
        return;
    }
    const headers = ["ID/CÓDIGO", "MOTORISTA", "AJUDANTE1", "AJUDANTE2", "TRANSPORTADORA", "PLACA1", "PLACA2", "PLACA3", "DESTINO INTERNO", "TIPO MOV.", "OBSERVAÇÃO", "DATA/HORA CHEGADA", "DATA/HORA LIBERAÇÃO", "DATA/HORA SAÍDA", "STATUS", "REGISTRADO POR"];
    const csvRows = [
        headers.map(escapeCsvField).join(','),
        ...filteredEntries.map(e => [
            escapeCsvField(e.id),
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
        toast({title: "Exportado!", description: "Dados exportados para CSV."});
    } else {
         toast({variant: 'destructive', title: "Erro", description: "Seu navegador não suporta a exportação direta."});
    }
  };

  const handleDeleteOldRecords = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const updatedEntriesStore = entriesStore.filter(e => {
        if (e.status === 'saiu' && e.exitTimestamp) {
            return new Date(e.exitTimestamp) > oneYearAgo;
        }
        return true;
    });
    entriesStore.length = 0; 
    entriesStore.push(...updatedEntriesStore); 

    const updatedWaitingYardStore = waitingYardStore.filter(e => {
        if (e.status === 'saiu' && e.exitTimestamp) { 
            return new Date(e.exitTimestamp) > oneYearAgo;
        }
        return true;
    });
    waitingYardStore.length = 0;
    waitingYardStore.push(...updatedWaitingYardStore);

    setAllEntries([...entriesStore, ...waitingYardStore]); 

    toast({ title: 'Registros Antigos Excluídos', description: 'Registros com mais de 365 dias e status "saiu" foram removidos.' });
  };


  const handlePrintEntry = async (entry: VehicleEntry) => {
    toast({
        title: 'Gerando Documento',
        description: `Preparando documento para ${entry.plate1}...`,
    });

    const pdfResult = await generateVehicleEntryPdf(entry);
    
    if (pdfResult.success) {
        let pdfToastDescription = '';
        switch (pdfResult.action) {
            case 'print_dialog_opened':
                pdfToastDescription = `Documento para ${entry.plate1} enviado para impressão.`;
                break;
            case 'opened_in_new_tab':
                pdfToastDescription = `Impressão direta falhou. PDF para ${entry.plate1} aberto em nova aba.`;
                break;
            case 'downloaded_fallback':
                pdfToastDescription = `Impressão e abertura em nova aba falharam. PDF para ${entry.plate1} baixado.`;
                break;
        }
        if (pdfToastDescription) {
            toast({
                title: 'Documento de Entrada',
                description: pdfToastDescription,
                icon: <CheckCircle className="h-6 w-6 text-green-700" />
            });
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro no Documento PDF',
            description: `Falha ao gerar o PDF para ${entry.plate1}. Detalhe: ${pdfResult.error || 'N/A'}`,
        });
    }
  };

  const transportCompanyOptions = useMemo(() => {
    const companies = new Set(allEntries.map(e => e.transportCompanyName));
    return Array.from(companies);
  }, [allEntries]);

  const resetFilters = () => {
    setFilters({ transportCompany: '', plate: '', dateRange: undefined });
    setSearchTerm('');
  };


  return (
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
              <Label htmlFor="searchTermGlobal">Pesquisa Rápida</Label>
              <Input id="searchTermGlobal" placeholder="BUSCAR EM TODOS OS CAMPOS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
             <div className="space-y-1">
                <Label htmlFor="transportCompanyFilter">Transportadora</Label>
                <Select value={filters.transportCompany} onValueChange={(value) => setFilters(prev => ({...prev, transportCompany: value === 'all' ? '' : value}))} disabled={!!searchTerm.trim()}>
                    <SelectTrigger id="transportCompanyFilter"><SelectValue placeholder="TODAS TRANSPORTADORAS" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">TODAS TRANSPORTADORAS</SelectItem>
                        {transportCompanyOptions.map(tc => <SelectItem key={tc} value={tc}>{tc}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plateFilter">Placa</Label>
              <Input id="plateFilter" placeholder="FILTRAR POR PLACA..." value={filters.plate} onChange={(e) => setFilters(prev => ({...prev, plate: e.target.value}))} disabled={!!searchTerm.trim()} />
            </div>
            <div className="space-y-1">
              <Label>Período de Chegada</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => setFilters(prev => ({...prev, dateRange: range}))}
                className="w-full"
                disabled={!!searchTerm.trim()}
              />
            </div>
          </div>
           <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={resetFilters} variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> LIMPAR FILTROS</Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 justify-end">
          <Button onClick={handleExportToCSV} variant="default" disabled={!areAnyFiltersOrSearchActive || filteredEntries.length === 0}><Download className="mr-2 h-4 w-4" /> EXPORTAR PARA CSV</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> EXCLUIR ANTIGOS (+365D)</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir registros de saída com mais de 365 dias? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>CANCELAR</AlertDialogCancel><AlertDialogAction onClick={handleDeleteOldRecords} className="bg-destructive hover:bg-destructive/90">EXCLUIR</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      {areAnyFiltersOrSearchActive ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Resultados ({filteredEntries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length > 0 ? (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID/CÓDIGO</TableHead>
                    <TableHead>MOTORISTA</TableHead>
                    <TableHead>TRANSPORTADORA</TableHead>
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
                      <TableCell className="font-mono text-xs">{entry.id}</TableCell>
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
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
                <Search className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-xl font-medium text-muted-foreground">
                    APLIQUE UM FILTRO OU FAÇA UMA PESQUISA
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    Utilize os campos acima para buscar no histórico de acessos.
                </p>
            </div>
          </CardContent>
        </Card>
      )}


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
                  <TableHead>TRANSPORTADORA</TableHead>
                  <TableHead>CHEGADA</TableHead>
                  <TableHead>LIBERAÇÃO</TableHead>
                  <TableHead>STATUS</TableHead>
                   <TableHead className="text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiclesInsideFactory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{entry.id}</TableCell>
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
  );
}
