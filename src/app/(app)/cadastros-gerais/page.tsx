
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Driver, TransportCompany, InternalDestination, NewDriver, NewTransportCompany, NewInternalDestination } from '@/lib/types';
import { PlusCircle, Edit2, Trash2, Users, Truck, MapPin, Loader2, AlertTriangle, Search, Edit3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';


// Schemas for forms
const personSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório (mín. 3 caracteres).'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos.').regex(/^\d+$/, 'CPF deve conter apenas números.'),
  cnh: z.string().optional(),
  phone: z.string().optional(),
  isBlocked: z.boolean().default(false).optional(),
});
type PersonFormData = z.infer<typeof personSchema>;

const transportCompanySchema = z.object({
  name: z.string().min(3, 'Nome da Transportadora / Empresa é obrigatório (mín. 3 caracteres).'),
});


const internalDestinationSchema = z.object({
  name: z.string().min(3, 'Nome do destino é obrigatório (mín. 3 caracteres).'),
});
type InternalDestinationFormData = z.infer<typeof internalDestinationSchema>;


const FirebaseErrorDisplay = () => (
    <Card className="shadow-lg mt-4">
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
                   Por favor, verifique se o arquivo `.env.local` existe e se as credenciais do seu projeto Firebase estão corretas. Os dados não podem ser carregados ou salvos sem esta configuração.
                </AlertDescription>
            </Alert>
        </CardContent>
    </Card>
);


// Specific component for Persons using Firestore
function PersonsSection() {
  const { toast } = useToast();
  const [data, setData] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: { name: '', cpf: '', cnh: '', phone: '', isBlocked: false },
  });
  
  if (!db) {
      return <FirebaseErrorDisplay />;
  }
  const personsCollection = collection(db, 'persons');

  const refreshData = async () => {
      setIsLoading(true);
      try {
        const q = query(personsCollection, orderBy("name"));
        const snapshot = await getDocs(q);
        const personList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
        setData(personList);
      } catch (error) {
        console.error("Failed to fetch persons:", error);
        toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar as Pessoas." });
      } finally {
        setIsLoading(false);
      }
  }

  useEffect(() => {
    refreshData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingItem) {
      form.reset({ name: editingItem.name, cpf: editingItem.cpf, cnh: editingItem.cnh, phone: editingItem.phone, isBlocked: editingItem.isBlocked || false });
      setShowForm(true);
    } else {
      form.reset({ name: '', cpf: '', cnh: '', phone: '', isBlocked: false });
    }
  }, [editingItem, form]);

  const onSubmit = async (formData: NewDriver) => {
    setIsSubmitting(true);
    try {
        // Check for duplicates
        const isDuplicateCpf = data.some(
            p => p.cpf === formData.cpf && p.id !== editingItem?.id
        );
        if (isDuplicateCpf) {
            form.setError("cpf", { type: "manual", message: "Este CPF já está cadastrado." });
            setIsSubmitting(false);
            return;
        }

        const isDuplicateName = data.some(
            p => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && p.id !== editingItem?.id
        );
        if (isDuplicateName) {
            form.setError("name", { type: "manual", message: "Este nome já está cadastrado." });
            setIsSubmitting(false);
            return;
        }


        if (editingItem) {
            const itemDoc = doc(db, 'persons', editingItem.id);
            await updateDoc(itemDoc, formData);
            toast({ title: "Pessoa atualizada!", description: `${formData.name} foi atualizado com sucesso.` });
        } else {
            await addDoc(personsCollection, formData);
            toast({ title: "Pessoa cadastrada!", description: `${formData.name} foi cadastrado com sucesso.` });
        }
        await refreshData();
        setEditingItem(null);
        setShowForm(false);
        form.reset();
    } catch (error) {
        console.error("Error saving person:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível salvar a pessoa." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        const itemDoc = doc(db, 'persons', id);
        await deleteDoc(itemDoc);
        toast({ title: 'Excluído!', description: 'A pessoa foi removida com sucesso.' });
        await refreshData();
    } catch (error) {
        console.error("Error deleting person:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível excluir a pessoa." });
    }
  };
  
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(person => 
      person.name.toLowerCase().includes(lowercasedTerm) ||
      person.cpf.includes(lowercasedTerm)
    );
  }, [data, searchTerm]);

  const formatDisplayPhoneNumber = (val: string): string => {
      if (typeof val !== 'string' || !val) return "";
      const digits = val.replace(/\D/g, "");
      if (digits.length === 0) return "";
      let formatted = `(${digits.substring(0, 2)}`;
      if (digits.length > 2) {
          const end = digits.length === 11 ? 7 : 6;
          formatted += `) ${digits.substring(2, end)}`;
          if (digits.length > 6) {
              formatted += `-${digits.substring(end, 11)}`;
          }
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

  const formFields = (form: any) => (
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="(XX) XXXXX-XXXX"
                {...field}
                value={formatDisplayPhoneNumber(field.value || "")}
                onChange={(e) => handlePhoneChange(e, field.onChange)}
                type="tel"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="isBlocked"
        render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card md:col-span-2">
                <div className="space-y-0.5">
                    <FormLabel>Bloquear Acesso</FormLabel>
                    <FormDescription>
                        Impedir que esta pessoa seja registrada em novas entradas na portaria.
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!editingItem}
                        aria-label="Bloquear Acesso"
                    />
                </FormControl>
            </FormItem>
        )}
        />
    </div>
  );

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-semibold text-primary font-headline">Motoristas e Ajudantes</CardTitle>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            {!showForm && (
                <Input 
                    placeholder="Pesquisar por nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                    className="w-full sm:w-auto"
                />
            )}
            {showForm ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
                <Button type="submit" form="person-form" size="sm" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </>
            ) : (
                <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(true); }} className="shrink-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Pessoa
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <Form {...form}>
            <form id="person-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6 p-4 border rounded-md bg-muted/20">
              {formFields(form)}
            </form>
          </Form>
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Carregando...</p>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Utilize a busca para consultar os cadastros.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite um nome ou CPF para exibir os resultados.
                </p>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>CNH</TableHead><TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id} className={item.isBlocked ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                          <TableCell>
                              {item.isBlocked ? (
                                  <Badge variant="destructive">BLOQUEADO</Badge>
                              ) : (
                                  <Badge variant="secondary">ATIVO</Badge>
                              )}
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.cpf}</TableCell>
                          <TableCell>{item.cnh || 'N/A'}</TableCell>
                          <TableCell>{item.phone ? formatDisplayPhoneNumber(item.phone) : 'N/A'}</TableCell>
                          <TableCell className="text-right space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); }}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
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
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum resultado encontrado.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente um termo de busca diferente ou clique em "Cadastrar Pessoa" para cadastrar.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Specific component for Transport Companies using Firestore
function TransportCompaniesSection() {
  const { toast } = useToast();
  const [data, setData] = useState<TransportCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TransportCompany | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<NewTransportCompany>({
    resolver: zodResolver(transportCompanySchema),
    defaultValues: { name: '' },
  });

  if (!db) {
    return <FirebaseErrorDisplay />;
  }
  const companiesCollection = collection(db, 'transportCompanies');

  const refreshData = async () => {
      setIsLoading(true);
      try {
        const q = query(companiesCollection, orderBy("name"));
        const snapshot = await getDocs(q);
        const companiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportCompany));
        setData(companiesList);
      } catch (error) {
        console.error("Failed to fetch transport companies:", error);
        toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar as Transportadoras / Empresas." });
      } finally {
        setIsLoading(false);
      }
  }
  
  useEffect(() => {
    refreshData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingItem) {
      form.reset({ name: editingItem.name });
      setShowForm(true);
    } else {
      form.reset({ name: '' });
    }
  }, [editingItem, form]);
  
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(company => 
      company.name.toLowerCase().includes(lowercasedTerm)
    );
  }, [data, searchTerm]);

  const onSubmit = async (formData: NewTransportCompany) => {
    setIsSubmitting(true);
    
    const normalizedName = formData.name.trim().toLowerCase();
    const isDuplicate = data.some(
      company => company.name.trim().toLowerCase() === normalizedName && company.id !== editingItem?.id
    );

    if (isDuplicate) {
        form.setError("name", { type: "manual", message: "Esta transportadora / empresa já está cadastrada." });
        setIsSubmitting(false);
        return;
    }

    try {
      if (editingItem) {
        const companyDoc = doc(db, 'transportCompanies', editingItem.id);
        await updateDoc(companyDoc, formData);
        toast({ title: "Transportadora / Empresa atualizada!", description: `${formData.name} foi atualizada com sucesso.` });
      } else {
        await addDoc(companiesCollection, formData);
        toast({ title: "Transportadora / Empresa cadastrada!", description: `${formData.name} foi cadastrada com sucesso.` });
      }
      await refreshData();
      setEditingItem(null);
      setShowForm(false);
      form.reset({ name: '' });
    } catch (error) {
      console.error("Error saving transport company: ", error);
      toast({ variant: 'destructive', title: "Erro", description: "Não foi possível salvar a Transportadora / Empresa." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        const companyDoc = doc(db, 'transportCompanies', id);
        await deleteDoc(companyDoc);
        toast({ title: 'Excluído!', description: 'A Transportadora / Empresa foi removida com sucesso.' });
        await refreshData();
    } catch (error) {
      console.error("Error deleting transport company: ", error);
      toast({ variant: 'destructive', title: "Erro ao Excluir", description: `A exclusão falhou.` });
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
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-semibold text-primary font-headline">Transportadoras / Empresas</CardTitle>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            {!showForm && (
                <Input 
                    placeholder="Pesquisar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                    className="w-full sm:w-auto"
                />
            )}
            {showForm ? (
              <>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
                  <Button type="submit" form="company-form" size="sm" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
              </>
            ) : (
                <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(true); }} className="shrink-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Transportadora / Empresa
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <Form {...form}>
            <form id="company-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6 p-4 border rounded-md bg-muted/20">
              {formFields(form)}
            </form>
          </Form>
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Carregando Transportadoras / Empresas...</p>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Utilize a busca para consultar os cadastros.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite o nome de uma transportadora para exibir.
                </p>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
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
              </div>
            ) : (
              <div className="text-center py-12">
                <Truck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum resultado encontrado.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente um termo de busca diferente ou clique em "Cadastrar Transportadora / Empresa" para cadastrar.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Specific component for Internal Destinations using Firestore
function InternalDestinationsSection() {
  const { toast } = useToast();
  const [data, setData] = useState<InternalDestination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InternalDestination | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<InternalDestinationFormData>({
    resolver: zodResolver(internalDestinationSchema),
    defaultValues: { name: '' },
  });

  if (!db) {
    return <FirebaseErrorDisplay />;
  }
  const destinationsCollection = collection(db, 'internalDestinations');

  const refreshData = async () => {
    setIsLoading(true);
    try {
        const q = query(destinationsCollection, orderBy("name"));
        const snapshot = await getDocs(q);
        const destList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalDestination));
        setData(destList);
    } catch (error) {
        console.error("Failed to fetch internal destinations:", error);
        toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar os Destinos Internos." });
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingItem) {
      form.reset({ name: editingItem.name });
      setShowForm(true);
    } else {
      form.reset({ name: '' });
    }
  }, [editingItem, form]);
  
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(destination => 
      destination.name.toLowerCase().includes(lowercasedTerm)
    );
  }, [data, searchTerm]);

  const onSubmit = async (formData: NewInternalDestination) => {
    setIsSubmitting(true);

    const normalizedName = formData.name.trim().toLowerCase();
    const isDuplicate = data.some(
      dest => dest.name.trim().toLowerCase() === normalizedName && dest.id !== editingItem?.id
    );

    if (isDuplicate) {
        form.setError("name", { type: "manual", message: "Este destino já está cadastrado." });
        setIsSubmitting(false);
        return;
    }

    try {
        if (editingItem) {
            const itemDoc = doc(db, 'internalDestinations', editingItem.id);
            await updateDoc(itemDoc, formData);
            toast({ title: "Destino Interno atualizado!", description: `${formData.name} foi atualizado com sucesso.` });
        } else {
            await addDoc(destinationsCollection, formData);
            toast({ title: "Destino Interno cadastrado!", description: `${formData.name} foi cadastrado com sucesso.` });
        }
        await refreshData();
        setEditingItem(null);
        setShowForm(false);
        form.reset();
    } catch (error) {
        console.error("Error saving destination:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível salvar o destino." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        const itemDoc = doc(db, 'internalDestinations', id);
        await deleteDoc(itemDoc);
        toast({ title: 'Excluído!', description: 'O destino interno foi removido com sucesso.' });
        await refreshData();
    } catch (error) {
        console.error("Error deleting destination:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível excluir o destino." });
    }
  };

  const formFields = (form: any) => (
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem>
        <FormLabel>Nome do Destino</FormLabel>
        <FormControl><Input placeholder="Ex: Almoxarifado Principal" {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
     <Card className="shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-semibold text-primary font-headline">Destinos Internos</CardTitle>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            {!showForm && (
                <Input 
                    placeholder="Pesquisar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                    className="w-full sm:w-auto"
                />
            )}
            {showForm ? (
              <>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
                  <Button type="submit" form="destination-form" size="sm" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
              </>
            ) : (
                <Button size="sm" onClick={() => { setEditingItem(null); setShowForm(true); }} className="shrink-0">
                  <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Destino
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {showForm ? (
          <Form {...form}>
            <form id="destination-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6 p-4 border rounded-md bg-muted/20">
              {formFields(form)}
            </form>
          </Form>
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Carregando...</p>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Utilize a busca para consultar os cadastros.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite o nome de um destino para exibir.
                </p>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}><Edit2 className="h-4 w-4 text-blue-600" /></Button>
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
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum resultado encontrado.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente um termo de busca diferente ou clique em "Cadastrar Destino" para cadastrar.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}


export default function CadastrosGeraisPage() {
  const [activeTab, setActiveTab] = useState("persons");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center">
        <Edit3 className="mr-3 h-8 w-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Cadastros Gerais</h1>
          <p className="text-muted-foreground">Gerencie motoristas, ajudantes, transportadoras / empresas e destinos internos.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="persons" className="flex items-center gap-2"><Users className="h-4 w-4" /> Motoristas e Ajudantes</TabsTrigger>
          <TabsTrigger value="transportCompanies" className="flex items-center gap-2"><Truck className="h-4 w-4" />Transportadoras / Empresas</TabsTrigger>
          <TabsTrigger value="internalDestinations" className="flex items-center gap-2"><MapPin className="h-4 w-4" />Destinos Internos</TabsTrigger>
        </TabsList>

        <TabsContent value="persons">
          <PersonsSection />
        </TabsContent>
        <TabsContent value="transportCompanies">
           <TransportCompaniesSection />
        </TabsContent>
        <TabsContent value="internalDestinations">
          <InternalDestinationsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
