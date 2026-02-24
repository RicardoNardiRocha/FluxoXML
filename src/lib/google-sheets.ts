import type { NFe } from './data';

/**
 * Organiza os dados das notas para o formato de resumo consolidado por Empresa e Período.
 * Substitui o valor do ICMS pela quantidade de arquivos XML processados.
 */
export async function sendToGoogleSheets(invoices: NFe[], type: 'saida' | 'entrada', webhookUrl: string) {
  if (!webhookUrl) throw new Error("URL do Webhook não fornecida.");

  // 1. Identificar todos os CFOPs únicos presentes para criar colunas dinâmicas
  const allCfops = Array.from(new Set(invoices.map(inv => inv.cfop))).sort();
  
  // 2. Agrupar dados pelo "Dono do Livro" (Sua Empresa) e por Mês
  const grouped = invoices.reduce((acc, inv) => {
    // Na Saída, o dono é o Emitente. Na Entrada, o dono é o Destinatário.
    const owner = type === 'saida' ? inv.emitente : inv.destinatario;
    const ownerDoc = owner.cnpj || "N/A";
    const ownerName = owner.nome;
    const period = inv.dataEmissao.substring(0, 7); // YYYY-MM
    const key = `${period}-${ownerDoc}`;

    if (!acc[key]) {
      acc[key] = {
        period,
        doc: ownerDoc,
        name: ownerName,
        baseCalc: 0,
        xmlCount: 0,
        cfops: {} as Record<number, number>,
        total: 0
      };
    }

    // Incrementa a contagem de XMLs (independente de estar autorizada ou não)
    acc[key].xmlCount++;

    // Apenas notas autorizadas somam valores financeiros
    if (inv.situacao === 'Autorizada') {
      acc[key].baseCalc += inv.baseCalculoICMS;
      acc[key].cfops[inv.cfop] = (acc[key].cfops[inv.cfop] || 0) + inv.valorTotal;
      acc[key].total += inv.valorTotal;
    }
    
    return acc;
  }, {} as Record<string, { period: string, doc: string, name: string, baseCalc: number, xmlCount: number, cfops: Record<number, number>, total: number }>);

  // 3. Preparar o cabeçalho explícito solicitado
  const headers = [
    "MÊS/ANO", 
    "CNPJ/CPF", 
    "EMPRESA", 
    "BASE DE CÁLCULO", 
    "QUANTIDADE XML", 
    ...allCfops.map(c => `CFOP ${c}`), 
    "TOTAL GERAL"
  ];
  
  // 4. Preparar as linhas de dados consolidados
  const rows = Object.values(grouped).map(group => {
    const [year, month] = group.period.split('-');
    const periodFormatted = `${month}/${year}`;
    
    const row: (string | number)[] = [
      periodFormatted,
      group.doc,
      group.name,
      group.baseCalc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      group.xmlCount
    ];

    // Preenche cada coluna de CFOP com o valor correspondente ou 0 se não houver
    allCfops.forEach(cfop => {
      const val = group.cfops[cfop] || 0;
      row.push(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    });

    row.push(group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    return row;
  });

  // 5. Enviar para o Google Apps Script via POST
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
