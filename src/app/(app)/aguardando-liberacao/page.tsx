
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const generateVehicleEntryPdf = async (entry: VehicleEntry): Promise<{ success: boolean; action: 'opened' | 'downloaded_fallback' | 'error'; error?: any }> => {
  const pdfContentHtml = `
    <div id="pdf-content-${entry.id}" style="font-family: Arial, sans-serif; padding: 20px; width: 580px; border: 1px solid #ccc; background-color: #fff;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 20px;">COMPROVANTE DE ENTRADA</h2>
      <div style="text-align: center; margin-bottom: 25px; padding: 15px; border: 2px dashed #333; background-color: #f9f9f9;">
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 3px; margin: 0; color: #000;">${entry.id}</p>
        <p style="font-size: 10px; margin: 5px 0 0 0; color: #555;">(CÓDIGO DE BARRAS)</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tbody>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Motorista:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.driverName}</td></tr>
          ${entry.assistant1Name ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Ajudante 1:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.assistant1Name}</td></tr>` : ''}
          ${entry.assistant2Name ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Ajudante 2:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.assistant2Name}</td></tr>` : ''}
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Transportadora:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.transportCompanyName}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Placa 1:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.plate1}</td></tr>
          ${entry.plate2 ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Placa 2:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.plate2}</td></tr>` : ''}
          ${entry.plate3 ? `<tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Placa 3:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.plate3}</td></tr>` : ''}
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Destino Interno:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.internalDestinationName}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Tipo Mov.:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.movementType}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Observação:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${entry.observation || '-'}</td></tr>
          <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Data/Hora Entrada:</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${new Date(entry.entryTimestamp).toLocaleString('pt-BR')}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Registrado Por:</td><td style="padding: 6px;">${entry.registeredBy}</td></tr>
        </tbody>
      </table>
      <p style="text-align: center; font-size: 10px; margin-top: 25px; color: #777;">Portaria Única RES - Comprovante de Entrada</p>
    </div>
  `;

  const hiddenDiv = document.createElement('div');
  hiddenDiv.style.position = 'absolute';
  hiddenDiv.style.left = '-9999px';
  hiddenDiv.innerHTML = pdfContentHtml;
  document.body.appendChild(hiddenDiv);

  const contentElement = document.getElementById(`pdf-content-${entry.id}`);
  if (!contentElement) {
    console.error('PDF content element not found');
    document.body.removeChild(hiddenDiv);
    return { success: false, action: 'error', error: 'PDF content element not found' };
  }

  try {
    const canvas = await html2canvas(contentElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 15; // Margin top

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const newWindow = window.open(blobUrl, '_blank');

    if (newWindow) {
      newWindow.onload = () => {
        URL.revokeObjectURL(blobUrl); // Clean up
      };
      return { success: true, action: 'opened' };
    } else {
      console.warn("Could not open PDF in a new tab due to pop-up blocker or browser settings. Attempting to download instead.");
      pdf.save(`comprovante-entrada-${entry.id}.pdf`);
      return { success: true, action: 'downloaded_fallback' };
    }
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return { success: false, action: 'error', error };
  } finally {
    document.body.removeChild(hiddenDiv);
  }
};


export default function AguardandoLiberacaoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [waitingVehicles, setWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const syncWaitingVehicles = () => {
      const currentWaitingStr = JSON.stringify(waitingVehicles.map(v => v.id).sort());
      const globalWaitingStr = JSON.stringify(waitingYardStore.map(v => v.id).sort());

      if (currentWaitingStr !== globalWaitingStr || waitingVehicles.length !== waitingYardStore.length) {
        setWaitingVehicles([...waitingYardStore].sort((a,b) => new Date(a.entryTimestamp).getTime() - new Date(b.entryTimestamp).getTime()));
      }
    };
    syncWaitingVehicles(); 
    const intervalId = setInterval(syncWaitingVehicles, 2000); 
    return () => clearInterval(intervalId); 
  }, [waitingVehicles]); 


  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return waitingVehicles;
    return waitingVehicles.filter(v =>
      v.plate1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transportCompanyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [waitingVehicles, searchTerm]);

  const handleApproveEntry = async (vehicleId: string) => {
    const vehicleToApproveIndex = waitingYardStore.findIndex(v => v.id === vehicleId);

    if (vehicleToApproveIndex > -1) {
        const vehicleToApprove = waitingYardStore[vehicleToApproveIndex];
        const updatedVehicle = { ...vehicleToApprove, status: 'entrada_liberada' as 'entrada_liberada' };
        
        waitingYardStore.splice(vehicleToApproveIndex, 1);
        entriesStore.push(updatedVehicle);

        setWaitingVehicles([...waitingYardStore].sort((a,b) => new Date(a.entryTimestamp).getTime() - new Date(b.entryTimestamp).getTime()));

        const pdfResult = await generateVehicleEntryPdf(updatedVehicle);

        if (pdfResult.success) {
            toast({
                title: pdfResult.action === 'opened' ? 'Entrada Liberada e PDF Aberto!' : 'Entrada Liberada e PDF Baixado!',
                description: `Veículo ${updatedVehicle.plate1} liberado para entrada. Código: ${updatedVehicle.id}`,
                className: 'bg-green-600 text-white',
                icon: <CheckCircle className="h-6 w-6 text-white" />
            });
            if (pdfResult.action === 'downloaded_fallback') {
                 toast({
                    variant: 'default', // Using 'default' so it's not red
                    title: 'Aviso de Pop-up',
                    description: 'O PDF não pôde ser aberto em nova aba e foi baixado. Verifique o bloqueador de pop-ups.',
                });
            }
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao Gerar PDF',
                description: `A entrada foi liberada, mas houve um erro ao gerar o PDF. Código: ${updatedVehicle.id}`,
            });
        }
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
