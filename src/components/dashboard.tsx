"use client";

import { useState, useMemo, useEffect } from 'react';
import type { NFe } from '@/lib/data';
import { mockInvoices } from '@/lib/data';
import { SummaryCards } from './summary-cards';
import { InvoiceTable } from './invoice-table';
import { FilterControls, type Filters } from './filter-controls';
import { FileUploader } from './file-uploader';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const [invoices, setInvoices] = useState<NFe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    client: '',
    status: 'all',
    dateRange: { from: undefined, to: undefined },
  });
  const { toast } = useToast();

  useEffect(() => {
    // Simulate initial data fetch
    setTimeout(() => {
      setInvoices(mockInvoices);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleFileUpload = () => {
    toast({
      title: 'Processando arquivos...',
      description: 'Aguarde enquanto os arquivos XML são validados.',
    });
    setIsLoading(true);
    setTimeout(() => {
      // Simulate adding new invoices without duplication
      const newInvoices = [
        ...invoices,
        {
          id: 'new-key-' + Date.now(),
          numero: 201,
          serie: 1,
          dataEmissao: new Date().toISOString().split('T')[0],
          destinatario: { nome: 'Nova Empresa Web' },
          cfop: 5102,
          situacao: 'Autorizada',
          valorTotal: 1999.99,
          baseCalculoICMS: 1999.99,
          valorICMS: 239.99,
        },
      ] as NFe[];
      setInvoices(newInvoices);
      setIsLoading(false);
      toast({
        title: 'Importação Concluída!',
        description: 'Novas notas foram adicionadas ao livro fiscal.',
        variant: 'success',
      });
    }, 2500);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const { client, status, dateRange } = filters;
      const invoiceDate = new Date(invoice.dataEmissao);

      const clientMatch = client
        ? invoice.destinatario.nome.toLowerCase().includes(client.toLowerCase())
        : true;
      const statusMatch = status !== 'all' ? invoice.situacao === status : true;
      const dateMatch =
        (dateRange.from ? invoiceDate >= dateRange.from : true) &&
        (dateRange.to ? invoiceDate <= dateRange.to : true);

      return clientMatch && statusMatch && dateMatch;
    });
  }, [invoices, filters]);

  return (
    <div className="space-y-6">
      <SummaryCards invoices={filteredInvoices} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <FileUploader onUpload={handleFileUpload} />
        </div>
        <div className="lg:col-span-2">
             <FilterControls filters={filters} onFilterChange={setFilters} />
        </div>
      </div>
     
      <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
