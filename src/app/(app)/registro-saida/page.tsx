"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, LogOutIcon, Search } from 'lucide-react';
import type { VehicleEntry } from '@/lib/types';

// This would typically come from a shared store or context, or fetched from Firebase
// For now, let's assume `entriesStore` from `registro-entrada` is accessible or passed.
// This is a simplification for the demo. In a real app, you'd fetch from a database.
let entriesStore: VehicleEntry[] = []; // Placeholder. Needs proper data management.

const exitSchema = z.object({
  barcode: z.string().length(14, { message: 'Código de barras deve ter 14 dígitos.' }).regex(/^\d+$/, { message: 'Código de barras deve conter apenas números.' }),
});

type ExitFormValues = z.infer<typeof exitSchema>;

export default function RegistroSaidaPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundEntry, setFoundEntry] = useState<VehicleEntry | null>(null);
  const [entryNotFound, setEntryNotFound] = useState(false);

  const form = useForm<ExitFormValues>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      barcode: '',
    },
  });

  // Function to simulate finding and updating an entry.
  // In a real app, this would be an API call.
  const processExit = async (barcode: string): Promise<VehicleEntry | null> => {
    // This is a mock. Replace with actual data fetching and update.
    // For now, let's assume entriesStore is populated from somewhere (e.g., another page or context)
    // This is a major simplification.
    const entryIndex = entriesStore.findIndex(e => e.id === barcode && e.status !== 'saiu');
    if (entryIndex !== -1) {
      entriesStore[entryIndex] = {
        ...entriesStore[entryIndex],
        status: 'saiu',
        exitTimestamp: new Date().toISOString(),
      };
      return entriesStore[entryIndex];
    }
    return null;
  };


  const onSubmit = async (data: ExitFormValues) => {
    setIsProcessing(true);
    setFoundEntry(null);
    setEntryNotFound(false);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const updatedEntry = await processExit(data.barcode);

    if (updatedEntry) {
      setFoundEntry(updatedEntry);
      toast({
        title: 'Saída Registrada!',
        description: `Saída do veículo ${updatedEntry.plate1} (Código: ${updatedEntry.id}) registrada com sucesso.`,
        className: 'bg-green-600 text-white',
        icon: <CheckCircle className="h-6 w-6 text-white" />
      });
      form.reset();
    } else {
      setEntryNotFound(true);
      toast({
        variant: 'destructive',
        title: 'Erro ao Registrar Saída',
        description: 'Código de barras não encontrado ou veículo já saiu.',
      });
    }
    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary font-headline">Registro de Saída de Veículo</CardTitle>
          <CardDescription>Insira o código de barras de 14 dígitos para registrar a saída.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras (14 dígitos)</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input 
                          placeholder="Ex: 20230101120000" 
                          {...field} 
                          className="rounded-r-none"
                          maxLength={14}
                        />
                        <Button type="submit" className="rounded-l-none" disabled={isProcessing}>
                          {isProcessing ? (
                            <Search className="h-4 w-4 animate-pulse" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                           <span className="sr-only">Buscar</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {/* <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : <LogOutIcon className="mr-2 h-4 w-4" /> }
                Registrar Saída
              </Button> */}
            </form>
          </Form>

          {foundEntry && (
            <Alert variant="default" className="mt-6 bg-green-50 border-green-300">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700 font-semibold">Saída Confirmada!</AlertTitle>
              <AlertDescription className="text-green-600">
                <p><strong>Veículo:</strong> {foundEntry.plate1}</p>
                <p><strong>Motorista:</strong> {foundEntry.driverName}</p>
                <p><strong>Transportadora:</strong> {foundEntry.transportCompanyName}</p>
                <p><strong>Horário de Saída:</strong> {foundEntry.exitTimestamp ? new Date(foundEntry.exitTimestamp).toLocaleString('pt-BR') : 'N/A'}</p>
              </AlertDescription>
            </Alert>
          )}

          {entryNotFound && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Código Não Encontrado</AlertTitle>
              <AlertDescription>
                O código de barras informado não corresponde a nenhum veículo com entrada registrada ou o veículo já teve sua saída registrada. Por favor, verifique o código e tente novamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
                Ao registrar a saída, o sistema automaticamente dará baixa no veículo.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// Mocking entriesStore for demonstration. In a real app, this data would come from Firebase/API.
// This is typically done in a context or fetched, not hardcoded like this.
// For the demo, let's add a sample entry that could be exited.
if (process.env.NODE_ENV === 'development' && entriesStore.length === 0) {
    const sampleBarcode = new Date().toISOString().slice(0,10).replace(/-/g,'') + "100000"; // YYYYMMDD + HHMMSS
    entriesStore.push({
        id: sampleBarcode, // Example: 20240115100000
        driverName: 'Motorista Teste Saida',
        transportCompanyName: 'TransLog Saida',
        plate1: 'SAI-1234',
        internalDestinationName: 'Patio Saida',
        movementType: 'Carga',
        entryTimestamp: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
        status: 'entrada_liberada',
        registeredBy: 'admin',
    });
}
