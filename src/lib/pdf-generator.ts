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

// Adicionado para extrair a UF do destinatário
function getUfFromDestinatario(invoice: NFe): string {
    // Esta função é um placeholder. A UF do destinatário deveria ser
    // extraída do XML. Como não temos esse dado no tipo NFe,
    // vamos usar um valor padrão ou tentar inferir.
    // Para este exemplo, vamos retornar 'SP' como padrão.
    // O ideal seria adicionar 'uf' ao objeto 'destinatario' em 'data.ts' e no 'xml-parser.ts'.
    return invoice.destinatario.uf || 'SP';
}


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
        { label: 'MÊS OU PERÍODO/ANO:', value: '12/2025' } // Idealmente, isso seria dinâmico
    ];

    doc.setFontSize(8).setFont('helvetica', 'normal');
    let yPos = margin + 30;
    headerInfo.forEach(info => {
        doc.text(`${info.label} ${info.value}`, margin, yPos);
        yPos += 12;
    });

    // --- TABELA PRINCIPAL DE NOTAS ---
    const authorizedInvoices = invoices.filter(inv => inv.situacao === 'Autorizada');

    const mainTableHead = [['Espécie', 'Série/Subs.', 'Número', 'Dia', 'CFOP', 'UF', 'Valor Contábil', 'Base de Cálculo', 'ICMS', 'Isentas/N.Trib.', 'Outras', 'Observações']];
    const mainTableBody = authorizedInvoices.map(inv => [
        'NFE',
        inv.serie,
        inv.numero,
        formatDate(inv.dataEmissao),
        inv.cfop,
        getUfFromDestinatario(inv),
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
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right' },
            9: { halign: 'right' },
            10: { halign: 'right' },
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // --- RESUMO POR CFOP ---
    finalY += 20;
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('RESUMO MENSAL DE OPERAÇÕES E PRESTAÇÃO POR CÓDIGO FISCAL', margin, finalY);
    finalY += 15;

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
    const cfopTableBody: any[] = [];
    
    const cfopGroups = {
        '5000 - Saidas e/ou Prestação de serviços no estado': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('5')),
        '6000 - Saidas e/ou Prestação de serviços de outros estados': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('6')),
    };

    let totalGeral = { valorContabil: 0, baseCalculo: 0, imposto: 0 };

    for (const [groupTitle, groupItems] of Object.entries(cfopGroups)) {
        if (groupItems.length > 0) {
            cfopTableBody.push([{ content: groupTitle, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
            let subTotal = { valorContabil: 0, baseCalculo: 0, imposto: 0 };

            groupItems.forEach(([cfop, values]) => {
                cfopTableBody.push([
                    cfop,
                    formatCurrency(values.valorContabil),
                    formatCurrency(values.baseCalculo),
                    formatCurrency(values.imposto),
                    '0,00',
                    '0,00'
                ]);
                subTotal.valorContabil += values.valorContabil;
                subTotal.baseCalculo += values.baseCalculo;
                subTotal.imposto += values.imposto;
            });

            cfopTableBody.push([
                { content: 'SUB TOTAL', styles: { fontStyle: 'bold' } },
                { content: formatCurrency(subTotal.valorContabil), styles: { fontStyle: 'bold' } },
                { content: formatCurrency(subTotal.baseCalculo), styles: { fontStyle: 'bold' } },
                { content: formatCurrency(subTotal.imposto), styles: { fontStyle: 'bold' } },
                { content: '0,00', styles: { fontStyle: 'bold' } },
                { content: '0,00', styles: { fontStyle: 'bold' } }
            ]);

            totalGeral.valorContabil += subTotal.valorContabil;
            totalGeral.baseCalculo += subTotal.baseCalculo;
            totalGeral.imposto += subTotal.imposto;
        }
    }

     // Total Geral
    cfopTableBody.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: formatCurrency(totalGeral.valorContabil), styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: formatCurrency(totalGeral.baseCalculo), styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: formatCurrency(totalGeral.imposto), styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: '0,00', styles: { fontStyle: 'bold', fillColor: [230,230,230] } },
        { content: '0,00', styles: { fontStyle: 'bold', fillColor: [230,230,230] } }
    ]);


    doc.autoTable({
        startY: finalY,
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
        },
        didParseCell: function(data) {
            // Para as linhas de título de grupo
            if (typeof data.cell.raw === 'object' && data.cell.raw.colSpan) {
                data.cell.styles.halign = 'left';
            }
        }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // --- DEMONSTRATIVO POR ESTADO ---
    finalY += 20;
    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('DEMONSTRATIVO POR ESTADO DE DESTINO DA MERCADORIA OU DA PRESTACAO DO SERVICO', margin, finalY);
    finalY += 12;
    doc.setFontSize(8).setFont('helvetica', 'normal');
    doc.text('Operacoes realizadas com nao contribuintes', margin, finalY);
    finalY += 15;

    const ufSummary: { [key: string]: { valorContabil: number, baseCalculo: number, icmsFonte: number } } = {};
     authorizedInvoices.forEach(inv => {
        const uf = getUfFromDestinatario(inv);
        if (!ufSummary[uf]) {
            ufSummary[uf] = { valorContabil: 0, baseCalculo: 0, icmsFonte: 0 };
        }
        ufSummary[uf].valorContabil += inv.valorTotal;
        ufSummary[uf].baseCalculo += inv.baseCalculoICMS;
        // O campo icmsFonte não existe nos dados, usaremos 0
    });

    const ufTableHead = [['UF', 'Valor Contábil', 'Base de Cálculo', 'Outras', 'ICMS Fonte']];
    const ufTableBody = Object.entries(ufSummary).map(([uf, values]) => [
        uf,
        formatCurrency(values.valorContabil),
        formatCurrency(values.baseCalculo),
        '0,00',
        '0,00' // Placeholder para Icms Fonte
    ]);

    doc.autoTable({
        startY: finalY,
        head: ufTableHead,
        body: ufTableBody,
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
        }
    });


    doc.save('livro-saida.pdf');
}
