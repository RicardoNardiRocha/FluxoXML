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
    month: undefined,
    cfop: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setIsLoading(true);
    toast({ title: 'Processando arquivos...', description: 'Aguarde enquanto os arquivos XML são validados.' });

    try {
      const nfeById = new Map<string, NFe>();
      const cancelKeys: string[] = [];

      let ignoredEntrada = 0;
      let ignoredTerceiro = 0;

      for (const file of files) {
        const xmlText = await file.text();
        // Para o livro de saída, não precisamos passar os CNPJ/CPF da empresa.
        // O parser vai identificar a perspectiva baseado no tipo da nota (tpNF).
        const parsed = processNFeXML(xmlText);
        if (!parsed) continue;

        if (parsed.kind === "nfe") {
          if (parsed.meta.perspectiva !== "saida") {
            if (parsed.meta.perspectiva === "entrada") ignoredEntrada++;
            else ignoredTerceiro++;
            continue;
          }
          nfeById.set(parsed.nfe.id, parsed.nfe);
        } else if (parsed.kind === "cancelamento") {
          cancelKeys.push(parsed.chave);
        }
      }

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
        toast({
          variant: 'destructive',
          title: 'Nenhuma nota de saída encontrada',
          description: 'Os arquivos importados não parecem ser notas de saída (venda/devolução de compra).',
        });
      }

      setInvoices(prev => {
        const combined = new Map(prev.map(inv => [inv.id, inv]));
        newInvoices.forEach(inv => combined.set(inv.id, inv));

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

      if (newInvoices.length > 0 || cancelKeys.length > 0) {
        toast({
          title: 'Importação Concluída!',
          description: `Arquivos: ${files.length}. Ignoradas: ${ignoredEntrada} (entrada) e ${ignoredTerceiro} (terceiros).`,
          variant: 'success',
        });
      }
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

  const handleClearAll = () => {
    setInvoices([]);
    setFilters({ client: '', status: 'all', month: undefined, cfop: '' });
    toast({ title: 'Tudo limpo!', description: 'Você pode iniciar uma nova importação de arquivos XML.', variant: 'success' });
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const { client, status, month, cfop } = filters;
      const invoiceDate = new Date(invoice.dataEmissao);

      const clientMatch = client ? invoice.destinatario.nome.toLowerCase().includes(client.toLowerCase()) : true;
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
      <SummaryCards invoices={filteredInvoices} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <FileUploader onUpload={handleFileUpload} disabled={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <FilterControls filters={filters} onFilterChange={setFilters} onClearAll={handleClearAll} />
        </div>
      </div>

      <InvoiceTable invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
