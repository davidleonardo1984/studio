
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Search } from 'lucide-react';
import type { VehicleEntry } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';


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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (foundEntry) {
      timer = setTimeout(() => {
        setFoundEntry(null);
      }, 5000); // 5 seconds
    }
    if (entryNotFound) {
        timer = setTimeout(() => {
            setEntryNotFound(false);
        }, 5000);
    }
    return () => clearTimeout(timer); // Cleanup timeout on component unmount or if foundEntry/entryNotFound changes
  }, [foundEntry, entryNotFound]);

  const processExit = async (barcode: string): Promise<VehicleEntry | null> => {
    const entryRef = doc(db, 'vehicleEntries', barcode);
    try {
        const entrySnap = await getDoc(entryRef);

        if (entrySnap.exists() && entrySnap.data().status === 'entrada_liberada') {
            const updatedData = {
                status: 'saiu',
                exitTimestamp: new Date().toISOString(),
            };
            await updateDoc(entryRef, updatedData);
            return { ...entrySnap.data(), ...updatedData, id: entrySnap.id } as VehicleEntry;
        }
    } catch (error) {
        console.error("Error processing exit:", error);
    }
    return null;
  };


  const onSubmit = async (data: ExitFormValues) => {
    setIsProcessing(true);
    setFoundEntry(null);
    setEntryNotFound(false);
    
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
      form.reset();
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
                          onChange={(e) => {
                            field.onChange(e); // Update form state
                            const newValue = e.target.value;
                            if (newValue.length === 14) {
                              if (!isProcessing) {
                                // handleSubmit will validate using Zod schema before calling onSubmit
                                form.handleSubmit(onSubmit)(); 
                              }
                            }
                          }}
                          className="rounded-r-none"
                          maxLength={14}
                          noAutoUppercase={true}
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
            </form>
          </Form>

          {foundEntry && (
            <Alert variant="default" className="mt-6 bg-green-50 border-green-300">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700 font-semibold">Saída Confirmada!</AlertTitle>
              <AlertDescription className="text-green-600">
                <p><strong>Veículo:</strong> {foundEntry.plate1}</p>
                <p><strong>Motorista:</strong> {foundEntry.driverName}</p>
                <p><strong>Transportadora / Empresa:</strong> {foundEntry.transportCompanyName}</p>
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
