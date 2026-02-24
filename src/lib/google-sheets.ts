import type { NFe } from './data';

/**
 * Organiza os dados das notas para o formato de planilha solicitado:
 * Período, Documento, Nome, Base Calc, ICMS, CFOP x, CFOP y..., Total
 */
export async function sendToGoogleSheets(invoices: NFe[], type: 'saida' | 'entrada', webhookUrl: string) {
  if (!webhookUrl) throw new Error("URL do Webhook não fornecida.");

  // 1. Identificar todos os CFOPs únicos para criar as colunas
  const allCfops = Array.from(new Set(invoices.map(inv => inv.cfop))).sort();
  
  // 2. Agrupar dados por CNPJ/CPF da contraparte e por Mês
  const grouped = invoices.reduce((acc, inv) => {
    const partner = type === 'saida' ? inv.destinatario : inv.emitente;
    const doc = partner.cnpj || "N/A";
    const name = partner.nome;
    const period = inv.dataEmissao.substring(0, 7); // YYYY-MM
    const key = `${period}-${doc}`;

    if (!acc[key]) {
      acc[key] = {
        period,
        doc,
        name,
        baseCalc: 0,
        icms: 0,
        cfops: {} as Record<number, number>,
        total: 0
      };
    }

    acc[key].baseCalc += inv.baseCalculoICMS;
    acc[key].icms += inv.valorICMS;
    acc[key].cfops[inv.cfop] = (acc[key].cfops[inv.cfop] || 0) + inv.valorTotal;
    acc[key].total += inv.valorTotal;
    
    return acc;
  }, {} as Record<string, { period: string, doc: string, name: string, baseCalc: number, icms: number, cfops: Record<number, number>, total: number }>);

  // 3. Preparar o cabeçalho
  const headers = [
    "Período", 
    "Documento", 
    "Nome", 
    "Base de Cálculo", 
    "ICMS", 
    ...allCfops.map(c => `CFOP ${c}`), 
    "Total Geral"
  ];
  
  // 4. Preparar as linhas de dados e calcular os totais da planilha
  let totalBase = 0;
  let totalIcms = 0;
  let totalGeralSheet = 0;
  const cfopTotals: Record<number, number> = {};
  allCfops.forEach(c => cfopTotals[c] = 0);

  const rows = Object.values(grouped).map(group => {
    const [year, month] = group.period.split('-');
    const periodFormatted = `${month}/${year}`;
    
    totalBase += group.baseCalc;
    totalIcms += group.icms;
    totalGeralSheet += group.total;

    const row = [
      periodFormatted,
      group.doc,
      group.name,
      group.baseCalc,
      group.icms
    ];

    allCfops.forEach(cfop => {
      const val = group.cfops[cfop] || 0;
      row.push(val);
      cfopTotals[cfop] += val;
    });

    row.push(group.total);
    return row;
  });

  // 5. Adicionar Linha de Totais (O "Resumo Mensal" na planilha)
  const totalRow = [
    "TOTAL GERAL",
    "-",
    "-",
    totalBase,
    totalIcms,
    ...allCfops.map(c => cfopTotals[c]),
    totalGeralSheet
  ];

  rows.push(totalRow);

  // 6. Enviar para o Google Apps Script
  const response = await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ headers, rows }),
  });

  return response;
}
