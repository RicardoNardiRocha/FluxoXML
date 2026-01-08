"use client";

import type { NFe } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { MoreHorizontal, Download, FileSearch, ArrowLeft, ArrowRight, FileX } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface InvoiceTableProps {
  invoices: NFe[];
  isLoading: boolean;
}

const ITEMS_PER_PAGE = 8;

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);

  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Detalhes das Notas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lista detalhada de todas as notas fiscais importadas.
            </p>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar Livro
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Nº Nota</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">CFOP</TableHead>
                <TableHead className="text-center">Data Emissão</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="w-[50px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className={cn(invoice.situacao === 'Cancelada' && 'text-muted-foreground')}>
                    <TableCell className="font-medium">{invoice.numero}-{invoice.serie}</TableCell>
                    <TableCell>{invoice.destinatario.nome}</TableCell>
                    <TableCell className="text-center">{invoice.cfop}</TableCell>
                    <TableCell className="text-center">{formatDate(invoice.dataEmissao)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={invoice.situacao === 'Autorizada' ? 'success' : 'destructive'}>
                        {invoice.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.valorTotal)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <FileSearch className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar XML
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileX className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">Nenhuma nota encontrada.</p>
                      <p className="text-sm text-muted-foreground">Ajuste os filtros ou importe novos arquivos XML.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
         <div className="text-sm text-muted-foreground">
          {invoices.length > 0 ? `Exibindo ${paginatedInvoices.length} de ${invoices.length} notas.` : 'Nenhuma nota para exibir.'}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm font-medium">
            Página {totalPages > 0 ? currentPage : 0} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
