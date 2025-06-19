
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { VehicleEntryFormData, VehicleEntry } from '@/lib/types';
import { Save, SendToBack, Clock, CheckCircle, Search, Printer, ClipboardCopy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { personsStore, transportCompaniesStore, internalDestinationsStore } from '@/lib/store';
import { entriesStore, waitingYardStore } from '@/lib/vehicleEntryStores'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PdfPreviewModal } from '@/components/layout/PdfPreviewModal';

const mockMovementTypes = ["CARGA", "DESCARGA", "PRESTAÇÃO DE SERVIÇO", "TRANSFERENCIA INTERNA", "DEVOLUÇÃO", "VISITA", "OUTROS"];

const entrySchema = z.object({
  driverName: z.string().min(1, { message: 'Nome do motorista é obrigatório.' })
    .refine(value => personsStore.some(p => p.name.toUpperCase() === value.toUpperCase()), {
      message: "Motorista não encontrado. Selecione um motorista da lista ou cadastre-o em Cadastros Gerais."
    }),
  assistant1Name: z.string().optional().transform(val => val === "" ? undefined : val) 
    .refine(value => !value || personsStore.some(p => p.name.toUpperCase() === value.toUpperCase()), {
      message: "Ajudante 1 não encontrado. Selecione um ajudante da lista ou cadastre-o em Cadastros Gerais."
    }),
  assistant2Name: z.string().optional().transform(val => val === "" ? undefined : val) 
    .refine(value => !value || personsStore.some(p => p.name.toUpperCase() === value.toUpperCase()), {
      message: "Ajudante 2 não encontrado. Selecione um ajudante da lista ou cadastre-o em Cadastros Gerais."
    }),
  transportCompanyName: z.string().min(1, { message: 'Transportadora é obrigatória.' })
    .refine(value => transportCompaniesStore.some(tc => tc.name.toUpperCase() === value.toUpperCase()), {
      message: "Transportadora não encontrada. Selecione uma transportadora da lista ou cadastre-a em Cadastros Gerais."
    }),
  plate1: z.string().min(7, { message: 'Placa 1 é obrigatória (mín. 7 caracteres).' }).max(8),
  plate2: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 2 inválida (mín. 7 caracteres)."}),
  plate3: z.string().optional().refine(val => !val || (val.length >= 7 && val.length <=8) , {message: "Placa 3 inválida (mín. 7 caracteres)."}),
  internalDestinationName: z.string().min(1, { message: 'Destino interno é obrigatório.' })
    .refine(value => internalDestinationsStore.some(id => id.name.toUpperCase() === value.toUpperCase()), {
      message: "Destino interno não encontrado. Selecione um destino da lista ou cadastre-o em Cadastros Gerais."
    }),
  movementType: z.string().min(1, { message: 'Tipo de movimentação é obrigatório.' }),
  observation: z.string().max(500, { message: 'Observação muito longa (máx. 500 caracteres).' }).optional(),
});


const generateVehicleEntryPdf = async (entry: VehicleEntry): Promise<{ success: boolean; blobUrl?: string; error?: any }> => {
  const pdfContentHtml = `
    <div id="pdf-content-${entry.id}" style="font-family: Arial, sans-serif; padding: 20px; width: 580px; border: 1px solid #ccc; background-color: #fff;">
      <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 20px;">COMPROVANTE DE ENTRADA</h2>
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 150px; margin-bottom: 15px; border: 2px dashed #333; background-color: #f9f9f9; padding: 0 15px;">
        <p style="font-family: 'Libre Barcode 39 Text', 'Code 39', 'Courier New', monospace; font-size: 48px; text-align: center; margin: 0; color: #000; line-height: 0.9;">*${entry.id}*</p>
        <p style="font-size: 9px; text-align: center; margin: 2px 0 0 0; color: #555;">(CÓDIGO DE BARRAS)</p>
      </div>

      <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 11px; line-height: 1.4;">
        <div style="display: inline-block; width: 48%; margin-right: 2%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Chegada:</p>
          <p style="margin: 0;">${new Date(entry.arrivalTimestamp).toLocaleString('pt-BR')}</p>
        </div>
        ${entry.liberationTimestamp ? `
        <div style="display: inline-block; width: 48%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Liberação:</p>
          <p style="margin: 0;">${new Date(entry.liberationTimestamp).toLocaleString('pt-BR')}</p>
        </div>
        ` : `
        <div style="display: inline-block; width: 48%; vertical-align: top;">
          <p style="margin: 0 0 3px 0; font-weight: bold;">Data/Hora Liberação:</p>
          <p style="margin: 0;">-</p>
        </div>
        `}
      </div>

      <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; line-height: 1.5;">
          <div style="width: 55%;">
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Motorista:</span> ${entry.driverName}</p>
            ${entry.assistant1Name ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Ajudante 1:</span> ${entry.assistant1Name}</p>` : ''}
            ${entry.assistant2Name ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Ajudante 2:</span> ${entry.assistant2Name}</p>` : ''}
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Placa 1:</span> ${entry.plate1}</p>
            ${entry.plate2 ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Placa 2:</span> ${entry.plate2}</p>` : ''}
            ${entry.plate3 ? `<p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 90px; display: inline-block;">Placa 3:</span> ${entry.plate3}</p>` : ''}
          </div>
          <div style="width: 40%; text-align: left;">
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Transportadora:</span>${entry.transportCompanyName}</p>
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Destino Interno:</span>${entry.internalDestinationName}</p>
            <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Tipo Mov.:</span>${entry.movementType}</p>
          </div>
        </div>
        
        <div style="font-size: 11px; line-height: 1.5; margin-top: 5px;">
          <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; display: block;">Observação:</span> ${entry.observation || '-'}</p>
        </div>
      </div>
      
      <hr style="margin-top: 15px; margin-bottom: 10px; border: 0; border-top: 1px solid #eee;" />
      
      <div style="font-size: 11px; line-height: 1.5;">
         <p style="margin: 0 0 5px 0;"><span style="font-weight: bold; min-width: 50px; display: inline-block;">Data:</span> _________________________________________</p>
      </div>

      <div style="margin-top: 20px; font-size: 11px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px 10px; border-radius: 4px;">
        <div style="display: inline-block; width: 45%; margin-right: 5%;">
          <p style="text-align: center; margin: 0 0 40px 0;">Assinatura Responsável</p>
          <hr style="border: 0; border-top: 1px solid #333; margin-bottom: 0;" />
        </div>
        <div style="display: inline-block; width: 45%;">
          <p style="text-align: center; margin: 0 0 40px 0;">Registro</p>
          <hr style="border: 0; border-top: 1px solid #333; margin-bottom: 0;" />
        </div>
      </div>

      <p style="text-align: center; font-size: 9px; margin-top: 25px; color: #777;">Portaria Única RES - Comprovante de Entrada</p>
    </div>
  `;

  const hiddenDiv = document.createElement('div');
  hiddenDiv.style.position = 'absolute';
  hiddenDiv.style.left = '-9999px';
  hiddenDiv.innerHTML = pdfContentHtml;
  document.body.appendChild(hiddenDiv);

  try {
    const contentElement = document.getElementById(`pdf-content-${entry.id}`);
    if (!contentElement) {
      console.error('PDF content element not found');
      document.body.removeChild(hiddenDiv);
      return { success: false, error: 'PDF content element not found' };
    }
  
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const canvas = await html2canvas(contentElement, { scale: 2, useCORS: true, allowTaint: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidthCanvas = canvas.width;
    const imgHeightCanvas = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidthCanvas, pdfHeight / imgHeightCanvas);
    const imgX = (pdfWidth - imgWidthCanvas * ratio) / 2;
    const imgY = 15;
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidthCanvas * ratio, imgHeightCanvas * ratio);

    const blobUrl = pdf.output('bloburl');
    return { success: true, blobUrl: blobUrl as string };

  } catch (err) {
    console.error("Error generating PDF:", err);
    return { success: false, error: err };
  } finally {
    if (document.body.contains(hiddenDiv)) {
      document.body.removeChild(hiddenDiv);
    }
  }
};


export default function RegistroEntradaPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssistants, setShowAssistants] = useState(false);

  const [currentWaitingVehicles, setCurrentWaitingVehicles] = useState<VehicleEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

   useEffect(() => {
    const syncWaitingVehicles = () => {
      const currentWaitingStr = JSON.stringify(currentWaitingVehicles.map(v => v.id).sort());
      const globalWaitingStr = JSON.stringify(waitingYardStore.map(v => v.id).sort());

      if (currentWaitingStr !== globalWaitingStr || currentWaitingVehicles.length !== waitingYardStore.length) {
        setCurrentWaitingVehicles([...waitingYardStore].sort((a,b) => new Date(a.arrivalTimestamp).getTime() - new Date(b.arrivalTimestamp).getTime()));
      }
    };
    syncWaitingVehicles(); 
    const intervalId = setInterval(syncWaitingVehicles, 2000); 
    return () => clearInterval(intervalId); 
  }, [currentWaitingVehicles]); 


  const form = useForm<VehicleEntryFormData>({
    resolver: zodResolver(entrySchema),
    mode: "onBlur",
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
    const currentTime = new Date().toISOString();

    const newEntry: VehicleEntry = {
      ...data,
      id: generateBarcode(),
      arrivalTimestamp: currentTime,
      liberationTimestamp: status === 'entrada_liberada' ? currentTime : undefined,
      status: status,
      registeredBy: user.login,
    };

    await new Promise(resolve => setTimeout(resolve, 500)); 

    if (status === 'aguardando_patio') {
      waitingYardStore.push(newEntry);
      toast({
        title: 'Registro Enviado para o Pátio',
        description: `Veículo ${newEntry.plate1} aguardando liberação. Código: ${newEntry.id}`,
        className: 'bg-yellow-500 text-white',
        icon: <Clock className="h-6 w-6 text-white" />
      });
    } else { 
      entriesStore.push(newEntry);
       toast({
          title: `Entrada de ${newEntry.plate1} Registrada!`,
          description: `Aguarde, gerando documento... Código: ${newEntry.id}.`,
          className: 'bg-green-600 text-white',
          icon: <CheckCircle className="h-6 w-6 text-white" />
      });

      const pdfResult = await generateVehicleEntryPdf(newEntry);
      
      if (pdfResult.success && pdfResult.blobUrl) {
          setPdfPreviewUrl(pdfResult.blobUrl);
          setIsPdfPreviewOpen(true);
          toast({ 
              title: 'Documento Pronto para Visualização',
              description: `Documento para ${newEntry.plate1} gerado. Visualize e imprima.`,
          });
      } else {
          toast({
              variant: 'destructive',
              title: 'Erro no Documento PDF',
              description: `Falha ao gerar o PDF para ${newEntry.plate1}. Detalhe: ${pdfResult.error || 'N/A'}`,
          });
      }
    }

    form.reset({
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
    });
    setShowAssistants(false);
    setIsSubmitting(false);
  };

  const filteredWaitingVehicles = useMemo(() => {
    if (!searchTerm) return currentWaitingVehicles;
    return currentWaitingVehicles.filter(v =>
      v.plate1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transportCompanyName.toLowerCase().includes(searchTerm.toLowerCase())
    ); 
  }, [currentWaitingVehicles, searchTerm]);

  const handleApproveEntryAndPrint = async (vehicleId: string) => {
    const vehicleToApproveIndex = waitingYardStore.findIndex(v => v.id === vehicleId);
    if (vehicleToApproveIndex > -1) {
      const vehicleToApprove = waitingYardStore[vehicleToApproveIndex];
      const updatedVehicle: VehicleEntry = { 
        ...vehicleToApprove, 
        status: 'entrada_liberada' as 'entrada_liberada',
        liberationTimestamp: new Date().toISOString() 
      };
      
      waitingYardStore.splice(vehicleToApproveIndex, 1); 
      entriesStore.push(updatedVehicle); 
      setCurrentWaitingVehicles([...waitingYardStore].sort((a,b) => new Date(a.arrivalTimestamp).getTime() - new Date(b.arrivalTimestamp).getTime()));

      toast({
          title: `Veículo ${updatedVehicle.plate1} Liberado!`,
          description: `Aguarde, gerando documento... Código: ${updatedVehicle.id}.`,
          className: 'bg-green-600 text-white',
          icon: <CheckCircle className="h-6 w-6 text-white" />
      });

      const pdfResult = await generateVehicleEntryPdf(updatedVehicle);
      
      if (pdfResult.success && pdfResult.blobUrl) {
          setPdfPreviewUrl(pdfResult.blobUrl);
          setIsPdfPreviewOpen(true);
           toast({
              title: 'Documento Pronto para Visualização',
              description: `Documento para ${updatedVehicle.plate1} gerado. Visualize e imprima.`,
          });
      } else {
           toast({
              variant: 'destructive',
              title: 'Erro no Documento PDF',
              description: `Falha ao gerar o PDF para ${updatedVehicle.plate1}. Detalhe: ${pdfResult.error || 'N/A'}`,
          });
      }
    }
  };

  const handleCopyWaitingData = async () => {
    if (filteredWaitingVehicles.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum dado', description: 'Não há veículos aguardando para copiar.' });
      return;
    }

    const dataToCopy = filteredWaitingVehicles.map((vehicle, index) => {
      return [
        `Ordem: ${index + 1}`,
        `Motorista: ${vehicle.driverName}`,
        `Transportadora: ${vehicle.transportCompanyName}`,
        `Placa 1: ${vehicle.plate1}`,
        `Observação: ${vehicle.observation || '-'}`,
        `Data/Hora Chegada: ${new Date(vehicle.arrivalTimestamp).toLocaleString('pt-BR')}`
      ].join('\n');
    }).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(dataToCopy);
      toast({ title: 'Dados Copiados!', description: 'Os dados dos veículos aguardando foram copiados.' });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({ variant: 'destructive', title: 'Erro ao Copiar', description: 'Não foi possível copiar os dados.' });
    }
  };

  const closePreviewModal = () => {
    setIsPdfPreviewOpen(false);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
  };

  return (
    <>
    <div className="container mx-auto py-8 space-y-8">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary font-headline">Registro de Nova Entrada</CardTitle>
          <CardDescription>Preencha os dados abaixo para registrar la entrada de um veículo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormItem>
                  <FormField
                    control={form.control}
                    name="driverName"
                    render={({ field }) => (
                      <>
                        <FormLabel>Nome do Motorista</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite ou selecione o motorista" 
                            {...field} 
                            list="driver-list" 
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value && !personsStore.some(p => p.name.toUpperCase() === value.toUpperCase())) {
                                form.setError('driverName', { type: 'manual', message: 'Motorista não cadastrado. Verifique ou cadastre em Cadastros Gerais.' });
                              } else if (value === "" && !form.formState.errors.driverName?.message?.includes("obrigatório")) { 
                                form.clearErrors('driverName');
                              } else if (value && personsStore.some(p => p.name.toUpperCase() === value.toUpperCase())) {
                                form.clearErrors('driverName');
                              }
                              field.onBlur(e); 
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </>
                    )}
                  />
                  <datalist id="driver-list">
                    {personsStore.map(person => (
                      <option key={person.id} value={person.name} />
                    ))}
                  </datalist>
                </FormItem>
                <FormItem>
                    <FormField
                    control={form.control}
                    name="transportCompanyName"
                    render={({ field }) => (
                        <>
                        <FormLabel>Transportadora</FormLabel>
                        <FormControl>
                            <Input 
                              placeholder="Digite ou selecione a transportadora" 
                              {...field} 
                              list="transport-company-list"
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value && !transportCompaniesStore.some(tc => tc.name.toUpperCase() === value.toUpperCase())) {
                                  form.setError('transportCompanyName', { type: 'manual', message: 'Transportadora não cadastrada. Verifique ou cadastre em Cadastros Gerais.' });
                                } else if (value === "" && !form.formState.errors.transportCompanyName?.message?.includes("obrigatória")) {
                                  form.clearErrors('transportCompanyName');
                                } else if (value && transportCompaniesStore.some(tc => tc.name.toUpperCase() === value.toUpperCase())){
                                   form.clearErrors('transportCompanyName');
                                }
                                field.onBlur(e); 
                              }}
                            />
                        </FormControl>
                        <FormMessage />
                        </>
                    )}
                    />
                    <datalist id="transport-company-list">
                    {transportCompaniesStore.map(company => (
                        <option key={company.id} value={company.name} />
                    ))}
                    </datalist>
                </FormItem>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => setShowAssistants(!showAssistants)}>
                {showAssistants ? 'Ocultar' : 'Adicionar'} Ajudantes
              </Button>

              {showAssistants && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md">
                    <FormItem>
                        <FormField
                        control={form.control}
                        name="assistant1Name"
                        render={({ field }) => (
                            <>
                            <FormLabel>Ajudante 1 (Opcional)</FormLabel>
                            <FormControl>
                            <Input 
                              placeholder="Digite ou selecione o ajudante 1" 
                              {...field} 
                              list="assistant-list" 
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value && !personsStore.some(p => p.name.toUpperCase() === value.toUpperCase())) {
                                  form.setError('assistant1Name', { type: 'manual', message: 'Ajudante 1 não cadastrado. Verifique ou cadastre.' });
                                } else {
                                  form.clearErrors('assistant1Name');
                                }
                                field.onBlur(e); 
                              }}
                            />
                            </FormControl>
                            <FormMessage />
                            </>
                        )}
                        />
                        <datalist id="assistant-list">
                        {personsStore.map(person => (
                            <option key={person.id} value={person.name} />
                        ))}
                        </datalist>
                    </FormItem>
                    <FormItem>
                        <FormField
                        control={form.control}
                        name="assistant2Name"
                        render={({ field }) => (
                            <>
                            <FormLabel>Ajudante 2 (Opcional)</FormLabel>
                            <FormControl>
                            <Input 
                              placeholder="Digite ou selecione o ajudante 2" 
                              {...field} 
                              list="assistant-list" 
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value && !personsStore.some(p => p.name.toUpperCase() === value.toUpperCase())) {
                                  form.setError('assistant2Name', { type: 'manual', message: 'Ajudante 2 não cadastrado. Verifique ou cadastre.' });
                                } else {
                                  form.clearErrors('assistant2Name');
                                }
                                field.onBlur(e); 
                              }}
                            />
                            </FormControl>
                            <FormMessage />
                            </>
                        )}
                        />
                    </FormItem>
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
                <FormItem>
                    <FormField
                    control={form.control}
                    name="internalDestinationName"
                    render={({ field }) => (
                        <>
                        <FormLabel>Destino Interno</FormLabel>
                        <FormControl>
                            <Input 
                              placeholder="Digite ou selecione o destino" 
                              {...field} 
                              list="internal-destination-list" 
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value && !internalDestinationsStore.some(id => id.name.toUpperCase() === value.toUpperCase())) {
                                  form.setError('internalDestinationName', { type: 'manual', message: 'Destino Interno não cadastrado. Verifique ou cadastre.' });
                                } else if (value === "" && !form.formState.errors.internalDestinationName?.message?.includes("obrigatório")) {
                                   form.clearErrors('internalDestinationName');
                                } else if (value && internalDestinationsStore.some(id => id.name.toUpperCase() === value.toUpperCase())) {
                                   form.clearErrors('internalDestinationName');
                                }
                                field.onBlur(e); 
                              }}
                            />
                        </FormControl>
                        <FormMessage />
                        </>
                    )}
                    />
                    <datalist id="internal-destination-list">
                    {internalDestinationsStore.map(dest => (
                        <option key={dest.id} value={dest.name} />
                    ))}
                    </datalist>
                </FormItem>
                <FormField
                  control={form.control}
                  name="movementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Movimentação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                {isSubmitting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" /> }
                Liberar Entrada e Imprimir
            </Button>
        </CardFooter>
      </Card>

      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
                <CardTitle className="text-xl font-semibold text-primary font-headline flex items-center">
                    <Clock className="mr-3 h-7 w-7 text-accent" />
                    Veículos Aguardando Liberação ({filteredWaitingVehicles.length})
                </CardTitle>
                <CardDescription>Lista de veículos no pátio que necessitam de aprovação para entrada.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <Input
                    id="searchWaiting"
                    type="text"
                    placeholder="Buscar por placa, motorista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-xs"
                    prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                />
                <Button 
                    onClick={handleCopyWaitingData} 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto"
                    disabled={filteredWaitingVehicles.length === 0}
                >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copiar Dados
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWaitingVehicles.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Placa 1</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Data/Hora Chegada</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitingVehicles.map((vehicle, index) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{vehicle.driverName}</TableCell>
                    <TableCell>{vehicle.transportCompanyName}</TableCell>
                    <TableCell>{vehicle.plate1}</TableCell>
                    <TableCell className="max-w-xs truncate">{vehicle.observation || '-'}</TableCell>
                    <TableCell>{new Date(vehicle.arrivalTimestamp).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproveEntryAndPrint(vehicle.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Printer className="mr-2 h-4 w-4" /> Liberar Entrada
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
    {isPdfPreviewOpen && pdfPreviewUrl && (
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={closePreviewModal}
        pdfUrl={pdfPreviewUrl}
      />
    )}
    </>
  );
}

