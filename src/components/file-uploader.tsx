"use client";

import { UploadCloud } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

export function FileUploader({ onUpload, disabled }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Arquivo inválido',
            description: 'Por favor, envie apenas arquivos no formato .xml.',
        });
        return;
      }
      
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      try {
        await onUpload(acceptedFiles);
      } catch (err) {
        console.error(err);
        toast({
            variant: "destructive",
            title: "Falha ao processar",
            description: "Não foi possível importar um ou mais XMLs.",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'text/plain': ['.xml'],
     },
    disabled: isUploading || disabled,
  });

  const isDisabled = isUploading || disabled;

  return (
    <Card className={cn('h-full', isDisabled && 'opacity-50 cursor-not-allowed')}>
      <CardContent className="p-6 h-full">
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed border-border transition-colors',
            !isDisabled && 'cursor-pointer hover:bg-muted',
            isDragActive && !isDisabled && 'bg-muted border-primary'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              {isUploading
                ? 'Processando...'
                : 'Importar arquivos XML'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isDragActive
                ? 'Solte os arquivos aqui...'
                : 'Arraste e solte ou clique para selecionar'}
            </p>
             <p className="mt-2 text-xs text-muted-foreground">
              (Apenas arquivos .xml)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
