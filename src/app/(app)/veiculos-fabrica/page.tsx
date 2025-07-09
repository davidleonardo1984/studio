"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry } from '@/lib/types';
import { Search, Loader2, AlertTriangle, Printer, Edit2, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DocumentPreviewModal } from '@/components/layout/PdfPreviewModal';
import { useIsClient } from '@/hooks/use-is-client';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { generateVehicleEntryImage } from '@/lib/pdf-generator';

export default function VeiculosFabricaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isClient = useIsClient();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<VehicleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    };
    setIsLoading(true);
    const entriesCollection = collection(db, 'vehicleEntries');
    const q = query(entriesCollection, where('status', '==', 'entrada_liberada'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const newVehicles: VehicleEntry[] = [];
        querySnapshot.forEach((doc) => {
            newVehicles.push({ id: doc.id, ...doc.data() } as VehicleEntry);
        });
        newVehicles.sort((a, b) => {
          const dateA = (a.arrivalTimestamp as any)?.toDate ? (a.arrivalTimestamp as any).toDate() : new Date(a.arrivalTimestamp as string);
          const dateB = (b.arrivalTimestamp as any)?.toDate ? (b.arrivalTimestamp as any).toDate() : new Date(b.arrivalTimestamp as string);
          return dateB.getTime() - dateA.getTime();
        });
        setVehicles(newVehicles);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching vehicles:", error);
        toast({ variant: "destructive", title: "Erro em Tempo Real", description: "Não foi possível atualizar a lista de veículos na fábrica." });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) {
      return vehicles;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return vehicles.filter(v =>
      v.barcode.toLowerCase().includes(lowercasedTerm) ||
      v.plate1.toLowerCase().includes(lowercasedTerm) ||
      v.driverName.toLowerCase().includes(lowercasedTerm) ||
      v.transportCompanyName.toLowerCase().includes(lowercasedTerm)
    );
  }, [vehicles, searchTerm]);
  
  const handleEdit = (entryId: string) => {
    router.push(`/registro-entrada?id=${entryId}`);
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

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewImageUrl(null);
  };

  const formatDate = (timestamp: VehicleEntry['arrivalTimestamp']) => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
    return date.toLocaleString('pt-BR');
  };

  if (!isClient) {
    return (
      <div className="container mx-auto pb-8">
        <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="container mx-auto pb-8">
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
                       Por favor, verifique se as credenciais do seu projeto Firebase estão configuradas corretamente nas variáveis de ambiente.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto pb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-primary font-headline">Veículos Atualmente na Fábrica</h1>
          <p className="text-muted-foreground">Lista de veículos que registraram entrada e ainda não saíram.</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex w-full items-center justify-between">
              <CardTitle className="flex items-center text-xl font-semibold text-primary whitespace-nowrap">
                <Truck className="mr-2 h-5 w-5" />
                Lista de Veículos ({filteredVehicles.length})
              </CardTitle>
              <div className="flex-grow flex justify-end">
                <Input
                    id="searchVehicles"
                    type="text"
                    placeholder="Buscar por ID, placa, motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                    prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-4 text-muted-foreground">Carregando veículos...</p>
               </div>
            ) : filteredVehicles.length > 0 ? (
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
                  {filteredVehicles.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs py-1">{entry.barcode}</TableCell>
                      <TableCell className="py-1">{entry.plate1}</TableCell>
                      <TableCell className="py-1">{entry.driverName}</TableCell>
                      <TableCell className="py-1">{entry.transportCompanyName}</TableCell>
                      <TableCell className="py-1">{formatDate(entry.arrivalTimestamp)}</TableCell>
                      <TableCell className="py-1">{formatDate(entry.liberationTimestamp)}</TableCell>
                       <TableCell className="py-1">
                          <span className="px-2 py-1 text-xs rounded-full whitespace-nowrap bg-green-100 text-green-700">
                              Na fábrica
                          </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2 py-1">
                         {user?.role !== 'gate_agent' && user?.role !== 'exit_agent' && (
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(entry.id)} title="Editar Registro">
                                <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
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
               <div className="text-center py-12">
                  <Truck className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-xl font-medium text-muted-foreground">
                      {searchTerm ? "Nenhum veículo encontrado com os termos da busca." : "Nenhum veículo dentro da fábrica no momento."}
                  </p>
               </div>
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
