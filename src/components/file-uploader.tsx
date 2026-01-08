"use client";

import { UploadCloud } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onUpload: () => void;
}

export function FileUploader({ onUpload }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setIsUploading(true);
        // Simulate upload and processing
        setTimeout(() => {
          onUpload();
          setIsUploading(false);
        }, 1000);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/xml': ['.xml'] },
    disabled: isUploading,
  });

  return (
    <Card className={cn('h-full', isUploading && 'opacity-50 cursor-not-allowed')}>
      <CardContent className="p-6 h-full">
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center w-full h-full rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted transition-colors',
            isDragActive && 'bg-muted border-primary'
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
