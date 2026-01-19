"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NFe } from '@/lib/data';
import { DollarSign, FileText, FileX, Percent } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface SummaryCardsProps {
  invoices: NFe[];
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

// Lista de CFOPs que caracterizam Venda de produto ou serviço.
// Isso evita que Remessas, Devoluções de Compra, etc., sejam somadas como faturamento.
const SALE_CFOPS = [
    // Vendas de Produção do Estabelecimento
    5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110,
    6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110,
    // Vendas de Mercadorias Adquiridas ou Recebidas de Terceiros
    5111, 5112, 5113, 5114, 5115, 5116, 5117, 5118, 5119, 5120, 5122, 5123, 5124, 5125,
    6111, 6112, 6113, 6114, 6115, 6116, 6117, 6118, 6119, 6120, 6122, 6123, 6124, 6125,
    // Vendas com Substituição Tributária
    5401, 5402, 5403, 5405,
    6401, 6402, 6403, 6404,
    // Vendas de Combustíveis ou Lubrificantes
    5651, 5652, 5653, 5654, 5655, 5656,
    6651, 6652, 6653, 6654, 6655, 6656,
    // Vendas para Zona Franca de Manaus
    7101, 7102, 7105, 7106, 7127
];

export function SummaryCards({ invoices }: SummaryCardsProps) {
  const summary = useMemo(() => {
    const authorizedInvoices = invoices.filter(
      (invoice) => invoice.situacao === 'Autorizada'
    );
    
    // Total Faturado considera apenas notas autorizadas cujo CFOP é de venda.
    const totalInvoiced = authorizedInvoices.reduce((sum, inv) => {
        const isSale = SALE_CFOPS.includes(inv.cfop);
        if (isSale) {
            return sum + inv.valorTotal;
        }
        return sum;
    }, 0);

    // O total de impostos considera o débito (saídas) e o crédito (devoluções de compra).
    const totalTaxes = authorizedInvoices.reduce( (sum, inv) => {
        // Para devoluções de compra (que são notas de saída), o ICMS é um crédito.
        if (inv.finalidade === 'Devolução') {
            return sum - inv.valorICMS;
        }
        return sum + inv.valorICMS;
    }, 0);

    return {
      totalInvoiced,
      totalTaxes,
      issuedCount: authorizedInvoices.length,
      canceledCount: invoices.filter(inv => inv.situacao === 'Cancelada').length,
      hasData: invoices.length > 0,
    };
  }, [invoices]);

  const cards = [
    {
      title: 'Total Faturado (Vendas)',
      getValue: () => formatCurrency(summary.totalInvoiced),
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Impostos (ICMS)',
      getValue: () => formatCurrency(summary.totalTaxes),
      icon: Percent,
      color: 'text-blue-600'
    },
    {
      title: 'Notas Emitidas',
      getValue: () => summary.issuedCount.toLocaleString('pt-BR'),
      icon: FileText,
      color: 'text-slate-600'
    },
    {
      title: 'Notas Canceladas',
      getValue: () => summary.canceledCount.toLocaleString('pt-BR'),
      icon: FileX,
      color: 'text-red-600'
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
          </CardHeader>
          <CardContent>
            {summary.hasData ? (
                <div className="text-2xl font-bold">{card.getValue()}</div>
            ) : (
                <Skeleton className="h-8 w-3/4" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
