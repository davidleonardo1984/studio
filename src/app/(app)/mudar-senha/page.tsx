
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MudarSenhaPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center mb-2">
            <ShieldAlert className="h-8 w-8 text-destructive mr-3" />
            <CardTitle className="text-2xl font-bold text-primary font-headline">Função Indisponível</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
              <p className="text-muted-foreground mb-6">
                Por motivos de segurança, a funcionalidade de alterar senha foi desabilitada nesta versão de demonstração.
                Uma implementação segura requer um backend para gerenciar as credenciais dos usuários.
              </p>
              <Button onClick={() => router.back()}>
                Voltar
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
