
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
import { Download, Filter, Printer, Trash2, CalendarDays, Search, Truck, RotateCcw } from 'lucide-react';
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


// Mock data - replace with API/Firebase calls
// Using entriesStore and waitingYardStore from registro-entrada for demo purposes.
// This is a major simplification.
let entriesStore: VehicleEntry[] = [];
let waitingYardStore: VehicleEntry[] = [];

// Populate with some mock data for development if stores are empty
if (process.env.NODE_ENV === 'development') {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);

    if (entriesStore.length === 0) {
        entriesStore = [
            { id: '20230115100000', driverName: 'ANA CLARA', transportCompanyName: 'LOGMAX', plate1: 'ABC-1111', internalDestinationName: 'DOCAS 1-3', movementType: 'DESCARGA', entryTimestamp: yesterday.toISOString(), exitTimestamp: new Date(yesterday.getTime() + 2 * 3600 * 1000).toISOString(), status: 'saiu', registeredBy: 'admin', observation: 'Material "frágil", manusear com cuidado.' },
            { id: '20230115113000', driverName: 'BRUNO COSTA', transportCompanyName: 'TRANSFAST', plate1: 'DEF-2222', internalDestinationName: 'ARMAZÉM SUL', movementType: 'CARGA', entryTimestamp: new Date().toISOString(), status: 'entrada_liberada', registeredBy: 'user1' },
            { id: '20220110090000', driverName: 'CARLOS DIAS', transportCompanyName: 'LOGMAX', plate1: 'GHI-3333', internalDestinationName: 'BLOCO C', movementType: 'DEVOLUÇÃO', entryTimestamp: lastYear.toISOString(), exitTimestamp: new Date(lastYear.getTime() + 4 * 3600 * 1000).toISOString(), status: 'saiu', registeredBy: 'admin' },
        ];
    }
    if (waitingYardStore.length === 0) {
        waitingYardStore.push( { id: '20230115140000', driverName: 'DANIELA SILVA', transportCompanyName: 'BETALOG', plate1: 'JKL-4444', internalDestinationName: 'PÁTIO ESPERA', movementType: 'CARGA PENDENTE', entryTimestamp: new Date().toISOString(), status: 'aguardando_patio', registeredBy: 'user2' });
    }
}

const escapeCsvField = (field: any): string => {
  if (field === null || typeof field === 'undefined') {
    return '';
  }
  let stringField = String(field);
  // If the field contains a comma, a double quote, or a newline,
  // it needs to be enclosed in double quotes.
  // Also, any double quote within the field must be escaped by doubling it.
  if (stringField.search(/("|,|\n)/g) >= 0) {
    stringField = '"' + stringField.replace(/"/g, '""') + '"';
  }
  return stringField;
};

export default function HistoricoAcessoPage() {
  const { toast } = useToast();
  const [allEntries, setAllEntries] = useState<VehicleEntry[]>([...entriesStore, ...waitingYardStore]);

  const [filters, setFilters] = useState({
    transportCompany: '',
    plate: '',
    dateRange: undefined as DateRange | undefined,
  });
  const [searchTerm, setSearchTerm] = useState('');


  const filteredEntries = useMemo(() => {
    let entries = allEntries;

    if (searchTerm) {
      // If searchTerm is used, it's the dominant filter.
      // The results will ONLY be based on searchTerm.
      entries = entries.filter(e =>
        Object.values(e).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      // If searchTerm is not used, apply the other filters.
      if (filters.transportCompany) {
        entries = entries.filter(e => e.transportCompanyName.toLowerCase().includes(filters.transportCompany.toLowerCase()));
      }
      if (filters.plate) {
        entries = entries.filter(e =>
          e.plate1.toLowerCase().includes(filters.plate.toLowerCase()) ||
          e.plate2?.toLowerCase().includes(filters.plate.toLowerCase()) ||
          e.plate3?.toLowerCase().includes(filters.plate.toLowerCase())
        );
      }
      if (filters.dateRange?.from) {
          entries = entries.filter(e => new Date(e.entryTimestamp) >= (filters.dateRange?.from as Date));
      }
      if (filters.dateRange?.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999); // Include the whole "to" day
          entries = entries.filter(e => new Date(e.entryTimestamp) <= toDate);
      }
    }
    return entries.sort((a,b) => new Date(b.entryTimestamp).getTime() - new Date(a.entryTimestamp).getTime());
  }, [allEntries, filters, searchTerm]);

  const vehiclesInsideFactory = useMemo(() => {
    return allEntries.filter(e => e.status === 'entrada_liberada' || e.status === 'aguardando_patio');
  }, [allEntries]);

  const handleExportToCSV = () => {
    if (filteredEntries.length === 0) {
        toast({variant: 'destructive', title: "Nenhum dado", description: "Não há dados para exportar com os filtros atuais."});
        return;
    }
    const headers = ["ID/Código", "Motorista", "Ajudante1", "Ajudante2", "Transportadora", "Placa1", "Placa2", "Placa3", "Destino Interno", "Tipo Mov.", "Observação", "Data/Hora Entrada", "Data/Hora Saída", "Status", "Registrado Por"];
    const csvRows = [
        headers.map(escapeCsvField).join(','), // Headers can also be escaped for robustness
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
            escapeCsvField(e.status),
            escapeCsvField(e.registeredBy)
        ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
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
    const updatedEntries = allEntries.filter(e => {
        if (e.status === 'saiu' && e.exitTimestamp) {
            return new Date(e.exitTimestamp) > oneYearAgo;
        }
        return true; // Keep active entries or entries without exit timestamp
    });
    setAllEntries(updatedEntries);
    // Persist this change to your backend
    entriesStore = updatedEntries.filter(e => e.status !== 'aguardando_patio'); // crude update
    waitingYardStore = updatedEntries.filter(e => e.status === 'aguardando_patio'); // crude update
    toast({ title: 'Registros Antigos Excluídos', description: 'Registros com mais de 365 dias e status "saiu" foram removidos.' });
  };

  const handlePrintEntry = (entry: VehicleEntry) => {
    // In a real app, this would open a formatted print view or generate a PDF
    console.log("Printing entry:", entry);
    toast({ title: "Imprimir Documento", description: `Simulando impressão para ${entry.plate1}. Código: ${entry.id}` });
    // Example: window.print() would print the current page. You'd need a specific print component/route.
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
                <Select value={filters.transportCompany} onValueChange={(value) => setFilters(prev => ({...prev, transportCompany: value === 'all' ? '' : value}))}>
                    <SelectTrigger id="transportCompanyFilter"><SelectValue placeholder="TODAS TRANSPORTADORAS" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">TODAS TRANSPORTADORAS</SelectItem>
                        {transportCompanyOptions.map(tc => <SelectItem key={tc} value={tc}>{tc}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plateFilter">Placa</Label>
              <Input id="plateFilter" placeholder="FILTRAR POR PLACA..." value={filters.plate} onChange={(e) => setFilters(prev => ({...prev, plate: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>Período de Entrada</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(range) => setFilters(prev => ({...prev, dateRange: range}))}
                className="w-full"
              />
            </div>
          </div>
           <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={resetFilters} variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> LIMPAR FILTROS</Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 justify-end">
          <Button onClick={handleExportToCSV} variant="default"><Download className="mr-2 h-4 w-4" /> EXPORTAR PARA CSV</Button>
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
                            {entry.status === 'saiu' ? 'SAIU' : entry.status === 'entrada_liberada' ? 'DENTRO DA FÁBRICA' : 'AGUARDANDO PÁTIO'}
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
                    <TableCell>{entry.plate1}</TableCell>
                    <TableCell>{entry.driverName}</TableCell>
                    <TableCell>{entry.transportCompanyName}</TableCell>
                    <TableCell>{new Date(entry.entryTimestamp).toLocaleString('pt-BR')}</TableCell>
                     <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                            entry.status === 'entrada_liberada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {entry.status === 'entrada_liberada' ? 'LIBERADO' : 'AGUARDANDO'}
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
