
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { VehicleEntryFormData, VehicleEntry } from '@/lib/types';
import { Save, SendToBack, Clock, CheckCircle, Printer, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock data for dropdowns - in real app, this would come from Cadastros Gerais / API
const mockTransportCompanies = ['TransAlpha', 'BetaLog', 'CargaExpress', 'GamaTrans'];
const mockInternalDestinations = ['Almoxarifado A', 'Produção Bloco B', 'Expedição Setor C', 'Pátio Espera', 'Verificação'];
const mockMovementTypes = ['Carga', 'Descarga', 'Devolução', 'Visita Técnica', 'Manutenção', 'Carga Pendente', 'Inspeção'];

// Store entries in memory for this demo
// This should be replaced with API calls to Firebase in a real app
let entriesStore: VehicleEntry[] = [];
let waitingYardStore: VehicleEntry[] = [];

// Populate with some mock data for development if stores are empty
if (process.env.NODE_ENV === 'development') {
    if (waitingYardStore.length === 0) {
        waitingYardStore.push( { id: '20230115140000', driverName: 'Daniela Silva', transportCompanyName: 'BetaLog', plate1: 'JKL-4444', internalDestinationName: 'Pátio Espera', movementType: 'Carga Pendente', entryTimestamp: new Date().toISOString(), status: 'aguardando_patio', registeredBy: 'user2' });
        waitingYardStore.push( { id: '20230115150000', driverName: 'Eduardo Lima', transportCompanyName: 'GamaTrans', plate1: 'MNO-5555', internalDestinationName: 'Verificação', movementType: 'Inspeção', entryTimestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'aguardando_patio', registeredBy: 'user1' });
    }
     if (entriesStore.length === 0) {
        // Can add some initial entriesStore items here if needed for direct navigation to this page in dev
    }
}


const entrySchema = z.object({
  driverName: z.string().min(3, { message: 'Nome do motorista é obrigatório (mín. 3 caracteres).' }),
  assistant1Name: z.string().optional(),
  assistant2Name: z.string().optional(),
  transportCompanyName: z.string().min(1, { message: 'Transportadora é obrigatória.' }),
  plate1: z.string().min(7, { message: 'Placa 1 é obrigatória (mín. 7 caracteres).' }).max(8),
  plate2: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 2 inválida (mín. 7 caracteres)."}),
  plate3: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 3 inválida (mín. 7 caracteres)."}),
  internalDestinationName: z.string().min(1, { message: 'Destino interno é obrigatório.' }),
  movementType: z.string().min(1, { message: 'Tipo de movimentação é obrigatório.' }),
  observation: z.string().max(500, { message: 'Observação muito longa (máx. 500 caracteres).' }).optional(),
});


export default function RegistroEntradaPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssistants, setShowAssistants] = useState(false);

  const [waitingVehicles, setWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync with global waitingYardStore
  useEffect(() => {
    setWaitingVehicles([...waitingYardStore]); // Create a new array to trigger re-render
  }, []); // Initial load

  // Listen for changes in waitingYardStore (e.g., after adding a new vehicle to wait)
  // This is a bit of a hack for global array mutation. Proper state management would be better.
  useEffect(() => {
    // This effect is tricky because waitingYardStore is mutated directly.
    // A more robust solution would involve a shared state/context for these stores.
    // For now, we assume that after an action that modifies waitingYardStore (like handleFormSubmit),
    // we might need to refresh if this component doesn't re-render automatically.
    // The setWaitingVehicles in handleApproveEntry and handleFormSubmit (for 'aguardando_patio') helps.
    const interval = setInterval(() => {
        if (waitingVehicles.length !== waitingYardStore.length) {
            setWaitingVehicles([...waitingYardStore]);
        }
    }, 1000); // Check every second for changes
    return () => clearInterval(interval);
  }, [waitingVehicles.length]);


  const form = useForm<VehicleEntryFormData>({
    resolver: zodResolver(entrySchema),
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

  const handleFormSubmit = async (data: VehicleEntryFormData, status: 'aguardando_patio' | 'entrada_liberada') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    setIsSubmitting(true);

    const newEntry: VehicleEntry = {
      ...data,
      id: generateBarcode(),
      entryTimestamp: new Date().toISOString(),
      status: status,
      registeredBy: user.login,
    };
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (status === 'aguardando_patio') {
      waitingYardStore.push(newEntry);
      setWaitingVehicles([...waitingYardStore]); // Update local state
      toast({
        title: 'Registro Enviado para o Pátio',
        description: `Veículo ${newEntry.plate1} aguardando liberação. Código: ${newEntry.id}`,
        className: 'bg-yellow-500 text-white',
        icon: <Clock className="h-6 w-6 text-white" />
      });
      // Don't redirect, show the list on the same page
    } else {
      entriesStore.push(newEntry);
      toast({
        title: 'Entrada Liberada!',
        description: `Entrada do veículo ${newEntry.plate1} registrada com sucesso. Código: ${newEntry.id}`,
        className: 'bg-green-600 text-white',
        icon: <CheckCircle className="h-6 w-6 text-white" />,
      });
      console.log("Printing document for entry:", newEntry);
    }
    
    form.reset();
    setIsSubmitting(false);
  };

  const filteredWaitingVehicles = useMemo(() => {
    if (!searchTerm) return waitingVehicles;
    return waitingVehicles.filter(v =>
      v.plate1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transportCompanyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waitingVehicles, searchTerm]);

  const handleApproveEntry = (vehicleId: string) => {
    const vehicleToApproveIndex = waitingYardStore.findIndex(v => v.id === vehicleId);
    if (vehicleToApproveIndex > -1) {
      const vehicleToApprove = waitingYardStore[vehicleToApproveIndex];
      const updatedVehicle = { ...vehicleToApprove, status: 'entrada_liberada' as 'entrada_liberada' };
      
      waitingYardStore.splice(vehicleToApproveIndex, 1); // Remove from waiting
      entriesStore.push(updatedVehicle); // Add to general entries

      setWaitingVehicles([...waitingYardStore]); // Update local state

      toast({
        title: 'Entrada Aprovada!',
        description: `Veículo ${updatedVehicle.plate1} liberado para entrada. Código: ${updatedVehicle.id}`,
        className: 'bg-green-600 text-white',
        icon: <CheckCircle className="h-6 w-6 text-white" />
      });
      console.log("Printing document for approved entry:", updatedVehicle);
    }
  };
  
  const handlePrintWaitingEntry = (entry: VehicleEntry) => {
    console.log("Printing waiting entry:", entry);
    toast({ title: "Imprimir Documento de Espera", description: `Simulando impressão para ${entry.plate1}. Código: ${entry.id}` });
  };


  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary font-headline">Registro de Nova Entrada</CardTitle>
          <CardDescription>Preencha os dados abaixo para registrar a entrada de um veículo.</CardDescription>
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
                      <FormControl><Input placeholder="Ex: João Silva" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transportCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transportadora</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione a transportadora" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockTransportCompanies.map(company => (
                            <SelectItem key={company} value={company}>{company}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <FormControl><Input placeholder="Nome do Ajudante 1" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="Nome do Ajudante 2" {...field} /></FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockInternalDestinations.map(dest => (
                            <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                disabled={isSubmitting}
                className="w-full sm:w-auto"
            >
                {isSubmitting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <SendToBack className="mr-2 h-4 w-4" /> }
                Aguardar no Pátio
            </Button>
            <Button 
                onClick={form.handleSubmit(data => handleFormSubmit(data, 'entrada_liberada'))}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
                {isSubmitting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" /> }
                Entrada Liberada e Imprimir
            </Button>
        </CardFooter>
      </Card>

      {/* Section for Vehicles Awaiting Release */}
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle className="text-xl font-semibold text-primary font-headline flex items-center">
                    <Clock className="mr-3 h-7 w-7 text-accent" />
                    Veículos Aguardando Liberação ({filteredWaitingVehicles.length})
                </CardTitle>
                <CardDescription>Lista de veículos no pátio que necessitam de aprovação para entrada.</CardDescription>
            </div>
             <div className="mt-4 sm:mt-0 w-full sm:w-auto max-w-xs">
                <Label htmlFor="searchWaiting" className="sr-only">Buscar</Label>
                <Input 
                    id="searchWaiting"
                    type="text"
                    placeholder="Buscar por placa, motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWaitingVehicles.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID/Código</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Placa 1</TableHead>
                  <TableHead>Data/Hora Registro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitingVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono text-xs">{vehicle.id}</TableCell>
                    <TableCell>{vehicle.driverName}</TableCell>
                    <TableCell>{vehicle.transportCompanyName}</TableCell>
                    <TableCell>{vehicle.plate1}</TableCell>
                    <TableCell>{new Date(vehicle.entryTimestamp).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleApproveEntry(vehicle.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                      </Button>
                       <Button variant="outline" size="sm" onClick={() => handlePrintWaitingEntry(vehicle)} title="Imprimir Documento de Espera">
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
  );
}

    