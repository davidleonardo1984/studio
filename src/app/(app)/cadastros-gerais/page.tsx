
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Driver, Assistant, TransportCompany, InternalDestination } from '@/lib/types';
import { PlusCircle, Edit2, Trash2, Users, Truck, MapPin } from 'lucide-react'; // Changed User to Users
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Schemas for forms
const driverSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório (mín. 3 caracteres).'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos.').regex(/^\d+$/, 'CPF deve conter apenas números.'),
  cnh: z.string().optional(),
  phone: z.string().optional(),
});
type DriverFormData = z.infer<typeof driverSchema>;

const transportCompanySchema = z.object({
  name: z.string().min(3, 'Nome da transportadora é obrigatório (mín. 3 caracteres).'),
  cnpj: z.string().optional(),
});
type TransportCompanyFormData = z.infer<typeof transportCompanySchema>;

const internalDestinationSchema = z.object({
  name: z.string().min(3, 'Nome do destino é obrigatório (mín. 3 caracteres).'),
  sector: z.string().optional(),
});
type InternalDestinationFormData = z.infer<typeof internalDestinationSchema>;


// Mock data stores (replace with API/Firebase calls)
let driversStore: Driver[] = [];
// let assistantsStore: Assistant[] = []; // Removed, will be part of driversStore
let transportCompaniesStore: TransportCompany[] = [];
let internalDestinationsStore: InternalDestination[] = [];

// Generic form and table component
interface CadastroSectionProps<TData, TFormData> {
  title: string;
  icon: React.ElementType;
  data: TData[];
  setData: React.Dispatch<React.SetStateAction<TData[]>>;
  formSchema: z.ZodSchema<TFormData>;
  formFields: (form: any) => React.ReactNode; // Function to render form fields
  tableHeaders: string[];
  renderTableRow: (item: TData, index: number, onDelete: (id: string) => void, onEdit: (item: TData) => void) => React.ReactNode;
  defaultValues: TFormData;
}

function CadastroSection<TData extends { id: string; name: string }, TFormData extends { name: string }>({
  title,
  icon: Icon,
  data,
  setData,
  formSchema,
  formFields,
  tableHeaders,
  renderTableRow,
  defaultValues,
}: CadastroSectionProps<TData, TFormData>) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TData | null>(null);

  const form = useForm<TFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: editingItem ? (editingItem as unknown as TFormData) : defaultValues,
  });
  
  useEffect(() => {
    if (editingItem) {
      form.reset(editingItem as unknown as TFormData);
      setShowForm(true);
    } else {
      form.reset(defaultValues);
    }
  }, [editingItem, form, defaultValues]);


  const onSubmit = (formData: TFormData) => {
    if (editingItem) {
        setData(prev => prev.map(item => item.id === editingItem.id ? {...editingItem, ...formData} : item));
        toast({ title: `${title} atualizado(a)!`, description: `${formData.name} foi atualizado(a) com sucesso.` });
        setEditingItem(null);
    } else {
        const newItem = { ...formData, id: Date.now().toString() } as unknown as TData; // Simple ID generation
        setData(prev => [...prev, newItem]);
        toast({ title: `${title} cadastrado(a)!`, description: `${formData.name} foi cadastrado(a) com sucesso.` });
    }
    setShowForm(false);
    form.reset(defaultValues);
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    toast({ title: `${title} excluído(a)!`, description: `Item foi excluído com sucesso.` });
  };
  
  const handleEdit = (item: TData) => {
    setEditingItem(item);    
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl font-semibold text-primary font-headline">{title}s</CardTitle>
        </div>
        <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(!showForm); form.reset(defaultValues);}}>
          <PlusCircle className="mr-2 h-4 w-4" /> {showForm ? 'Cancelar' : `Nova ${title}`}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6 p-4 border rounded-md bg-muted/20">
              {formFields(form)}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null); form.reset(defaultValues); }}>Cancelar</Button>
                <Button type="submit">{editingItem ? 'Salvar Alterações' : 'Cadastrar'}</Button>
              </div>
            </form>
          </Form>
        )}
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {tableHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => renderTableRow(item, index, handleDelete, handleEdit))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">Nenhuma {title.toLowerCase()} cadastrada.</p>
        )}
      </CardContent>
    </Card>
  );
}


export default function CadastrosGeraisPage() {
  const [drivers, setDrivers] = useState<Driver[]>(driversStore);
  // const [assistants, setAssistants] = useState<Assistant[]>(assistantsStore); // Removed
  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>(transportCompaniesStore);
  const [internalDestinations, setInternalDestinations] = useState<InternalDestination[]>(internalDestinationsStore);

  // Update stores when local state changes (for demo persistence across soft reloads)
  useEffect(() => { driversStore = drivers }, [drivers]);
  // useEffect(() => { assistantsStore = assistants }, [assistants]); // Removed
  useEffect(() => { transportCompaniesStore = transportCompanies }, [transportCompanies]);
  useEffect(() => { internalDestinationsStore = internalDestinations }, [internalDestinations]);
  
  const renderDriverFormFields = (form: any) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Carlos Alberto" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF (apenas números)</FormLabel><FormControl><Input placeholder="12345678900" {...field} maxLength={11} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="cnh" render={({ field }) => ( <FormItem><FormLabel>CNH (Opcional)</FormLabel><FormControl><Input placeholder="Número da CNH" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone (Opcional)</FormLabel><FormControl><Input placeholder="(00) 91234-5678" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </>
  );

  const renderDriverTableRow = (driver: Driver, index: number, onDelete: (id: string) => void, onEdit: (item: Driver) => void) => (
    <TableRow key={driver.id}>
      <TableCell>{driver.name}</TableCell>
      <TableCell>{driver.cpf}</TableCell>
      <TableCell>{driver.cnh || 'N/A'}</TableCell>
      <TableCell>{driver.phone || 'N/A'}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(driver)}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
        <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {driver.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(driver.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
  
  const renderTransportCompanyFormFields = (form: any) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Transportadora</FormLabel><FormControl><Input placeholder="Ex: Transportes Rápidos S.A." {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="cnpj" render={({ field }) => ( <FormItem><FormLabel>CNPJ (Opcional)</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </>
  );

  const renderTransportCompanyTableRow = (company: TransportCompany, index: number, onDelete: (id: string) => void, onEdit: (item: TransportCompany) => void) => (
    <TableRow key={company.id}>
      <TableCell>{company.name}</TableCell>
      <TableCell>{company.cnpj || 'N/A'}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(company)}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
        <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {company.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(company.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
  
   const renderInternalDestinationFormFields = (form: any) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome do Destino</FormLabel><FormControl><Input placeholder="Ex: Almoxarifado Principal" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="sector" render={({ field }) => ( <FormItem><FormLabel>Setor (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Setor A-01" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </>
  );

  const renderInternalDestinationTableRow = (destination: InternalDestination, index: number, onDelete: (id: string) => void, onEdit: (item: InternalDestination) => void) => (
    <TableRow key={destination.id}>
      <TableCell>{destination.name}</TableCell>
      <TableCell>{destination.sector || 'N/A'}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(destination)}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
        <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {destination.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(destination.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );


  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary font-headline">Cadastros Gerais</h1>
        <p className="text-muted-foreground">Gerencie motoristas, ajudantes, transportadoras e destinos internos.</p>
      </div>
      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6"> {/* Changed grid-cols */}
          <TabsTrigger value="drivers" className="flex items-center gap-2"><Users className="h-4 w-4" /> Motoristas e Ajudantes</TabsTrigger> {/* Changed label and icon */}
          {/* <TabsTrigger value="assistants" className="flex items-center gap-2"><Users className="h-4 w-4" /> Ajudantes</TabsTrigger> Removed */}
          <TabsTrigger value="transportCompanies" className="flex items-center gap-2"><Truck className="h-4 w-4" />Transportadoras</TabsTrigger>
          <TabsTrigger value="internalDestinations" className="flex items-center gap-2"><MapPin className="h-4 w-4" />Destinos Internos</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <CadastroSection
            title="Pessoa" // Changed title to be generic
            icon={Users} // Changed icon
            data={drivers} // This state now manages both drivers and assistants conceptually
            setData={setDrivers}
            formSchema={driverSchema}
            formFields={renderDriverFormFields}
            tableHeaders={['Nome', 'CPF', 'CNH', 'Telefone']}
            renderTableRow={renderDriverTableRow}
            defaultValues={{ name: '', cpf: '', cnh: '', phone: '' }}
          />
        </TabsContent>
        {/* <TabsContent value="assistants"> Removed
          <CadastroSection
            title="Ajudante"
            icon={Users}
            data={assistants}
            setData={setAssistants}
            formSchema={driverSchema} 
            formFields={renderDriverFormFields} 
            tableHeaders={['Nome', 'CPF', 'CNH', 'Telefone']}
            renderTableRow={renderDriverTableRow as any} 
            defaultValues={{ name: '', cpf: '', cnh: '', phone: '' }}
          />
        </TabsContent> */}
        <TabsContent value="transportCompanies">
           <CadastroSection
            title="Transportadora"
            icon={Truck}
            data={transportCompanies}
            setData={setTransportCompanies}
            formSchema={transportCompanySchema}
            formFields={renderTransportCompanyFormFields}
            tableHeaders={['Nome', 'CNPJ']}
            renderTableRow={renderTransportCompanyTableRow}
            defaultValues={{ name: '', cnpj: ''}}
          />
        </TabsContent>
        <TabsContent value="internalDestinations">
          <CadastroSection
            title="Destino Interno"
            icon={MapPin}
            data={internalDestinations}
            setData={setInternalDestinations}
            formSchema={internalDestinationSchema}
            formFields={renderInternalDestinationFormFields}
            tableHeaders={['Nome', 'Setor']}
            renderTableRow={renderInternalDestinationTableRow}
            defaultValues={{ name: '', sector: '' }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Initialize with some mock data for development if stores are empty
if (process.env.NODE_ENV === 'development') {
    if (driversStore.length === 0) {
        driversStore.push({ id: 'd1', name: 'Carlos Pereira (Motorista)', cpf: '11122233344', cnh: '123456789', phone: '11999998888' });
        driversStore.push({ id: 'a1', name: 'Joana Silva (Ajudante)', cpf: '44455566677', cnh: '987654321', phone: '11988887777' }); // Example assistant
    }
    // assistantsStore is no longer separately populated or managed by dedicated state.
    if (transportCompaniesStore.length === 0) {
        transportCompaniesStore.push({ id: 'tc1', name: 'Logistica Veloz Ltda', cnpj: '12.345.678/0001-99' });
    }
    if (internalDestinationsStore.length === 0) {
        internalDestinationsStore.push({ id: 'id1', name: 'Galpão Central', sector: 'GC-01' });
    }
}
    
