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
    const period = inv.dataEmissao.substring(0, 7); // YYYY-MM
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
  // Isso permite que o script do Google identifique qual valor pertence a qual CFOP
  const rows = Object.values(grouped).map(group => {
    const [year, month] = group.period.split('-');
    const periodFormatted = `${month}/${year}`;
    
    // Objeto base com as colunas fixas
    const rowObj: Record<string, string | number> = {
      "MÊS/ANO": periodFormatted,
      "CNPJ/CPF": group.doc,
      "EMPRESA": group.name,
      "QUANTIDADE XML": group.xmlCount,
      "TOTAL GERAL": group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };

    // Adiciona dinamicamente os CFOPs como chaves do objeto
    Object.entries(group.cfops).forEach(([cfop, valor]) => {
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
