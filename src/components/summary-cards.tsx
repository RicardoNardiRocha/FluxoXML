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

export function SummaryCards({ invoices }: SummaryCardsProps) {
  const summary = useMemo(() => {
    const authorizedInvoices = invoices.filter(
      (invoice) => invoice.situacao === 'Autorizada'
    );
    const canceledInvoices = invoices.filter(
      (invoice) => invoice.situacao === 'Cancelada'
    );

    const totalInvoiced = authorizedInvoices.reduce(
      (sum, inv) => sum + inv.valorTotal,
      0
    );
    const totalTaxes = authorizedInvoices.reduce(
      (sum, inv) => sum + inv.valorICMS,
      0
    );

    return {
      totalInvoiced,
      totalTaxes,
      issuedCount: authorizedInvoices.length,
      canceledCount: canceledInvoices.length,
    };
  }, [invoices]);

  const cards = [
    {
      title: 'Total Faturado',
      value: formatCurrency(summary.totalInvoiced),
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Impostos (ICMS)',
      value: formatCurrency(summary.totalTaxes),
      icon: Percent,
      color: 'text-blue-600'
    },
    {
      title: 'Notas Emitidas',
      value: summary.issuedCount.toLocaleString('pt-BR'),
      icon: FileText,
      color: 'text-slate-600'
    },
    {
      title: 'Notas Canceladas',
      value: summary.canceledCount.toLocaleString('pt-BR'),
      icon: FileX,
      color: 'text-red-600'
    },
  ];

  if (!invoices.length) {
     return (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             {cards.map(card => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-8 w-3/4" />
                    </CardContent>
                </Card>
             ))}
         </div>
     )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
