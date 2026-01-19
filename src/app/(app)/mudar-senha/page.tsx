"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Senha atual é obrigatória.' }),
  newPassword: z.string().min(6, { message: 'Nova senha deve ter no mínimo 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'], 
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function MudarSenhaPage() {
  const router = useRouter();
  const { user, changePassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPasswords, setShowNewPasswords] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { control, setFocus, handleSubmit } = form;

  const onSubmit = async (data: ChangePasswordFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você não está logado.' });
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(user.id, data.currentPassword, data.newPassword);
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: 'Sucesso!', description: 'Sua senha foi alterada com sucesso.' });
      form.reset();
      router.push('/dashboard'); 
    } else {
      toast({ variant: 'destructive', title: 'Falha na alteração', description: result.message });
      form.resetField('currentPassword');
    }
  };
  
  return (
    <div className="container mx-auto pt-4 pb-8">
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center mb-2">
            <KeyRound className="h-8 w-8 text-primary mr-3" />
            <CardTitle className="text-2xl font-bold text-primary font-headline">Mudar Senha</CardTitle>
          </div>
          <CardDescription>
            Para sua segurança, informe sua senha atual e a nova senha desejada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={control}
                  name="currentPassword"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Senha Atual</FormLabel>
                          <div className="relative">
                              <FormControl>
                                  <Input 
                                    type={showCurrentPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    {...field} 
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setFocus('newPassword');
                                      }
                                    }}
                                    noAutoUppercase={true} 
                                  />
                              </FormControl>
                              <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                                  tabIndex={-1}
                              >
                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  <span className="sr-only">{showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}</span>
                              </Button>
                          </div>
                          <FormMessage />
                      </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="newPassword"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Nova Senha</FormLabel>
                          <div className="relative">
                              <FormControl>
                                  <Input 
                                    type={showNewPasswords ? "text" : "password"} 
                                    placeholder="Mínimo 6 caracteres"
                                    {...field} 
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setFocus('confirmPassword');
                                      }
                                    }}
                                    noAutoUppercase={true} 
                                  />
                              </FormControl>
                              <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => setShowNewPasswords((prev) => !prev)}
                                  tabIndex={-1}
                              >
                                  {showNewPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  <span className="sr-only">{showNewPasswords ? "Ocultar senha" : "Mostrar senha"}</span>
                              </Button>
                          </div>
                          <FormMessage />
                      </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="confirmPassword"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Confirmar Nova Senha</FormLabel>
                          <div className="relative">
                              <FormControl>
                                  <Input 
                                    type={showNewPasswords ? "text" : "password"} 
                                    placeholder="••••••••"
                                    {...field} 
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSubmit(onSubmit)();
                                      }
                                    }}
                                    noAutoUppercase={true} 
                                  />
                              </FormControl>
                              <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => setShowNewPasswords((prev) => !prev)}
                                  tabIndex={-1}
                              >
                                  {showNewPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  <span className="sr-only">{showNewPasswords ? "Ocultar senha" : "Mostrar senha"}</span>
                              </Button>
                          </div>
                          <FormMessage />
                      </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Alterando...</>
                    ) : (
                        "Salvar Nova Senha"
                    )}
                  </Button>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
