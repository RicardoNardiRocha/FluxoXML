import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { NFe } from './data';

// Augment jsPDF with the autoTable method
declare module 'jspdf' {
    interface jsPDF {
      autoTable: (options: any) => jsPDF;
      lastAutoTable: {
        finalY: number;
      };
    }
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

function getUfFromDestinatario(invoice: NFe): string {
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
    const authorizedInvoices = invoices.filter(inv => inv.situacao === 'Autorizada');

    // Função para adicionar cabeçalho e rodapé em todas as páginas
    const addHeaderAndFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

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
            
             // --- RODAPÉ (Numeração de página) ---
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            doc.text(`Folha: ${i}`, margin, doc.internal.pageSize.getHeight() - 10, { align: 'left'});
        }
    };

    const mainTableHead = [['Espécie', 'Série/Subs.', 'Número', 'Dia', 'CFOP', 'UF', 'Valor Contábil', 'Base de Cálculo', 'ICMS', 'Isentas/N.Trib.', 'Outras', 'Observações']];
    const mainTableBody = authorizedInvoices.map(inv => [
        'NFE',
        inv.serie.toString(),
        inv.numero.toString(),
        formatDate(inv.dataEmissao),
        inv.cfop.toString(),
        getUfFromDestinatario(inv),
        formatCurrency(inv.valorTotal),
        formatCurrency(inv.baseCalculoICMS),
        formatCurrency(inv.valorICMS),
        '0,00',
        '0,00',
        ''
    ]);
    
    let totalAcumulado = { valorContabil: 0, baseCalculoICMS: 0, valorICMS: 0 };
    const styles = { fontSize: 7 };
    const headStyles = { fillColor: [230, 230, 230], textColor: 40, fontSize: 7, halign: 'center' };
    const columnStyles = {
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
    };
    const boldStyle = { fontStyle: 'bold' };

    doc.autoTable({
        head: mainTableHead,
        body: mainTableBody,
        startY: 100, // Posição inicial da primeira tabela
        theme: 'grid',
        styles: styles,
        headStyles: headStyles,
        columnStyles: columnStyles,
        footStyles: boldStyle,
        didDrawPage: (data) => {
             // --- CABEÇALHO (Apenas da página sendo desenhada) ---
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
            // --- FIM CABEÇALHO ---

            // Calcula totais da página
            const pageInvoices = authorizedInvoices.slice(data.startRow.index, data.cursor.y > 0 ? data.row.index + 1 : authorizedInvoices.length);
            const pageTotal = pageInvoices.reduce((acc, inv) => {
                acc.valorContabil += inv.valorTotal;
                acc.baseCalculoICMS += inv.baseCalculoICMS;
                acc.valorICMS += inv.valorICMS;
                return acc;
            }, { valorContabil: 0, baseCalculoICMS: 0, valorICMS: 0 });

            // Adiciona linha de "Transporte" no início de cada página > 1
            if (data.pageNumber > 1) {
                const transportRow = [
                    { content: 'TRANSPORTE (TOTAIS DA PÁGINA ANTERIOR)', colSpan: 6, styles: { ...boldStyle, halign: 'left' } },
                    { content: formatCurrency(totalAcumulado.valorContabil), styles: { ...boldStyle, halign: 'right' } },
                    { content: formatCurrency(totalAcumulado.baseCalculoICMS), styles: { ...boldStyle, halign: 'right' } },
                    { content: formatCurrency(totalAcumulado.valorICMS), styles: { ...boldStyle, halign: 'right' } },
                    { content: '0,00', styles: { ...boldStyle, halign: 'right' } },
                    { content: '0,00', styles: { ...boldStyle, halign: 'right' } },
                    ''
                ];
                 // Adiciona a linha de transporte na posição correta
                data.table.body.splice(data.startRow.index, 0, transportRow);
            }

            // Atualiza o total acumulado
            totalAcumulado.valorContabil += pageTotal.valorContabil;
            totalAcumulado.baseCalculoICMS += pageTotal.baseCalculoICMS;
            totalAcumulado.valorICMS += pageTotal.valorICMS;
        },
        willDrawCell: (data) => {
            // Corrige o alinhamento para células com colspan
            if (typeof data.cell.raw === 'object' && data.cell.raw.colSpan) {
                if(data.cell.raw.styles.halign === 'left') {
                    data.cell.styles.halign = 'left';
                }
            }
        },
        didDrawTable: (data) => {
             const isLastPage = data.pageNumber === (doc as any).internal.getNumberOfPages();
             if(isLastPage) {
                const summaryLabel = 'TOTAIS GERAIS';
                const summaryRow = [
                       { content: summaryLabel, colSpan: 6, styles: { ...boldStyle, halign: 'left', fillColor: [240, 240, 240] } },
                       { content: formatCurrency(totalAcumulado.valorContabil), styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: formatCurrency(totalAcumulado.baseCalculoICMS), styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: formatCurrency(totalAcumulado.valorICMS), styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: '0,00', styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: '0,00', styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: '', styles: {fillColor: [240, 240, 240]} }
                   ];
               data.table.body.push(summaryRow);
             } else {
                 const summaryLabel = 'A TRANSPORTAR (TOTAIS ATÉ ESTA PÁGINA)';
                 const summaryRow = [
                       { content: summaryLabel, colSpan: 6, styles: { ...boldStyle, halign: 'left', fillColor: [240, 240, 240] } },
                       { content: formatCurrency(totalAcumulado.valorContabil), styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: formatCurrency(totalAcumulado.baseCalculoICMS), styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: formatCurrency(totalAcumulado.valorICMS), styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: '0,00', styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: '0,00', styles: { ...boldStyle, halign: 'right', fillColor: [240, 240, 240]} },
                       { content: '', styles: {fillColor: [240, 240, 240]} }
                   ];
                data.table.body.push(summaryRow);
             }
        }
    });

    let finalY = doc.lastAutoTable.finalY;

    // --- RESUMO POR CFOP ---
    finalY += 20;
    // Checa se precisa de uma nova página
    if (finalY > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        finalY = 100; // Posição inicial na nova página
    }

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

    let totalGeralCfop = { valorContabil: 0, baseCalculo: 0, imposto: 0 };

    for (const [groupTitle, groupItems] of Object.entries(cfopGroups)) {
        if (groupItems.length > 0) {
            cfopTableBody.push([{ content: groupTitle, colSpan: 6, styles: { ...boldStyle, fillColor: [240, 240, 240] } }]);
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
                { content: 'SUB TOTAL', styles: boldStyle },
                { content: formatCurrency(subTotal.valorContabil), styles: { ...boldStyle, halign: 'right' } },
                { content: formatCurrency(subTotal.baseCalculo), styles: { ...boldStyle, halign: 'right' } },
                { content: formatCurrency(subTotal.imposto), styles: { ...boldStyle, halign: 'right' } },
                { content: '0,00', styles: { ...boldStyle, halign: 'right' } },
                { content: '0,00', styles: { ...boldStyle, halign: 'right' } }
            ]);

            totalGeralCfop.valorContabil += subTotal.valorContabil;
            totalGeralCfop.baseCalculo += subTotal.baseCalculo;
            totalGeralCfop.imposto += subTotal.imposto;
        }
    }

    // Total Geral CFOP
    cfopTableBody.push([
        { content: 'TOTAL', styles: { ...boldStyle, fillColor: [230,230,230] } },
        { content: formatCurrency(totalGeralCfop.valorContabil), styles: { ...boldStyle, halign: 'right', fillColor: [230,230,230] } },
        { content: formatCurrency(totalGeralCfop.baseCalculo), styles: { ...boldStyle, halign: 'right', fillColor: [230,230,230] } },
        { content: formatCurrency(totalGeralCfop.imposto), styles: { ...boldStyle, halign: 'right', fillColor: [230,230,230] } },
        { content: '0,00', styles: { ...boldStyle, halign: 'right', fillColor: [230,230,230] } },
        { content: '0,00', styles: { ...boldStyle, halign: 'right', fillColor: [230,230,230] } }
    ]);

    doc.autoTable({
        startY: finalY,
        head: cfopTableHead,
        body: cfopTableBody,
        theme: 'grid',
        headStyles: headStyles,
        styles: styles,
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        didParseCell: function(data) { if (typeof data.cell.raw === 'object' && data.cell.raw.colSpan) { data.cell.styles.halign = 'left'; } }
    });

    finalY = doc.lastAutoTable.finalY;

    // --- DEMONSTRATIVO POR ESTADO ---
    finalY += 20;
     if (finalY > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        finalY = 100;
    }

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
    });

    const ufTableHead = [['UF', 'Valor Contábil', 'Base de Cálculo', 'Outras', 'ICMS Fonte']];
    const ufTableBody = Object.entries(ufSummary).map(([uf, values]) => [
        uf,
        formatCurrency(values.valorContabil),
        formatCurrency(values.baseCalculo),
        '0,00',
        '0,00'
    ]);

    doc.autoTable({
        startY: finalY,
        head: ufTableHead,
        body: ufTableBody,
        theme: 'grid',
        headStyles: headStyles,
        styles: styles,
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    addHeaderAndFooter();

    doc.save('livro-saida.pdf');
}
