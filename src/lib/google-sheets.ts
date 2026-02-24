import type { NFe } from './data';

/**
 * Organiza os dados das notas para o formato de resumo consolidado por Empresa e Período.
 * Envia um array de objetos para que o Webhook do Google possa mapear as colunas corretamente.
 */
export async function sendToGoogleSheets(invoices: NFe[], type: 'saida' | 'entrada', webhookUrl: string) {
  if (!webhookUrl) throw new Error("URL do Webhook não fornecida.");

  // 1. Agrupar dados pelo "Dono do Livro" (Sua Empresa) e por Mês
  const grouped = invoices.reduce((acc, inv) => {
    const owner = type === 'saida' ? inv.emitente : inv.destinatario;
    const ownerDoc = owner.cnpj || "N/A";
    const ownerName = owner.nome;
    const periodDate = new Date(inv.dataEmissao);
    const period = `${(periodDate.getMonth() + 1).toString().padStart(2, '0')}/${periodDate.getFullYear()}`;
    const key = `${period}-${ownerDoc}`;

    if (!acc[key]) {
      acc[key] = {
        period,
        doc: ownerDoc,
        name: ownerName,
        xmlCount: 0,
        cfops: {} as Record<number, number>,
        total: 0
      };
    }

    acc[key].xmlCount++;

    if (inv.situacao === 'Autorizada') {
      acc[key].cfops[inv.cfop] = (acc[key].cfops[inv.cfop] || 0) + inv.valorTotal;
      acc[key].total += inv.valorTotal;
    }
    
    return acc;
  }, {} as Record<string, { period: string, doc: string, name: string, xmlCount: number, cfops: Record<number, number>, total: number }>);

  // 2. Preparar as linhas como Objetos (chave: valor)
  // O script do Google usará as chaves para identificar as colunas
  const rows = Object.values(grouped).map(group => {
    // Objeto base com as colunas fixas
    const rowObj: Record<string, string | number> = {
      "MÊS/ANO": group.period,
      "CNPJ/CPF": group.doc,
      "EMPRESA": group.name,
      "QUANTIDADE XML": group.xmlCount,
      "TOTAL GERAL": group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };

    // Adiciona dinamicamente os CFOPs como chaves do objeto (ex: "CFOP 5102")
    // Ordenamos os CFOPs para manter uma consistência visual
    const sortedCfops = Object.keys(group.cfops).map(Number).sort((a, b) => a - b);
    
    sortedCfops.forEach(cfop => {
      const valor = group.cfops[cfop];
      rowObj[`CFOP ${cfop}`] = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    return rowObj;
  });

  // 3. Enviar para o Google Apps Script
  const response = await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });

  return response;
}
