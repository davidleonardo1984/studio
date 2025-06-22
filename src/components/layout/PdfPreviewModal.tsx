
"use client";

import React, { useRef, useEffect } from 'react';
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

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
}

export function PdfPreviewModal({ isOpen, onClose, pdfUrl }: PdfPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus(); // Focus on the iframe
      iframeRef.current.contentWindow.print(); // Trigger print dialog
    } else {
      console.error("Iframe content window not available for printing.");
      // Potentially show a toast error here
    }
  };

  // Effect to handle Escape key for closing, consistent with Dialog behavior
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

  if (!isOpen || !pdfUrl) {
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
        <div className="flex-grow p-4 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0`}
            title="Pré-visualização do PDF"
            className="w-full h-full border-0"
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
