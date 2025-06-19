
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { VehicleEntry } from '@/lib/types';
import { CheckCircle, Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { entriesStore, waitingYardStore } from '@/lib/vehicleEntryStores';


export default function AguardandoLiberacaoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [waitingVehicles, setWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const syncWaitingVehicles = () => {
      // Create a string representation of current and global waiting vehicle IDs to detect structural changes or actual content changes.
      const currentWaitingStr = JSON.stringify(waitingVehicles.map(v => v.id).sort());
      const globalWaitingStr = JSON.stringify(waitingYardStore.map(v => v.id).sort());

      if (currentWaitingStr !== globalWaitingStr || waitingVehicles.length !== waitingYardStore.length) {
        // Deep clone and sort to ensure consistent order for comparison and rendering
        setWaitingVehicles([...waitingYardStore].sort((a,b) => new Date(a.entryTimestamp).getTime() - new Date(b.entryTimestamp).getTime()));
      }
    };
    syncWaitingVehicles(); // Initial sync
    const intervalId = setInterval(syncWaitingVehicles, 2000); // Periodically check for updates from global store
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [waitingVehicles]); // Re-run effect if local waitingVehicles change (e.g., after an approval)


  const filteredVehicles = useMemo(() => {
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
        
        // Remove from waitingYardStore and add to entriesStore
        waitingYardStore.splice(vehicleToApproveIndex, 1);
        entriesStore.push(updatedVehicle);

        // Force a re-sync of local state from the now-updated global store
        setWaitingVehicles([...waitingYardStore].sort((a,b) => new Date(a.entryTimestamp).getTime() - new Date(b.entryTimestamp).getTime()));


        toast({
            title: 'Entrada Liberada!',
            description: `Veículo ${updatedVehicle.plate1} liberado para entrada. Código: ${updatedVehicle.id}`,
            className: 'bg-green-600 text-white',
            icon: <CheckCircle className="h-6 w-6 text-white" />
        });
        // Here you would trigger printing the document
        console.log("Printing document for approved entry:", updatedVehicle);
    }
  };
  

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold text-primary font-headline flex items-center">
                <Clock className="mr-3 h-8 w-8 text-accent" />
                Veículos Aguardando Liberação
            </h1>
            <p className="text-muted-foreground">Lista de veículos no pátio que necessitam de aprovação para entrada.</p>
        </div>
         <div className="mt-4 sm:mt-0 w-full sm:w-auto max-w-xs">
            <Input 
                type="text"
                placeholder="Buscar por placa, motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
            />
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Lista de Espera ({filteredVehicles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVehicles.length > 0 ? (
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
                {filteredVehicles.map((vehicle) => (
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
                        <CheckCircle className="mr-2 h-4 w-4" /> Liberar Entrada
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
                    {searchTerm ? "Nenhum veículo encontrado com os termos da busca." : "Nenhum veículo aguardando liberação no momento."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                    Quando um registro de entrada for marcado como "Aguardar no Pátio", ele aparecerá aqui.
                </p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
