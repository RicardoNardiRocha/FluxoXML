export type NFe = {
  id: string; // Chave da NF-e
  numero: number;
  serie: number;
  dataEmissao: string;
  emitente: {
    nome: string;
    cnpj: string;
    ie: string;
  };
  destinatario: {
    nome: string;
    uf?: string; // Adicionado campo UF
  };
  cfop: number;
  situacao: 'Autorizada' | 'Cancelada';
  finalidade: 'Normal' | 'Devolução';
  valorTotal: number;
  baseCalculoICMS: number;
  valorICMS: number;
};

// Dados mocados foram removidos para dar lugar ao processamento de arquivos reais.
export const mockInvoices: NFe[] = [];
