
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Search, XCircle, Clock } from 'lucide-react';
import type { VehicleEntry } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';


const exitSchema = z.object({
  barcode: z.string().min(1, { message: 'Código de barras é obrigatório.' }),
});

type ExitFormValues = z.infer<typeof exitSchema>;
type ExitStatus = 'success' | 'not_found' | 'already_exited' | 'not_liberated' | 'idle';

export default function RegistroSaidaPage() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedEntry, setLastProcessedEntry] = useState<VehicleEntry | null>(null);
  const [exitStatus, setExitStatus] = useState<ExitStatus>('idle');
  const barcodeRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ExitFormValues>({
    resolver: zodResolver(exitSchema),
    defaultValues: {
      barcode: '',
    },
  });

  const { watch, handleSubmit } = form;
  const barcodeValue = watch('barcode');

  useEffect(() => {
    // Auto-focus on mount
    barcodeRef.current?.focus();
    
    // Auto-submit on 14 chars
    if (barcodeValue && barcodeValue.length === 14 && !isProcessing) {
      handleSubmit(onSubmit)();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeValue]);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exitStatus !== 'idle') {
      timer = setTimeout(() => {
        setExitStatus('idle');
        setLastProcessedEntry(null);
      }, 5000); // 5 seconds
    }
    return () => clearTimeout(timer); // Cleanup timeout
  }, [exitStatus]);


  const processExit = async (barcodeToFind: string): Promise<{ status: ExitStatus; entry?: VehicleEntry | null; message: string }> => {
    if (!db) {
        return { status: 'not_found', message: 'O banco de dados não está configurado.' };
    }

    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('barcode', '==', barcodeToFind));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { status: 'not_found', message: 'Código de barras não encontrado no sistema.' };
    }

    const entryDoc = querySnapshot.docs[0];
    const entry = { id: entryDoc.id, ...entryDoc.data() } as VehicleEntry;

    if (entry.status === 'saiu') {
        return { status: 'already_exited', entry, message: `O veículo de placa ${entry.plate1} já registrou saída.` };
    }

    if (entry.status === 'aguardando_patio') {
        return { status: 'not_liberated', entry, message: `A entrada do veículo ${entry.plate1} ainda não foi liberada.` };
    }

    if (entry.status === 'entrada_liberada') {
        try {
            const exitTimestamp = Timestamp.fromDate(new Date());
            await updateDoc(doc(db, 'vehicleEntries', entry.id), {
                status: 'saiu',
                exitTimestamp: exitTimestamp,
            });
            const updatedEntry = { ...entry, status: 'saiu' as const, exitTimestamp };
            return { status: 'success', entry: updatedEntry, message: 'Saída registrada com sucesso!' };
        } catch (error) {
            console.error("Error updating document:", error);
            return { status: 'not_found', message: 'Ocorreu um erro ao atualizar o status do veículo.' };
        }
    }

    return { status: 'not_found', message: 'Status do veículo desconhecido ou inválido.' };
  };
  
  const formatDate = (timestamp: VehicleEntry['arrivalTimestamp']) => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onSubmit = async (data: ExitFormValues) => {
    setIsProcessing(true);
    setExitStatus('idle');
    setLastProcessedEntry(null);
    
    try {
        const result = await processExit(data.barcode);

        setExitStatus(result.status);
        if (result.entry) {
            setLastProcessedEntry(result.entry);
        }
    } catch (error) {
        console.error("Error processing exit:", error);
        setExitStatus('not_found');
    } finally {
        form.reset();
        setIsProcessing(false);
        setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  };

  if (!db) {
    return (
      <div className="container mx-auto pt-4 pb-8">
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

  const renderStatusAlert = () => {
    if (exitStatus === 'idle') return null;

    const entryInfo = lastProcessedEntry ? (
        <>
            <p><strong>Veículo:</strong> {lastProcessedEntry.plate1}</p>
            <p><strong>Motorista:</strong> {lastProcessedEntry.driverName}</p>
            <p><strong>Horário de Chegada:</strong> {formatDate(lastProcessedEntry.arrivalTimestamp)}</p>
            {lastProcessedEntry.exitTimestamp && <p><strong>Horário de Saída:</strong> {formatDate(lastProcessedEntry.exitTimestamp)}</p>}
        </>
    ) : null;

    switch (exitStatus) {
        case 'success':
            return (
                <Alert variant="default" className="bg-green-50 border-green-300">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-700 font-semibold">Saída Confirmada!</AlertTitle>
                    <AlertDescription className="text-green-600">{entryInfo}</AlertDescription>
                </Alert>
            );
        case 'already_exited':
            return (
                <Alert variant="destructive">
                    <XCircle className="h-5 w-5" />
                    <AlertTitle>Veículo Já Saiu</AlertTitle>
                    <AlertDescription>{entryInfo}</AlertDescription>
                </Alert>
            );
        case 'not_liberated':
             return (
                <Alert variant="destructive" className="bg-amber-50 border-amber-300">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-700 font-semibold">Veículo Não Liberado</AlertTitle>
                    <AlertDescription className="text-amber-600">
                        O veículo está no pátio e aguarda liberação para entrar na fábrica.
                        {entryInfo}
                    </AlertDescription>
                </Alert>
            );
        case 'not_found':
            return (
                <Alert variant="destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle>Código Não Encontrado</AlertTitle>
                    <AlertDescription>
                        O código de barras informado não foi localizado. Por favor, verifique o código e tente novamente.
                    </AlertDescription>
                </Alert>
            );
        default:
            return null;
    }
  };


  return (
    <div className="container mx-auto pb-8 transition-all duration-300">
      <div className="mb-6 flex justify-between items-center -mt-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">
            Registro de Saída de Veículo
          </h1>
          <p className="text-muted-foreground">Insira o código de barras para registrar a saída.</p>
        </div>
      </div>
      <Card className="shadow-xl w-full">
        <CardHeader className="pb-2">
            <div className="flex items-center">
              <CardTitle className="text-xl font-semibold text-primary">Registro de Saída</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          autoComplete="off"
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
                    <FormDescription className="text-center text-base pt-4">
                      O sistema buscará automaticamente após a leitura do código de 14 dígitos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <div className="mt-4">
            {renderStatusAlert()}
          </div>
        </CardContent>
      </Card>
      
      {user?.role === 'exit_agent' && (
        <div className="mt-6">
          <Alert variant="destructive">
              <AlertTriangle className="h-6 w-6" />
              <AlertTitle className="text-lg">Atenção: Caso o código de barras não seja lido automaticamente.</AlertTitle>
              <AlertDescription className="text-base">
                  Por favor, verifique se o código está legível e tente novamente. Caso o problema persista, registre a saída manualmente digitando o número abaixo do código de barra ou informe à equipe vigilância.
              </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
