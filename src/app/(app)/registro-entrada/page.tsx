"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { VehicleEntryFormData, VehicleEntry } from '@/lib/types'; // Assuming types are defined
import { AlertCircle, CheckCircle, Clock, Save, SendToBack } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock data for dropdowns - in real app, this would come from Cadastros Gerais / API
const mockTransportCompanies = ['TransAlpha', 'BetaLog', 'CargaExpress'];
const mockInternalDestinations = ['Almoxarifado A', 'Produção Bloco B', 'Expedição Setor C'];
const mockMovementTypes = ['Carga', 'Descarga', 'Devolução', 'Visita Técnica', 'Manutenção'];

// Store entries in memory for this demo
// This should be replaced with API calls to Firebase in a real app
let entriesStore: VehicleEntry[] = [];
let waitingYardStore: VehicleEntry[] = [];


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
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (status === 'aguardando_patio') {
      waitingYardStore.push(newEntry);
      toast({
        title: 'Registro Enviado para o Pátio',
        description: `Veículo ${newEntry.plate1} aguardando liberação. Código: ${newEntry.id}`,
        className: 'bg-yellow-500 text-white',
        icon: <Clock className="h-6 w-6 text-white" />
      });
      router.push('/aguardando-liberacao');
    } else {
      entriesStore.push(newEntry);
      toast({
        title: 'Entrada Liberada!',
        description: `Entrada do veículo ${newEntry.plate1} registrada com sucesso. Código: ${newEntry.id}`,
        className: 'bg-green-600 text-white',
        icon: <CheckCircle className="h-6 w-6 text-white" />,
      });
      // Here you would trigger printing the document with newEntry data
      console.log("Printing document for entry:", newEntry);
    }
    
    form.reset();
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto py-8">
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
                    <FormControl><Textarea placeholder="Detalhes adicionais..." {...field} rows={4} /></FormControl>
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
    </div>
  );
}
