"use client";

import { useState, useMemo, useEffect } from 'react';
import type { NFe } from '@/lib/data';
import { SummaryCards } from './summary-cards';
import { InvoiceTable } from './invoice-table';
import { FilterControls, type Filters } from './filter-controls';
import { FileUploader } from './file-uploader';
import { useToast } from '@/hooks/use-toast';
import { processNFeXML } from '@/lib/xml-parser';

export function Dashboard() {
  const [invoices, setInvoices] = useState<NFe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    client: '',
    status: 'all',
    dateRange: { from: undefined, to: undefined },
  });
  const { toast } = useToast();

  useEffect(() => {
    // No longer fetching mock data, start with empty state
    setIsLoading(false);
  }, []);

  const handleFileUpload = async (files: File[]) => {
    toast({
      title: 'Processando arquivos...',
      description: 'Aguarde enquanto os arquivos XML são validados.',
    });
    setIsLoading(true);

    try {
      const parsingPromises = files.map(file => {
        return new Promise<NFe | null>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const xmlText = reader.result as string;
              const nfeData = processNFeXML(xmlText);
              resolve(nfeData);
            } catch (e) {
              console.error(`Erro ao processar o arquivo ${file.name}:`, e);
              resolve(null); // Resolve with null for failed files
            }
          };
          reader.onerror = (error) => {
            console.error(`Erro ao ler o arquivo ${file.name}:`, error);
            reject(error);
          };
          reader.readAsText(file);
        });
      });

      const results = await Promise.all(parsingPromises);
      const newInvoices = results.filter(nfe => nfe !== null) as NFe[];
      
      if (newInvoices.length === 0 && files.length > 0) {
        throw new Error("Nenhuma nota fiscal válida foi encontrada nos arquivos processados.");
      }

      // Avoid duplicates based on invoice ID
      setInvoices(prevInvoices => {
        const existingIds = new Set(prevInvoices.map(inv => inv.id));
        const uniqueNewInvoices = newInvoices.filter(inv => !existingIds.has(inv.id));
        return [...prevInvoices, ...uniqueNewInvoices];
      });

      toast({
        title: 'Importação Concluída!',
        description: `${newInvoices.length} de ${files.length} arquivos processados com sucesso.`,
        variant: 'success',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na importação',
        description: error.message || 'Ocorreu um erro ao processar os arquivos XML.',
      });
    } finally {
      setIsLoading(false);
    }
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
            <FileUploader onUpload={handleFileUpload} disabled={isLoading}/>
        </div>
        <div className="lg:col-span-2">
             <FilterControls filters={filters} onFilterChange={setFilters} />
        </div>
      </div>
     
      <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
