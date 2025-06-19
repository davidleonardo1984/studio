
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export default function MudarSenhaPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center mb-2">
            <KeyRound className="h-8 w-8 text-primary mr-3" />
            <CardTitle className="text-2xl font-bold text-primary font-headline">Mudar Senha</CardTitle>
          </div>
          <CardDescription>Atualize sua senha de acesso ao sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <p className="text-muted-foreground text-lg">
              A funcionalidade de mudança de senha está em desenvolvimento.
            </p>
            <p className="text-muted-foreground mt-2">
              Em breve você poderá alterar sua senha por aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
