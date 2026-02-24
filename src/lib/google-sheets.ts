
import type { NFe } from './data';

/**
 * Organiza os dados das notas para o formato de planilha solicitado:
 * Cnpj, Nome, CFOP x, CFOP y..., Total
 */
export async function sendToGoogleSheets(invoices: NFe[], type: 'saida' | 'entrada', webhookUrl: string) {
  if (!webhookUrl) throw new Error("URL do Webhook não fornecida.");

  // 1. Identificar todos os CFOPs únicos para criar as colunas
  const allCfops = Array.from(new Set(invoices.map(inv => inv.cfop))).sort();
  
  // 2. Agrupar dados por CNPJ/CPF da contraparte
  const grouped = invoices.reduce((acc, inv) => {
    const partner = type === 'saida' ? inv.destinatario : inv.emitente;
    const doc = partner.cnpj || "N/A";
    const name = partner.nome;

    if (!acc[doc]) {
      acc[doc] = {
        doc,
        name,
        cfops: {} as Record<number, number>,
        total: 0
      };
    }

    acc[doc].cfops[inv.cfop] = (acc[doc].cfops[inv.cfop] || 0) + inv.valorTotal;
    acc[doc].total += inv.valorTotal;
    
    return acc;
  }, {} as Record<string, { doc: string, name: string, cfops: Record<number, number>, total: number }>);

  // 3. Preparar o cabeçalho e as linhas
  const headers = ["Documento", "Nome", ...allCfops.map(c => `CFOP ${c}`), "Total Geral"];
  
  const rows = Object.values(grouped).map(group => {
    const row = [group.doc, group.name];
    allCfops.forEach(cfop => {
      row.push(group.cfops[cfop] || 0);
    });
    row.push(group.total);
    return row;
  });

  // 4. Enviar para o Google Apps Script
  const response = await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors', // Necessário para Google Apps Script Webhooks
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ headers, rows }),
  });

  return response;
}
