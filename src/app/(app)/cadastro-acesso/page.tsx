"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { User, UserRole } from '@/lib/types';
import { PlusCircle, Edit2, Trash2, UserPlus, ShieldAlert, Eye, EyeOff } from 'lucide-react';
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


const userAccessSchema = z.object({
  name: z.string().min(3, { message: 'Nome é obrigatório (mín. 3 caracteres).' }),
  login: z.string().min(3, { message: 'Login é obrigatório (mín. 3 caracteres).' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres.' }),
  role: z.enum(['admin', 'user'], { required_error: 'Perfil é obrigatório.' }),
});

type UserAccessFormData = z.infer<typeof userAccessSchema>;

export default function CadastroAcessoPage() {
  const { toast } = useToast();
  const { user, users: allUsersFromAuth, addUser, updateUser, findUserByLogin } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.' });
      router.replace('/dashboard');
    }
  }, [user, router, toast]);

  const form = useForm<UserAccessFormData>({
    resolver: zodResolver(userAccessSchema),
    defaultValues: {
      name: '',
      login: '',
      password: '',
      role: 'user',
    },
  });

  useEffect(() => {
    if (editingUser) {
      form.reset({
        name: editingUser.name,
        login: editingUser.login,
        password: '', // Password should be re-entered for security or handled differently
        role: editingUser.role,
      });
      setShowForm(true);
    } else {
        form.reset({ name: '', login: '', password: '', role: 'user' });
    }
  }, [editingUser, form]);

  const onSubmit = (data: UserAccessFormData) => {
    if (editingUser) {
      // Update existing user
      const updatedUserData: User = {
        ...editingUser,
        name: data.name,
        login: data.login,
        // Password update logic: only if provided
        ...(data.password && { password: data.password }), 
        role: data.role as UserRole,
      };
      const success = updateUser(updatedUserData);
      if (success) {
        toast({ title: 'Usuário Atualizado!', description: `Usuário ${data.login} foi atualizado.` });
      } else {
        // This case might not happen with current simple updateUser logic
        toast({ variant: "destructive", title: 'Erro ao Atualizar', description: `Não foi possível atualizar o usuário ${data.login}.` });
      }
      setEditingUser(null);
    } else {
      // Add new user
      if (findUserByLogin(data.login)) {
        form.setError("login", {type: "manual", message: "Este login já está em uso."});
        toast({ variant: 'destructive', title: 'Erro de Cadastro', description: 'Login já existe. Escolha outro.' });
        return;
      }
      const newUser: User = {
        id: Date.now().toString(), // Simple ID for demo
        name: data.name,
        login: data.login,
        password: data.password,
        role: data.role as UserRole,
      };
      const success = addUser(newUser);
      if(success) {
        toast({ title: 'Usuário Cadastrado!', description: `Usuário ${data.login} foi criado com sucesso.` });
      } else {
        toast({ variant: 'destructive', title: 'Erro de Cadastro', description: 'Login já existe. Escolha outro.' });
      }
    }
    setShowForm(false);
    form.reset({ name: '', login: '', password: '', role: 'user' });
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
  };
  
  // Admin cannot delete self. Implement deleteUser in AuthContext if needed.
  // For now, delete is not implemented.

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto py-8 text-center">
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
    <div className="container mx-auto py-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold text-primary font-headline">Gerenciamento de Acesso</h1>
            <p className="text-muted-foreground">Adicione, edite ou visualize usuários do sistema.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingUser(null); setShowForm(!showForm); }} className="mt-4 sm:mt-0">
          <UserPlus className="mr-2 h-4 w-4" /> {showForm ? 'Cancelar Cadastro' : 'Novo Usuário'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">{editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</CardTitle>
            <CardDescription>{editingUser ? 'Altere os dados do usuário abaixo.' : 'Preencha os dados para criar um novo acesso.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Maria Souza" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="login" render={({ field }) => ( <FormItem><FormLabel>Login de Acesso</FormLabel><FormControl><Input placeholder="Ex: maria.souza" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" {...field} />
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
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Perfil de Acesso</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {setShowForm(false); setEditingUser(null);}}>Cancelar</Button>
                  <Button type="submit">{editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsersFromAuth.length > 0 ? (
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
                {allUsersFromAuth.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.login}</TableCell>
                    <TableCell><span className={`px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}>{u.role === 'admin' ? 'Admin' : 'Usuário'}</span></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} title="Editar">
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      {/* Admin cannot delete self, and delete logic is not fully implemented in AuthContext for this scope */}
                       {user?.login !== u.login && (
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Excluir" disabled={true}> {/* Disabled for now */}
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir o usuário {u.name}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => {/* TODO: Implement deleteUser(u.id) in AuthContext */ toast({title: "Exclusão não implementada."})}} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhum usuário cadastrado além do administrador padrão.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
