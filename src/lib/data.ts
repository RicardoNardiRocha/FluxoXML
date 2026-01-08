export type NFe = {
  id: string; // Chave da NF-e
  numero: number;
  serie: number;
  dataEmissao: string;
  destinatario: {
    nome: string;
  };
  cfop: number;
  situacao: 'Autorizada' | 'Cancelada';
  valorTotal: number;
  baseCalculoICMS: number;
  valorICMS: number;
};

// Dados mocados foram removidos para dar lugar ao processamento de arquivos reais.
export const mockInvoices: NFe[] = [];
