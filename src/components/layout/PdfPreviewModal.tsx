
"use client";

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PrinterIcon, XIcon } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export function DocumentPreviewModal({ isOpen, onClose, imageUrl }: DocumentPreviewModalProps) {

  const handlePrint = () => {
    if (!imageUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Documento</title>
            <style>
              @media print {
                @page { size: portrait; margin: 0; }
                body { margin: 0; }
                img { width: 100%; object-fit: contain; }
              }
              body { margin: 0; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" onload="window.print(); setTimeout(function(){window.close();}, 100);" />
          </body>
        </html>
      `);
      printWindow.document.close();
      onClose(); // Close the modal immediately after opening the print dialog
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            Pré-visualização do Documento
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <XIcon className="h-5 w-5" />
                <span className="sr-only">Fechar</span>
              </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-grow p-4 overflow-auto bg-gray-200 flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Pré-visualização do Romaneio"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <DialogFooter className="p-4 border-t gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handlePrint}>
            <PrinterIcon className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
