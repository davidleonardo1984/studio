
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { User, UserRole } from '@/lib/types';
import { PlusCircle, Edit2, Trash2, UserPlus, ShieldAlert, Eye, EyeOff, Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Switch } from '@/components/ui/switch';


const userAccessSchema = z.object({
  name: z.string().min(3, { message: 'Nome é obrigatório (mín. 3 caracteres).' }),
  login: z.string().min(3, { message: 'Login é obrigatório (mín. 3 caracteres).' }),
  password: z.string().optional().refine(val => !val || val.length >= 6, { message: 'Senha deve ter no mínimo 6 caracteres se fornecida.'}),
  role: z.enum(['admin', 'user', 'gate_agent', 'exit_agent'], { required_error: 'Perfil é obrigatório.' }),
  canViewDashboardStats: z.boolean().default(true).optional(),
});

type UserAccessFormData = z.infer<typeof userAccessSchema>;

export default function CadastroAcessoPage() {
  const { toast } = useToast();
  const { user, users: allUsersFromAuth, addUser, updateUser, deleteUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthLoading && user && user.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.' });
      router.replace('/dashboard');
    }
  }, [user, isAuthLoading, router, toast]);

  const form = useForm<UserAccessFormData>({
    resolver: zodResolver(userAccessSchema),
    defaultValues: {
      name: '',
      login: '',
      password: '',
      role: 'user',
      canViewDashboardStats: true,
    },
  });

  const { watch, setValue } = form;
  const roleValue = watch('role');

  useEffect(() => {
      if (roleValue === 'admin') {
          setValue('canViewDashboardStats', true);
      } else if (roleValue === 'gate_agent' || roleValue === 'exit_agent') {
        setValue('canViewDashboardStats', false);
      }
  }, [roleValue, setValue]);

  useEffect(() => {
    if (editingUser) {
      form.reset({
        name: editingUser.name,
        login: editingUser.login,
        password: '', // Password should be re-entered for security
        role: editingUser.role,
        canViewDashboardStats: editingUser.canViewDashboardStats || false,
      });
      setShowForm(true);
    } else {
        form.reset({ name: '', login: '', password: '', role: 'user', canViewDashboardStats: true });
    }
  }, [editingUser, form]);
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return allUsersFromAuth;
    const lowercasedTerm = searchTerm.toLowerCase();
    return allUsersFromAuth.filter(u => 
      u.name.toLowerCase().includes(lowercasedTerm) ||
      u.login.toLowerCase().includes(lowercasedTerm)
    );
  }, [allUsersFromAuth, searchTerm]);


  const onSubmit = async (data: UserAccessFormData) => {
    setIsSubmitting(true);
    if (editingUser) {
      if (data.password && data.password.length < 6) {
         form.setError("password", {type: "manual", message: "Nova senha deve ter no mínimo 6 caracteres."});
         setIsSubmitting(false);
         return;
      }
      const updatedUserData: User = {
        ...editingUser,
        name: data.name,
        login: data.login, 
        ...(data.password && { password: data.password }), 
        role: data.role as UserRole,
        canViewDashboardStats: data.role === 'admin' ? true : (data.role === 'gate_agent' || data.role === 'exit_agent') ? false : data.canViewDashboardStats,
      };

      const result = await updateUser(updatedUserData);
      if (result.success) {
          toast({ title: 'Usuário Atualizado!', description: `Usuário ${data.login} foi atualizado.` });
      } else {
          toast({ variant: "destructive", title: 'Erro ao Atualizar', description: result.message || 'Não foi possível atualizar o usuário.' });
          if (result.message?.toLowerCase().includes('login')) {
              form.setError("login", {type: "manual", message: result.message });
          }
          setIsSubmitting(false);
          return;
      }
      setEditingUser(null);

    } else {
      if (!data.password || data.password.length < 6) {
        form.setError("password", {type: "manual", message: "Senha é obrigatória e deve ter no mínimo 6 caracteres."});
        setIsSubmitting(false);
        return;
      }
      const newUser: Omit<User, 'id'> = {
        name: data.name,
        login: data.login,
        password: data.password, 
        role: data.role as UserRole,
        canViewDashboardStats: data.role === 'admin' ? true : (data.role === 'gate_agent' || data.role === 'exit_agent') ? false : data.canViewDashboardStats,
      };
      
      const result = await addUser(newUser);
      if(result.success) {
          toast({ title: 'Usuário Cadastrado!', description: `Usuário ${data.login} foi criado com sucesso.` });
      } else {
          toast({ variant: 'destructive', title: 'Erro de Cadastro', description: result.message || 'Não foi possível cadastrar o usuário.' });
          if (result.message?.toLowerCase().includes('login')) {
              form.setError("login", {type: "manual", message: result.message });
          }
          setIsSubmitting(false);
          return;
      }
    }
    setShowForm(false);
    form.reset({ name: '', login: '', password: '', role: 'user', canViewDashboardStats: true });
    setIsSubmitting(false);
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
  };
  
  const handleDeleteUser = async (userId: string) => {
    const success = await deleteUser(userId);
    if (success) {
        toast({
            title: 'Usuário Excluído',
            description: 'O usuário foi removido com sucesso.',
        });
    } else {
        toast({
            variant: "destructive",
            title: 'Erro ao Excluir',
            description: 'Não foi possível remover o usuário.',
        });
    }
  };

  if (isAuthLoading) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto pb-8 text-center">
        <Card className="max-w-md mx-auto p-8 shadow-xl">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-destructive">Acesso Restrito</h1>
            <p className="text-muted-foreground mt-2">Esta página é exclusiva para administradores.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6">Voltar ao Painel</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-8">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold text-primary font-headline">Gerenciamento de Acesso</h1>
            <p className="text-muted-foreground">{showForm ? (editingUser ? 'Altere os dados do usuário abaixo.' : 'Adicione um novo usuário ao sistema.') : 'Adicione, edite ou visualize usuários do sistema.'}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          {showForm ? (
              <>
                  <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingUser(null); }}>Cancelar</Button>
                  <Button size="sm" type="submit" form="user-access-form" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                  </Button>
              </>
          ) : (
              <Button size="sm" onClick={() => { setEditingUser(null); setShowForm(true); }}>
                  <UserPlus className="mr-2 h-4 w-4" /> Cadastrar Usuario
              </Button>
          )}
        </div>
      </div>

      {showForm && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">{editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</CardTitle>
            <CardDescription>{editingUser ? 'Altere os dados do usuário abaixo.' : 'Preencha os dados para criar um novo acesso.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form id="user-access-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Maria Souza" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="login" render={({ field }) => ( <FormItem><FormLabel>Login de Acesso</FormLabel><FormControl><Input placeholder="Ex: maria.souza" {...field} disabled={!!editingUser && editingUser.login === 'admin'} noAutoUppercase={true} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" {...field} noAutoUppercase={true} />
                        </FormControl>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="sr-only">{showPassword ? "Ocultar senha" : "Mostrar senha"}</span>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Perfil de Acesso</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!editingUser && editingUser.login === 'admin'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="user">Usuário</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="gate_agent">Agente de Pátio</SelectItem>
                                    <SelectItem value="exit_agent">Agente de Saída</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="canViewDashboardStats"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card md:col-span-2">
                            <div className="space-y-0.5">
                                <FormLabel>Ver Estatísticas do Painel</FormLabel>
                                <FormDescription>
                                    Permitir que este usuário visualize os contadores de acesso no painel inicial.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={roleValue === 'admin' || roleValue === 'gate_agent' || roleValue === 'exit_agent'}
                                    aria-label="Ver Estatísticas do Painel"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Card className="shadow-lg">
          <CardHeader>
           <div className="flex items-center justify-between w-full gap-4">
              <CardTitle className="text-xl font-semibold text-primary whitespace-nowrap">
               Usuários Cadastrados ({filteredUsers.length})
              </CardTitle>
              <Input
                placeholder="Pesquisar por nome ou login..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefixIcon={<Search className="h-4 w-4 text-muted-foreground" />}
                className="max-w-sm"
              />
           </div>
          </CardHeader>
          <CardContent>
            {isAuthLoading ? (
              <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const roleLabel = u.role === 'admin' ? 'Admin' : u.role === 'gate_agent' ? 'Agente de Pátio' : u.role === 'exit_agent' ? 'Agente de Saída' : 'Usuário';
                    const roleClass = u.role === 'admin' ? 'bg-accent text-accent-foreground' : u.role === 'gate_agent' ? 'bg-muted text-muted-foreground' : u.role === 'exit_agent' ? 'bg-blue-100 text-blue-800' : 'bg-secondary text-secondary-foreground';
                    
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium py-1">{u.name}</TableCell>
                        <TableCell className="py-1">{u.login}</TableCell>
                        <TableCell className="py-1"><span className={`px-2 py-1 text-xs rounded-full ${roleClass}`}>{roleLabel}</span></TableCell>
                        <TableCell className="text-right space-x-1 py-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} title="Editar" disabled={u.login === 'admin' && user?.login !== 'admin' /* Allow admin to edit self, but not other admins if any */}>
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                          {user?.login !== u.login && u.login !== 'admin' && ( // Prevent deleting self and the main 'admin' account
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Excluir">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o usuário {u.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">{searchTerm ? "Nenhum usuário encontrado com os termos da busca." : "Nenhum usuário cadastrado."}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
