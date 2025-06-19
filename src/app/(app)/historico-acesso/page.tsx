
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
import { Download, Printer, Trash2, Search, Truck, RotateCcw } from 'lucide-react';
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
import { entriesStore, waitingYardStore } from '@/lib/vehicleEntryStores'; // Using centralized vehicle entry stores


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
    if (searchTerm.trim()) { // If "Pesquisa Rápida" has a value, it's the ONLY filter
        const lowerSearchTerm = searchTerm.trim().toLowerCase();
        return allEntries
            .filter(e =>
                Object.values(e).some(val => String(val).toLowerCase().includes(lowerSearchTerm))
            )
            .sort((a,b) => new Date(b.entryTimestamp).getTime() - new Date(a.entryTimestamp).getTime());
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
        tempEntries = tempEntries.filter(e => new Date(e.entryTimestamp) >= fromDate);
    }
    if (filters.dateRange?.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        tempEntries = tempEntries.filter(e => new Date(e.entryTimestamp) <= toDate);
    }
    
    if (!filters.transportCompany.trim() && !filters.plate.trim() && !filters.dateRange?.from && !searchTerm.trim()){
      return [];
    }


    return tempEntries.sort((a, b) => new Date(b.entryTimestamp).getTime() - new Date(a.entryTimestamp).getTime());
  }, [allEntries, filters, searchTerm]);


  const vehiclesInsideFactory = useMemo(() => {
    return allEntries.filter(e => e.status === 'entrada_liberada')
                     .sort((a,b) => new Date(a.entryTimestamp).getTime() - new Date(b.entryTimestamp).getTime());
  }, [allEntries]);


  const handleExportToCSV = () => {
    if (filteredEntries.length === 0) {
        toast({variant: 'destructive', title: "Nenhum dado", description: "Não há dados para exportar com os filtros atuais."});
        return;
    }
    const headers = ["ID/CÓDIGO", "MOTORISTA", "AJUDANTE1", "AJUDANTE2", "TRANSPORTADORA", "PLACA1", "PLACA2", "PLACA3", "DESTINO INTERNO", "TIPO MOV.", "OBSERVAÇÃO", "DATA/HORA ENTRADA", "DATA/HORA SAÍDA", "STATUS", "REGISTRADO POR"];
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
            escapeCsvField(new Date(e.entryTimestamp).toLocaleString('pt-BR')),
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


  const handlePrintEntry = (entry: VehicleEntry) => {
    console.log("Printing entry:", entry);
    toast({ title: "Imprimir Documento", description: `Simulando impressão para ${entry.plate1}. Código: ${entry.id}` });
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
              <Label>Período de Entrada</Label>
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
                    <TableHead>ENTRADA</TableHead>
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
                      <TableCell>{new Date(entry.entryTimestamp).toLocaleString('pt-BR')}</TableCell>
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
                  <TableHead>ENTRADA</TableHead>
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
                    <TableCell>{new Date(entry.entryTimestamp).toLocaleString('pt-BR')}</TableCell>
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

