
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
import type { Driver, TransportCompany, InternalDestination, TransportCompanyFormData } from '@/lib/types';
import { personsStore, internalDestinationsStore } from '@/lib/store';
import { PlusCircle, Edit2, Trash2, Users, Truck, MapPin, Loader2 } from 'lucide-react';
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
import { useTransportCompanies } from '@/context/TransportCompanyContext';


// Schemas for forms
const personSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório (mín. 3 caracteres).'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos.').regex(/^\d+$/, 'CPF deve conter apenas números.'),
  cnh: z.string().optional(),
  phone: z.string().optional(),
});
type PersonFormData = z.infer<typeof personSchema>;

const transportCompanySchema = z.object({
  name: z.string().min(3, 'Nome da Transportadora / Empresa é obrigatório (mín. 3 caracteres).'),
});


const internalDestinationSchema = z.object({
  name: z.string().min(3, 'Nome do destino é obrigatório (mín. 3 caracteres).'),
});
type InternalDestinationFormData = z.infer<typeof internalDestinationSchema>;


// Generic form and table component for in-memory stores
interface CadastroSectionProps<TData, TFormData> {
  title: string;
  icon: React.ElementType;
  data: TData[];
  setDataStore: (data: TData[]) => void;
  formSchema: z.ZodSchema<TFormData>;
  formFields: (form: any) => React.ReactNode;
  tableHeaders: string[];
  renderTableRow: (item: TData, index: number, onDelete: (id: string) => void, onEdit: (item: TData) => void) => React.ReactNode;
  defaultValues: TFormData;
}

function CadastroSection<TData extends { id: string; name: string }, TFormData extends { name: string }>({
  title,
  icon: Icon,
  data,
  setDataStore,
  formSchema,
  formFields,
  tableHeaders,
  renderTableRow,
  defaultValues,
}: CadastroSectionProps<TData, TFormData>) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TData | null>(null);
  const [localData, setLocalData] = useState<TData[]>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

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
    let updatedData;
    if (editingItem) {
        updatedData = localData.map(item => item.id === editingItem.id ? {...editingItem, ...formData} : item);
        toast({ title: `${title} atualizado(a)!`, description: `${formData.name} foi atualizado(a) com sucesso.` });
        setEditingItem(null);
    } else {
        const newItem = { ...formData, id: Date.now().toString() } as unknown as TData;
        updatedData = [...localData, newItem];
        toast({ title: `${title} cadastrado(a)!`, description: `${formData.name} foi cadastrado(a) com sucesso.` });
    }
    setLocalData(updatedData);
    setDataStore(updatedData); // Update global store
    setShowForm(false);
    form.reset(defaultValues);
  };

  const handleDelete = (id: string) => {
    const updatedData = localData.filter(item => item.id !== id);
    setLocalData(updatedData);
    setDataStore(updatedData); // Update global store
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
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
                <Button type="submit">{editingItem ? 'Salvar Alterações' : 'Cadastrar'}</Button>
              </div>
            </form>
          </Form>
        )}
        {localData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {tableHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localData.map((item, index) => renderTableRow(item, index, handleDelete, handleEdit))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">Nenhuma {title.toLowerCase()} cadastrada.</p>
        )}
      </CardContent>
    </Card>
  );
}

// Specific component for Transport Companies using Firestore
function TransportCompaniesSection() {
  const { toast } = useToast();
  const { companies: data, isLoading, addCompany, updateCompany, deleteCompany } = useTransportCompanies();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TransportCompany | null>(null);

  const form = useForm<TransportCompanyFormData>({
    resolver: zodResolver(transportCompanySchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({ name: editingItem.name });
      setShowForm(true);
    } else {
      form.reset({ name: '' });
    }
  }, [editingItem, form]);

  const onSubmit = async (formData: TransportCompanyFormData) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateCompany(editingItem.id, formData);
        toast({ title: "Transportadora / Empresa atualizada!", description: `${formData.name} foi atualizada com sucesso.` });
      } else {
        await addCompany(formData);
        toast({ title: "Transportadora / Empresa cadastrada!", description: `${formData.name} foi cadastrada com sucesso.` });
      }
      setEditingItem(null);
      setShowForm(false);
      form.reset({ name: '' });
    } catch (error) {
      console.error("Error saving transport company: ", error);
      // Error toast is handled in the context now
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCompany(id);
      // Success toast handled in context
    } catch (error) {
      console.error("Error deleting transport company: ", error);
      // Error toast handled in context
    }
  };

  const handleEdit = (item: TransportCompany) => {
    setEditingItem(item);
  };
  
  const formFields = (form: any) => (
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem>
        <FormLabel>Nome da Transportadora / Empresa</FormLabel>
        <FormControl><Input placeholder="Ex: Transportes Rápidos S.A." {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-semibold text-primary font-headline">Transportadoras / Empresas</CardTitle>
        </div>
        <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(!showForm); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> {showForm ? 'Cancelar' : 'Nova Transportadora / Empresa'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6 p-4 border rounded-md bg-muted/20">
              {formFields(form)}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </Form>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando empresas...</p>
          </div>
        ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {item.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma empresa encontrada.</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Transportadora / Empresa" para começar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function CadastrosGeraisPage() {
  const [persons, setPersonsState] = useState<Driver[]>(personsStore);
  const [internalDestinations, setInternalDestinationsState] = useState<InternalDestination[]>(internalDestinationsStore);

  const updatePersonsStore = (data: Driver[]) => { personsStore.length = 0; personsStore.push(...data); };
  const updateInternalDestinationsStore = (data: InternalDestination[]) => { internalDestinationsStore.length = 0; internalDestinationsStore.push(...data); };
  
  useEffect(() => setPersonsState([...personsStore]), []);
  useEffect(() => setInternalDestinationsState([...internalDestinationsStore]), []);


  const formatDisplayPhoneNumber = (val: string): string => {
    if (typeof val !== 'string' || !val) return "";
    const digits = val.replace(/\D/g, "");

    if (digits.length === 0) return "";
    let formatted = `(${digits.substring(0, 2)}`;
    if (digits.length > 2) {
      formatted += `)${digits.substring(2, 11)}`;
    }
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    let rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue.length > 11) {
      rawValue = rawValue.substring(0, 11);
    }
    fieldOnChange(rawValue);
  };

  const renderPersonFormFields = (form: any) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Carlos Alberto" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF (apenas números)</FormLabel><FormControl><Input placeholder="12345678900" {...field} maxLength={11} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="cnh" render={({ field }) => ( <FormItem><FormLabel>CNH (Opcional)</FormLabel><FormControl><Input placeholder="Número da CNH" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone (Opcional)</FormLabel>
            <FormControl>
              <Input
                placeholder="(XX)XXXXXXXXX"
                {...field}
                value={formatDisplayPhoneNumber(field.value || "")}
                onChange={(e) => handlePhoneChange(e, field.onChange)}
                type="tel"
                maxLength={13}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  const renderPersonTableRow = (person: Driver, index: number, onDelete: (id: string) => void, onEdit: (item: Driver) => void) => (
    <TableRow key={person.id}>
      <TableCell>{person.name}</TableCell>
      <TableCell>{person.cpf}</TableCell>
      <TableCell>{person.cnh || 'N/A'}</TableCell>
      <TableCell>{person.phone ? formatDisplayPhoneNumber(person.phone) : 'N/A'}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(person)}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
        <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {person.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(person.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );

   const renderInternalDestinationFormFields = (form: any) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome do Destino</FormLabel><FormControl><Input placeholder="Ex: Almoxarifado Principal" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </>
  );

  const renderInternalDestinationTableRow = (destination: InternalDestination, index: number, onDelete: (id: string) => void, onEdit: (item: InternalDestination) => void) => (
    <TableRow key={destination.id}>
      <TableCell>{destination.name}</TableCell>
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
      <Tabs defaultValue="persons" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
          <TabsTrigger value="persons" className="flex items-center gap-2"><Users className="h-4 w-4" /> Motoristas e Ajudantes</TabsTrigger>
          <TabsTrigger value="transportCompanies" className="flex items-center gap-2"><Truck className="h-4 w-4" />Transportadoras / Empresas</TabsTrigger>
          <TabsTrigger value="internalDestinations" className="flex items-center gap-2"><MapPin className="h-4 w-4" />Destinos Internos</TabsTrigger>
        </TabsList>

        <TabsContent value="persons">
          <CadastroSection
            title="Pessoa"
            icon={Users}
            data={persons}
            setDataStore={updatePersonsStore}
            formSchema={personSchema}
            formFields={renderPersonFormFields}
            tableHeaders={['Nome', 'CPF', 'CNH', 'Telefone']}
            renderTableRow={renderPersonTableRow}
            defaultValues={{ name: '', cpf: '', cnh: '', phone: '' }}
          />
        </TabsContent>
        <TabsContent value="transportCompanies">
           <TransportCompaniesSection />
        </TabsContent>
        <TabsContent value="internalDestinations">
          <CadastroSection
            title="Destino Interno"
            icon={MapPin}
            data={internalDestinations}
            setDataStore={updateInternalDestinationsStore}
            formSchema={internalDestinationSchema}
            formFields={renderInternalDestinationFormFields}
            tableHeaders={['Nome']}
            renderTableRow={renderInternalDestinationTableRow}
            defaultValues={{ name: ''}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
