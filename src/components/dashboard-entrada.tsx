"use client";

import { useState, useMemo, useEffect } from 'react';
import type { NFe } from '@/lib/data';
import { SummaryCardsEntrada } from './summary-cards-entrada';
import { InvoiceTableEntrada } from './invoice-table-entrada';
import { FilterControls, type Filters } from './filter-controls';
import { FileUploader } from './file-uploader';
import { useToast } from '@/hooks/use-toast';
import { processNFeXML } from '@/lib/xml-parser';

export function DashboardEntrada() {
  const [invoices, setInvoices] = useState<NFe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    client: '',
    status: 'all',
    month: undefined,
    cfop: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setIsLoading(true);
    toast({
      title: 'Processando arquivos...',
      description: 'Aguarde enquanto os arquivos XML são validados.',
    });
  
    try {
      const nfeById = new Map<string, NFe>();
      const cancelKeys: string[] = [];
  
      for (const file of files) {
        const xmlText = await file.text();
        const parsed = processNFeXML(xmlText);
        if (!parsed) continue;
  
        if (parsed.kind === "nfe") {
          nfeById.set(parsed.nfe.id, parsed.nfe);
        } else if (parsed.kind === "cancelamento") {
          cancelKeys.push(parsed.chave);
        }
      }
  
      // Aplica cancelamentos a notas que serão adicionadas
      for (const chave of cancelKeys) {
        const n = nfeById.get(chave);
        if (n) {
          n.situacao = "Cancelada";
          n.valorTotal = 0;
          n.baseCalculoICMS = 0;
          n.valorICMS = 0;
        }
      }
      
      const newInvoices = Array.from(nfeById.values());

      if (newInvoices.length === 0 && files.length > 0 && cancelKeys.length === 0) {
        throw new Error("Nenhuma nota fiscal válida foi encontrada nos arquivos processados.");
      }
  
      setInvoices(prevInvoices => {
        const combined = new Map(prevInvoices.map(inv => [inv.id, inv]));
        newInvoices.forEach(inv => {
             combined.set(inv.id, inv);
        });

        // Aplica cancelamentos a notas que já estavam na lista antes do upload
        cancelKeys.forEach(key => {
            const existing = combined.get(key);
            if (existing) {
                existing.situacao = "Cancelada";
                existing.valorTotal = 0;
                existing.baseCalculoICMS = 0;
                existing.valorICMS = 0;
            }
        });

        return Array.from(combined.values());
      });
  
      toast({
        title: 'Importação Concluída!',
        description: `Processamento de ${files.length} arquivos finalizado.`,
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
      const { client, status, month, cfop } = filters;
      const invoiceDate = new Date(invoice.dataEmissao);

      const clientMatch = client
        ? invoice.emitente.nome.toLowerCase().includes(client.toLowerCase())
        : true;
      const statusMatch = status !== 'all' ? invoice.situacao === status : true;

      const monthMatch = month
        ? invoiceDate.getFullYear() === month.getFullYear() && invoiceDate.getMonth() === month.getMonth()
        : true;

      const cfopMatch = cfop ? invoice.cfop.toString().startsWith(cfop) : true;

      return clientMatch && statusMatch && monthMatch && cfopMatch;
    });
  }, [invoices, filters]);

  return (
    <div className="space-y-6">
      <SummaryCardsEntrada invoices={filteredInvoices} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <FileUploader onUpload={handleFileUpload} disabled={isLoading}/>
        </div>
        <div className="lg:col-span-2">
             <FilterControls filters={filters} onFilterChange={setFilters} />
        </div>
      </div>
     
      <InvoiceTableEntrada invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
