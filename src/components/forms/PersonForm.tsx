
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Driver, NewDriver } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { format, parse, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// ====================================================================================
// 1. ESQUEMA DE VALIDAÇÃO (ZOD)
//    - Este é o schema do Zod que define as regras do formulário.
//    - O `superRefine` adiciona lógicas de validação mais complexas.
// ====================================================================================
const personSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório (mín. 3 caracteres).'),
  cpf: z.string(),
  cnh: z.string().optional(),
  cnhExpirationDate: z.string().optional(),
  phone: z.string().optional(),
  isBlocked: z.boolean().default(false).optional(),
  isForeigner: z.boolean().default(false).optional(),
}).superRefine((data, ctx) => {
    if (data.cnh && data.cnh.trim() !== '') {
        if (!data.cnhExpirationDate || data.cnhExpirationDate.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vencimento da CNH é obrigatório quando a CNH é preenchida.',
                path: ['cnhExpirationDate'],
            });
        }
    }
    if (!data.isForeigner) {
        if (!data.cpf || data.cpf.length !== 11) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'CPF deve ter 11 dígitos.',
                path: ['cpf'],
            });
        } else if (!/^\d+$/.test(data.cpf)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'CPF deve conter apenas números.',
                path: ['cpf'],
            });
        }
    }
});
type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  editingItem?: Driver | null;
  onSuccess: () => void;
  onCancel?: () => void;
  allPersons: Driver[];
}

// ====================================================================================
// 2. COMPONENTE DO FORMULÁRIO (PersonForm)
//    - Este é o componente React que contém toda a lógica do formulário de pessoa.
//    - Ele recebe `editingItem` (para saber se está editando ou criando), `onSuccess` 
//      (para notificar o componente pai quando o cadastro for bem-sucedido) e
//      `onCancel` (para fechar o formulário/modal).
// ====================================================================================
export function PersonForm({ editingItem, onSuccess, onCancel, allPersons }: PersonFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: { name: '', cpf: '', cnh: '', cnhExpirationDate: '', phone: '', isBlocked: false, isForeigner: false },
  });
  
  const { watch, setValue } = form;
  const isForeigner = watch('isForeigner');

  useEffect(() => {
    if (isForeigner) {
      setValue('cpf', '');
      form.clearErrors('cpf');
    }
  }, [isForeigner, form, setValue]);

  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name,
        cpf: editingItem.cpf,
        cnh: editingItem.cnh ?? '',
        cnhExpirationDate: editingItem.cnhExpirationDate || '',
        phone: editingItem.phone || '',
        isBlocked: editingItem.isBlocked || false,
        isForeigner: editingItem.isForeigner || false
      });
    } else {
      form.reset({ name: '', cpf: '', cnh: '', cnhExpirationDate: '', phone: '', isBlocked: false, isForeigner: false });
    }
  }, [editingItem, form]);

  // ====================================================================================
  // 3. LÓGICA DE SUBMISSÃO (onSubmit)
  //    - Aqui é onde os dados são validados e salvos no banco de dados.
  //    - Para migrar para PostgreSQL, você substituiria as chamadas do Firestore
  //      (`addDoc`, `updateDoc`) por chamadas à sua API que se comunica com o Postgre.
  //    - O `onSuccess()` é chamado no final para que a página que usa este formulário
  //      possa atualizar sua lista de pessoas.
  // ====================================================================================
  const onSubmit = async (formData: PersonFormData) => {
    setIsSubmitting(true);
    try {
        if (!db) throw new Error("Firebase não configurado");

        if (!formData.isForeigner) {
            const isDuplicateCpf = allPersons.some(p => p.cpf === formData.cpf && p.id !== editingItem?.id);
            if (isDuplicateCpf) {
                form.setError("cpf", { type: "manual", message: "Este CPF já está cadastrado." });
                setIsSubmitting(false);
                return;
            }
        }

        const isDuplicateName = allPersons.some(p => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && p.id !== editingItem?.id);
        if (isDuplicateName) {
            form.setError("name", { type: "manual", message: "Este nome já está cadastrado." });
            setIsSubmitting(false);
            return;
        }

        const dataToSave: Partial<Driver> = { ...formData, cnhExpirationDate: formData.cnhExpirationDate || '' };
        if(formData.isForeigner) { dataToSave.cpf = ''; }

        if (editingItem) {
            const itemDoc = doc(db, 'persons', editingItem.id);
            await updateDoc(itemDoc, dataToSave);
            toast({ title: "Pessoa atualizada!", description: `${formData.name} foi atualizado com sucesso.` });
        } else {
            await addDoc(collection(db, 'persons'), dataToSave);
            toast({ title: "Pessoa cadastrada!", description: `${formData.name} foi cadastrado com sucesso.` });
        }
        
        onSuccess(); // Notifica o componente pai sobre o sucesso
        form.reset();

    } catch (error) {
        console.error("Error saving person:", error);
        toast({ variant: 'destructive', title: "Erro", description: "Não foi possível salvar a pessoa." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
      let rawValue = e.target.value.replace(/\D/g, "");
      if (rawValue.length > 11) { rawValue = rawValue.substring(0, 11); }
      fieldOnChange(rawValue);
  };
  
  const formatDisplayPhoneNumber = (val: string): string => {
      if (typeof val !== 'string' || !val) return "";
      const digits = val.replace(/\D/g, "");
      if (digits.length === 0) return "";
      let formatted = `(${digits.substring(0, 2)}`;
      if (digits.length > 2) {
          const end = digits.length === 11 ? 7 : 6;
          formatted += `) ${digits.substring(2, end)}`;
          if (digits.length > 6) { formatted += `-${digits.substring(end, 11)}`; }
      }
      return formatted;
  };

  // ====================================================================================
  // 4. ESTRUTURA JSX DO FORMULÁRIO
  //    - Este é o HTML (JSX) do formulário, usando os componentes do ShadCN.
  //    - Ele não precisa ser alterado para a migração de banco de dados.
  // ====================================================================================
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: Carlos Alberto" {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="cpf" render={({ field }) => ( <FormItem><FormLabel>CPF (apenas números)</FormLabel><FormControl><Input placeholder="12345678900" {...field} value={isForeigner ? "ESTRANGEIRO" : field.value} maxLength={11} autoComplete="off" disabled={isForeigner} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="cnh" render={({ field }) => ( <FormItem><FormLabel>CNH (Opcional)</FormLabel><FormControl><Input placeholder="Número da CNH" {...field} value={field.value ?? ''} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
           <FormField control={form.control} name="cnhExpirationDate" render={({ field }) => (<FormItem className="flex flex-col justify-end"><FormLabel>Vencimento CNH</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone (Opcional)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} value={formatDisplayPhoneNumber(field.value || "")} onChange={(e) => handlePhoneChange(e, field.onChange)} type="tel" autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="isForeigner" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                    <div className="space-y-0.5"><FormLabel>Estrangeiro</FormLabel><FormDescription>Marque se a pessoa não possuir CPF.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Estrangeiro" /></FormControl>
                </FormItem>
            )} />
            {editingItem && (
                <FormField control={form.control} name="isBlocked" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                        <div className="space-y-0.5"><FormLabel>Bloquear Acesso</FormLabel><FormDescription>Impedir novas entradas.</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Bloquear Acesso" /></FormControl>
                    </FormItem>
                )} />
            )}
        </div>
        <div className="flex justify-end gap-2 pt-4">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? 'Salvar Alterações' : 'Cadastrar Pessoa'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
