
"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';


const exitSchema = z.object({
  barcode: z.string().min(1, { message: 'Código de barras é obrigatório.' }),
});

type ExitFormValues = z.infer<typeof exitSchema>;

export default function RegistroSaidaPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundEntry, setFoundEntry] = useState<VehicleEntry | null>(null);
  const [entryNotFound, setEntryNotFound] = useState(false);
  const barcodeRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ExitFormValues>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      barcode: '',
    },
  });

  const { watch, handleSubmit } = form;
  const barcodeValue = watch('barcode');

  // Auto-focus on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Auto-submit on 14 chars
  useEffect(() => {
    if (barcodeValue && barcodeValue.length === 14 && !isProcessing) {
      handleSubmit(onSubmit)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeValue]);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (foundEntry || entryNotFound) {
      timer = setTimeout(() => {
        setFoundEntry(null);
        setEntryNotFound(false);
      }, 5000); // 5 seconds
    }
    return () => clearTimeout(timer); // Cleanup timeout
  }, [foundEntry, entryNotFound]);

  const processExit = async (barcodeToFind: string): Promise<VehicleEntry | null> => {
    if (!db) return null;
    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('barcode', '==', barcodeToFind));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const entryDoc = querySnapshot.docs[0];
      const entry = { id: entryDoc.id, ...entryDoc.data() } as VehicleEntry;
      if (entry.status === 'entrada_liberada') {
        const exitTimestamp = new Date().toISOString();
        await updateDoc(doc(db, 'vehicleEntries', entry.id), {
          status: 'saiu',
          exitTimestamp: exitTimestamp,
        });
        return { ...entry, status: 'saiu', exitTimestamp };
      }
    }
    return null;
  };

  const onSubmit = async (data: ExitFormValues) => {
    setIsProcessing(true);
    setFoundEntry(null);
    setEntryNotFound(false);
    
    try {
        const updatedEntry = await processExit(data.barcode);

        if (updatedEntry) {
            setFoundEntry(updatedEntry);
            toast({
                title: 'Saída Registrada!',
                description: `Saída do veículo ${updatedEntry.plate1} (Código: ${updatedEntry.barcode}) registrada com sucesso.`,
                className: 'bg-green-600 text-white',
                icon: <CheckCircle className="h-6 w-6 text-white" />
            });
        } else {
            setEntryNotFound(true);
            toast({
                variant: 'destructive',
                title: 'Erro ao Registrar Saída',
                description: 'Código de barras não encontrado ou veículo já saiu/não liberado.',
            });
        }
    } catch (error) {
        console.error("Error processing exit:", error);
        setEntryNotFound(true);
        toast({
            variant: 'destructive',
            title: 'Erro de Sistema',
            description: 'Ocorreu um erro ao comunicar com o banco de dados.',
        });
    } finally {
        form.reset();
        setIsProcessing(false);
        setTimeout(() => barcodeRef.current?.focus(), 100);
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
    <div className="container mx-auto py-8">
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary font-headline">Registro de Saída de Veículo</CardTitle>
          <CardDescription>Insira o código de barras para registrar a saída.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input
                          {...field}
                          ref={(e) => {
                            field.ref(e);
                            barcodeRef.current = e;
                          }}
                          placeholder="Leia o código de barras aqui"
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!isProcessing) {
                                      form.handleSubmit(onSubmit)();
                                  }
                              }
                          }}
                          className="rounded-r-none"
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
                O código de barras informado não corresponde a nenhum veículo com entrada liberada na fábrica. Por favor, verifique o código e tente novamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
                O sistema buscará automaticamente após a leitura do código de 14 dígitos.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
