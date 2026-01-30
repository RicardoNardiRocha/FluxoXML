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
    const date = new Date(dateString);
    // Adiciona o fuso horário para garantir que a data não mude
    return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000).toLocaleDateString('pt-BR');
};

function getUf(invoice: NFe, type: 'saida' | 'entrada'): string {
    if (type === 'saida') {
        return invoice.destinatario.uf || 'SP';
    }
    return invoice.emitente.uf || 'SP';
}

export function generateBookPDF(
    invoices: NFe[],
    options: { type: 'saida' | 'entrada', monthYear?: string }
) {
    if (invoices.length === 0) {
        console.warn("generateBookPDF called with no invoices.");
        return;
    }

    const { type, monthYear } = options;
    const isSaida = type === 'saida';

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    const company = isSaida ? invoices[0].emitente : {
        ...invoices[0].destinatario,
        cnpj: "N/A (não consta no XML)", // CNPJ do destinatário não é obrigatório no XML
        ie: "N/A (não consta no XML)",   // IE do destinatário não é obrigatório no XML
    };
    
    const periodDate = new Date(invoices[0].dataEmissao);
    const period = `${(periodDate.getMonth() + 1).toString().padStart(2, '0')}/${periodDate.getFullYear()}`;

    const addHeaderAndFooterToPage = (data: { pageNumber: number, settings: { margin: { top: number } } }) => {
        doc.setFontSize(14).setFont('helvetica', 'bold');
        doc.text(isSaida ? 'REGISTRO DE SAÍDAS' : 'REGISTRO DE ENTRADAS', pageWidth / 2, margin + 10, { align: 'center' });

        const headerInfo = [
            { label: 'FIRMA:', value: company.nome },
            { label: 'C.N.P.J.:', value: company.cnpj },
            { label: 'INSCR. EST.:', value: company.ie },
            { label: 'MÊS OU PERÍODO/ANO:', value: period }
        ];

        doc.setFontSize(8).setFont('helvetica', 'normal');
        let yPos = margin + 30;
        headerInfo.forEach(info => {
            doc.text(`${info.label} ${info.value}`, margin, yPos);
            yPos += 12;
        });

        data.settings.margin.top = yPos;
        
        doc.setFontSize(8);
        const pageNumberText = `Página ${data.pageNumber} de {totalPages}`;
        doc.text(pageNumberText, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        doc.text(`Folha: ${data.pageNumber}`, margin, doc.internal.pageSize.getHeight() - 10, { align: 'left' });
    };

    const isRemessaCFOP = (cfop: number): boolean => {
        const firstDigit = Math.floor(cfop / 1000);
        const lastThree = cfop % 1000;
        return (firstDigit === 5 && lastThree >= 900) || (firstDigit === 6 && lastThree >= 900) ||
               (firstDigit === 1 && lastThree >= 900) || (firstDigit === 2 && lastThree >= 900);
    };

    const mainTableHead = [['Espécie', 'Série/Subs.', 'Número', 'Dia', 'CFOP', 'UF', 'Valor da Nota', 'Valor Contábil Acum.', 'Base de Cálculo', 'ICMS', 'Isentas/N.Trib.', 'Outras', 'Observações']];
    
    let valorContabilAcumulado = 0;
    const mainTableBody = invoices.map(inv => {
        const isRemessa = isRemessaCFOP(inv.cfop);

        if (!isRemessa) {
            if (isSaida && inv.finalidade === 'Devolução') {
                // Devolução de compra (saída) anula uma entrada, subtrai do valor contábil.
                valorContabilAcumulado -= inv.valorTotal;
            } else {
                valorContabilAcumulado += inv.valorTotal;
            }
        }

        let observacao = '';
        if (inv.situacao === 'Cancelada') {
            observacao = 'CANCELADA';
        } else if (inv.finalidade === 'Devolução') {
            observacao = isSaida ? 'DEVOLUÇÃO DE COMPRA' : 'DEVOLUÇÃO DE VENDA';
        } else if (isRemessa) {
            observacao = 'REMESSA';
        }

        return [
            'NFE',
            inv.serie.toString(),
            inv.numero.toString(),
            formatDate(inv.dataEmissao),
            inv.cfop.toString(),
            getUf(inv, type),
            formatCurrency(inv.valorTotal),
            formatCurrency(valorContabilAcumulado),
            formatCurrency(inv.baseCalculoICMS),
            formatCurrency(inv.valorICMS),
            '0,00',
            '0,00',
            observacao
        ];
    });

    const authorizedInvoices = invoices.filter(inv => inv.situacao === 'Autorizada');
    
    const styles = { fontSize: 6 };
    const headStyles = { fillColor: [230, 230, 230], textColor: 40, fontSize: 6, halign: 'center' };
    const columnStyles = {
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 50 },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
        12: { halign: 'center', fontStyle: 'bold' }
    };
    const boldStyle = { fontStyle: 'bold' };

    doc.autoTable({
        head: mainTableHead,
        body: mainTableBody,
        startY: 100,
        theme: 'grid',
        styles,
        headStyles,
        columnStyles,
        footStyles: boldStyle,
        didDrawPage: addHeaderAndFooterToPage,
    });

    let finalY = doc.lastAutoTable.finalY;

    // --- TOTALIZADORES GERAIS ---
    finalY += 20;
    if (finalY > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        finalY = (doc.lastAutoTable as any).finalY || 100; // Reset Y after page break
        addHeaderAndFooterToPage({ pageNumber: (doc as any).internal.getNumberOfPages(), settings: { margin: { top: 0 } } });

    }

    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('RESUMO DOS TOTALIZADORES', margin, finalY);
    finalY += 15;

    const totalProcessadas = invoices.length;
    const totalAutorizadas = invoices.filter(inv => inv.situacao === 'Autorizada').length;
    const totalCanceladas = invoices.filter(inv => inv.situacao === 'Cancelada').length;
    const totalDevolucoes = authorizedInvoices.filter(inv => inv.finalidade === 'Devolução').length;

    const summaryData = [
        ['Total de Notas Processadas:', totalProcessadas.toString()],
        ['Total de Notas Autorizadas:', totalAutorizadas.toString()],
        ['Total de Notas Canceladas:', totalCanceladas.toString()],
        ['Total de Devoluções:', totalDevolucoes.toString() + (isSaida ? ' (Compra)' : ' (Venda)')],
    ];

    doc.autoTable({
        startY: finalY,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 8 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    finalY = doc.lastAutoTable.finalY;


    // --- RESUMO POR CFOP ---
    finalY += 20;
    if (finalY > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        finalY = (doc.lastAutoTable as any).finalY || 100;
        addHeaderAndFooterToPage({ pageNumber: (doc as any).internal.getNumberOfPages(), settings: { margin: { top: 0 } } });
    }

    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text('RESUMO MENSAL DE OPERAÇÕES E PRESTAÇÃO POR CÓDIGO FISCAL', margin, finalY);
    finalY += 15;

    const cfopSummary: { [key: string]: { valorContabil: number, baseCalculo: number, imposto: number } } = {};
    authorizedInvoices.forEach(inv => {
        const cfopKey = inv.cfop.toString();
        if (!cfopSummary[cfopKey]) {
            cfopSummary[cfopKey] = { valorContabil: 0, baseCalculo: 0, imposto: 0 };
        }
        cfopSummary[cfopKey].valorContabil += inv.valorTotal;
        cfopSummary[cfopKey].baseCalculo += inv.baseCalculoICMS;
        cfopSummary[cfopKey].imposto += inv.valorICMS;
    });

    const cfopTableHead = [['CÓD. FISC.', 'VLR. CONTÁBIL', 'BASE CÁLC.', 'IMPOSTO', 'ISENTAS', 'OUTRAS']];
    const cfopTableBody: any[] = [];
    
    const cfopGroups = isSaida ? {
        '1000/2000 - Entradas (Devoluções de Venda)': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('1') || cfop.startsWith('2')),
        '5000 - Saídas e/ou Prestação de serviços no estado': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('5')),
        '6000 - Saídas e/ou Prestação de serviços de outros estados': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('6')),
        '7000 - Saídas e/ou Prestação de serviços para o exterior': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('7')),
    } : {
        '1000 - Entradas e/ou Aquisições de Serviços do Estado': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('1')),
        '2000 - Entradas e/ou Aquisições de Serviços de Outros Estados': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('2')),
        '3000 - Entradas e/ou Aquisições de Serviços do Exterior': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('3')),
        '5000/6000 - Saídas (Devoluções de Compra)': Object.entries(cfopSummary).filter(([cfop]) => cfop.startsWith('5') || cfop.startsWith('6')),
    };

    let totalGeralCfop = { valorContabil: 0, baseCalculo: 0, imposto: 0 };

    for (const [groupTitle, groupItems] of Object.entries(cfopGroups)) {
        if (groupItems.length > 0) {
            cfopTableBody.push([{ content: groupTitle, colSpan: 6, styles: { ...boldStyle, fillColor: [240, 240, 240], fontSize: 7 } }]);
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
        headStyles: { ...headStyles, fontSize: 7 },
        styles: { ...styles, fontSize: 7 },
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        didParseCell: function(data) { if (typeof data.cell.raw === 'object' && data.cell.raw.colSpan) { data.cell.styles.halign = 'left'; } }
    });

    finalY = doc.lastAutoTable.finalY;

    // --- DEMONSTRATIVO POR ESTADO ---
    finalY += 20;
     if (finalY > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        finalY = (doc.lastAutoTable as any).finalY || 100;
        addHeaderAndFooterToPage({ pageNumber: (doc as any).internal.getNumberOfPages(), settings: { margin: { top: 0 } } });
    }

    doc.setFontSize(9).setFont('helvetica', 'bold');
    doc.text(isSaida ? 'DEMONSTRATIVO POR ESTADO DE DESTINO DA MERCADORIA OU DA PRESTACAO DO SERVICO' : 'DEMONSTRATIVO POR ESTADO DE ORIGEM DA MERCADORIA OU DA PRESTACAO DO SERVICO', margin, finalY);
    finalY += 12;
    doc.setFontSize(8).setFont('helvetica', 'normal');
    doc.text(isSaida ? 'Operacoes realizadas com nao contribuintes' : 'Operacoes realizadas com fornecedores', margin, finalY);
    finalY += 15;

    const ufSummary: { [key: string]: { valorContabil: number, baseCalculo: number, icmsFonte: number } } = {};
    authorizedInvoices.forEach(inv => {
        const uf = getUf(inv, type);
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
        headStyles: { ...headStyles, fontSize: 7 },
        styles: { ...styles, fontSize: 7 },
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
    });

    // Final page number replacement
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        const textToReplace = `Página ${i} de {totalPages}`;
        const newText = `Página ${i} de ${totalPages}`;
        const textWidth = doc.getTextWidth(textToReplace);
        doc.setFillColor(255, 255, 255);
        doc.rect(pageWidth - margin - textWidth - 2, doc.internal.pageSize.getHeight() - 15, textWidth + 4, 10, 'F');
        doc.text(newText, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    const companyNameForFile = company.nome
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
        
    const filename = `livro-${type}-${companyNameForFile}-${monthYear}.pdf`;
    doc.save(filename);
}
