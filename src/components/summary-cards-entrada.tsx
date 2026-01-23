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

// Lista de CFOPs que caracterizam Compra
const PURCHASE_CFOPS = [
    // Compras para Industrialização, Produção Rural, Comercialização ou Prestação de Serviços
    1101, 1102, 1111, 1113, 1116, 1117, 1118, 1120, 1121, 1122, 1124, 1125, 1126, 1128,
    2101, 2102, 2111, 2113, 2116, 2117, 2118, 2120, 2121, 2122, 2124, 2125, 2126, 2128,
    // Compras para Ativo Imobilizado e Uso/Consumo
    1551, 1556, 2551, 2556,
    // Compras com ST
    1401, 1403, 1407, 2401, 2403, 2407
];

export function SummaryCardsEntrada({ invoices }: SummaryCardsProps) {
  const summary = useMemo(() => {
    const authorizedInvoices = invoices.filter(
      (invoice) => invoice.situacao === 'Autorizada'
    );
    
    // Total Comprado considera apenas notas autorizadas de compra (não devoluções)
    const totalPurchased = authorizedInvoices.reduce((sum, inv) => {
        const isPurchase = PURCHASE_CFOPS.includes(inv.cfop);
        if (isPurchase && inv.finalidade !== 'Devolução') {
            return sum + inv.valorTotal;
        }
        return sum;
    }, 0);

    // O total de impostos (crédito) considera todas as entradas autorizadas
    const totalTaxesCredit = authorizedInvoices.reduce( (sum, inv) => {
        return sum + inv.valorICMS;
    }, 0);

    return {
      totalPurchased,
      totalTaxesCredit,
      receivedCount: authorizedInvoices.filter(inv => inv.finalidade !== 'Devolução').length,
      salesReturnCount: authorizedInvoices.filter(inv => inv.finalidade === 'Devolução').length,
      hasData: invoices.length > 0,
    };
  }, [invoices]);

  const cards = [
    {
      title: 'Total Comprado',
      getValue: () => formatCurrency(summary.totalPurchased),
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Crédito de Impostos (ICMS)',
      getValue: () => formatCurrency(summary.totalTaxesCredit),
      icon: Percent,
      color: 'text-blue-600'
    },
    {
      title: 'Notas Recebidas',
      getValue: () => summary.receivedCount.toLocaleString('pt-BR'),
      icon: FileText,
      color: 'text-slate-600'
    },
    {
      title: 'Devoluções de Venda',
      getValue: () => summary.salesReturnCount.toLocaleString('pt-BR'),
      icon: FileX,
      color: 'text-orange-600'
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
