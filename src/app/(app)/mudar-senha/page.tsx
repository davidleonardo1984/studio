
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
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Senha atual é obrigatória.' }),
  newPassword: z.string().min(6, { message: 'Nova senha deve ter no mínimo 6 caracteres.' }),
  confirmPassword: z.string().min(1, { message: 'Confirmação de senha é obrigatória.' }),
})
.refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})
.refine(data => data.currentPassword !== data.newPassword, {
    message: 'Nova senha deve ser diferente da senha atual.',
    path: ['newPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function MudarSenhaPage() {
  const { user, changePassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    setIsSubmitting(true);

    const result = await changePassword(user.id, data.currentPassword, data.newPassword);

    if (result.success) {
      toast({ title: 'Senha Alterada!', description: result.message });
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Erro ao Alterar Senha', description: result.message });
      if (result.message.includes("atual incorreta")) {
        form.setError("currentPassword", { type: "manual", message: result.message });
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center mb-2">
            <KeyRound className="h-8 w-8 text-primary mr-3" />
            <CardTitle className="text-2xl font-bold text-primary font-headline">Mudar Senha</CardTitle>
          </div>
          <CardDescription>Atualize sua senha de acesso ao sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <div className="relative">
                        <FormControl>
                        <Input type={showCurrentPassword ? "text" : "password"} placeholder="Digite sua senha atual" {...field} noAutoUppercase={true} />
                        </FormControl>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                     <div className="relative">
                        <FormControl>
                        <Input type={showNewPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" {...field} noAutoUppercase={true} />
                        </FormControl>
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="sr-only">{showNewPassword ? "Ocultar senha" : "Mostrar senha"}</span>
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                     <div className="relative">
                        <FormControl>
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="Repita a nova senha" {...field} noAutoUppercase={true} />
                        </FormControl>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="sr-only">{showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}</span>
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
