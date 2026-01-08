import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { NFe } from './data';

// Augment jsPDF with the autoTable method
declare module 'jspdf' {
    interface jsPDF {
      autoTable: (options: any) => jsPDF;
    }
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export function generateSaidasPDF(invoices: NFe[]) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // --- CABEÇALHO ---
    doc.setFontSize(14).setFont('helvetica', 'bold');
    doc.text('REGISTRO DE SAÍDAS', pageWidth / 2, margin + 10, { align: 'center' });

    const headerInfo = [
        { label: 'FIRMA:', value: 'OSKAR H&M COMERCIO LTDA' },
        { label: 'C.N.P.J.:', value: '55.426.922/0001-57' },
        { label: 'INSCR. EST.:', value: '' },
        { label: 'MÊS OU PERÍODO/ANO:', value: '12/2025' }
    ];

    doc.setFontSize(8).setFont('helvetica', 'normal');
    let yPos = margin + 30;
    headerInfo.forEach(info => {
        doc.text(`${info.label} ${info.value}`, margin, yPos);
        yPos += 12;
    });

    // --- TABELA PRINCIPAL DE NOTAS ---
    const authorizedInvoices = invoices.filter(inv => inv.situacao === 'Autorizada');

    const mainTableHead = [['Espécie', 'Série/Subs.', 'Número', 'Dia', 'UF', 'Valor Contábil', 'Base de Cálculo', 'ICMS', 'Isentas/N.Trib.', 'Outras', 'Observações']];
    const mainTableBody = authorizedInvoices.map(inv => [
        'NFE',
        inv.serie,
        inv.numero,
        formatDate(inv.dataEmissao),
        'SP', // Placeholder, ideal seria extrair do XML se disponível
        formatCurrency(inv.valorTotal),
        formatCurrency(inv.baseCalculoICMS),
        formatCurrency(inv.valorICMS),
        '0,00',
        '0,00',
        ''
    ]);

    doc.autoTable({
        startY: yPos + 5,
        head: mainTableHead,
        body: mainTableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [230, 230, 230],
            textColor: 40,
            fontSize: 7,
            halign: 'center'
        },
        styles: {
            fontSize: 7,
        },
        columnStyles: {
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right' },
            9: { halign: 'right' },
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // --- RESUMO POR CFOP ---
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('RESUMO MENSAL DE OPERAÇÕES E PRESTAÇÃO POR CÓDIGO FISCAL', margin, yPos);
    yPos += 15;

    const cfopSummary: { [key: number]: { valorContabil: number, baseCalculo: number, imposto: number } } = {};
    authorizedInvoices.forEach(inv => {
        if (!cfopSummary[inv.cfop]) {
            cfopSummary[inv.cfop] = { valorContabil: 0, baseCalculo: 0, imposto: 0 };
        }
        cfopSummary[inv.cfop].valorContabil += inv.valorTotal;
        cfopSummary[inv.cfop].baseCalculo += inv.baseCalculoICMS;
        cfopSummary[inv.cfop].imposto += inv.valorICMS;
    });

    const cfopTableHead = [['CÓD. FISC.', 'VLR. CONTÁBIL', 'BASE CÁLC.', 'IMPOSTO', 'ISENTAS', 'OUTRAS']];
    let cfopTableBody: any[] = [];
    let totalContabil = 0, totalBase = 0, totalImposto = 0;

    Object.entries(cfopSummary).forEach(([cfop, values]) => {
        cfopTableBody.push([
            cfop,
            formatCurrency(values.valorContabil),
            formatCurrency(values.baseCalculo),
            formatCurrency(values.imposto),
            '0,00',
            '0,00'
        ]);
        totalContabil += values.valorContabil;
        totalBase += values.baseCalculo;
        totalImposto += values.imposto;
    });

    // Subtotal
    cfopTableBody.push([
        { content: 'SUB TOTAL', styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalContabil), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalBase), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalImposto), styles: { fontStyle: 'bold' } },
        { content: '0,00', styles: { fontStyle: 'bold' } },
        { content: '0,00', styles: { fontStyle: 'bold' } }
    ]);
     // Total Geral
    cfopTableBody.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: formatCurrency(totalContabil), styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: formatCurrency(totalBase), styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: formatCurrency(totalImposto), styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: '0,00', styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: '0,00', styles: { fontStyle: 'bold', fillColor: [230,230,230] } }
    ]);


    doc.autoTable({
        startY: yPos,
        head: cfopTableHead,
        body: cfopTableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [230, 230, 230],
            textColor: 40,
            fontSize: 7,
            halign: 'center'
        },
        styles: {
            fontSize: 7,
        },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
        }
    });

    doc.save('livro-saida.pdf');
}