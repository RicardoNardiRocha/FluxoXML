import type { NFe } from './data';

function getTagValue(xml: XMLDocument, tagName: string, namespace?: string): string | undefined {
  const elements = namespace ? xml.getElementsByTagNameNS(namespace, tagName) : xml.getElementsByTagName(tagName);
  return elements?.[0]?.textContent ?? undefined;
}

function getAttributeValue(xml: XMLDocument, tagName: string, attribute: string, namespace?: string): string | undefined {
    const elements = namespace ? xml.getElementsByTagNameNS(namespace, tagName) : xml.getElementsByTagName(tagName);
    return elements?.[0]?.getAttribute(attribute) ?? undefined;
  }

export function processNFeXML(xmlText: string): NFe | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error("Erro de parse no XML:", parserError.textContent);
      throw new Error("O arquivo XML fornecido é inválido ou mal formatado.");
    }

    const NFeNamespace = "http://www.portalfiscal.inf.br/nfe";

    const nfeProc = xmlDoc.getElementsByTagName('nfeProc')[0];
    const nfeNode = xmlDoc.getElementsByTagNameNS(NFeNamespace, 'NFe')[0];

    if (!nfeNode && !nfeProc) {
        throw new Error("Estrutura de NF-e não encontrada no XML.");
    }
    
    const infNFe = (nfeNode || nfeProc).getElementsByTagNameNS(NFeNamespace, 'infNFe')[0];
    const ide = infNFe.getElementsByTagNameNS(NFeNamespace, 'ide')[0];
    const emit = infNFe.getElementsByTagNameNS(NFeNamespace, 'emit')[0];
    const dest = infNFe.getElementsByTagNameNS(NFeNamespace, 'dest')[0];
    const total = infNFe.getElementsByTagNameNS(NFeNamespace, 'total')[0];
    const ICMSTot = total.getElementsByTagNameNS(NFeNamespace, 'ICMSTot')[0];
    const protNFe = (nfeNode || nfeProc).getElementsByTagNameNS(NFeNamespace, 'protNFe')[0];
    const infProt = protNFe?.getElementsByTagNameNS(NFeNamespace, 'infProt')[0];

    // Chave da NFe
    const id = infNFe.getAttribute('Id')?.replace('NFe', '') || `temp-${Math.random()}`;

    // Status (Autorizada ou Cancelada)
    let situacao: 'Autorizada' | 'Cancelada' = 'Autorizada';
    const cStat = getTagValue(infProt, 'cStat', NFeNamespace);
    
    // Check for cancellation event
    const evento = xmlDoc.getElementsByTagNameNS(NFeNamespace, 'evento');
    for (let i = 0; i < evento.length; i++) {
        const detEvento = evento[i].getElementsByTagNameNS(NFeNamespace, 'detEvento')[0];
        if (detEvento?.getAttribute('descEvento') === 'Cancelamento') {
           const evCancStat = detEvento.getElementsByTagNameNS(NFeNamespace, 'cStat')[0]?.textContent;
           if(evCancStat === '135' || evCancStat === '101') { // Evento registrado e vinculado / Cancelamento Homologado
            situacao = 'Cancelada';
            break;
           }
        }
    }
    
    if (situacao !== 'Cancelada' && cStat !== '100' && cStat !== '150') { // 100: Autorizado, 150: Autorizado fora do prazo
       // Se não for cancelada e não estiver autorizada, podemos ignorar ou tratar como erro
       console.warn(`NF-e com status não tratado: ${cStat}`);
       // return null; // Ou pode-se optar por não adicionar notas não autorizadas
    }


    const nfeData: NFe = {
      id: id,
      numero: parseInt(getTagValue(ide, 'nNF', NFeNamespace) || '0', 10),
      serie: parseInt(getTagValue(ide, 'serie', NFeNamespace) || '0', 10),
      dataEmissao: getTagValue(ide, 'dhEmi', NFeNamespace) || new Date().toISOString(),
      destinatario: {
        nome: getTagValue(dest, 'xNome', NFeNamespace) || 'Não identificado',
      },
      // O CFOP é por item, pegando o primeiro como representativo
      cfop: parseInt(getTagValue(infNFe.getElementsByTagNameNS(NFeNamespace, 'det')[0], 'CFOP', NFeNamespace) || '0', 10),
      situacao: situacao,
      valorTotal: parseFloat(getTagValue(ICMSTot, 'vNF', NFeNamespace) || '0'),
      baseCalculoICMS: parseFloat(getTagValue(ICMSTot, 'vBC', NFeNamespace) || '0'),
      valorICMS: parseFloat(getTagValue(ICMSTot, 'vICMS', NFeNamespace) || '0'),
    };

    return nfeData;

  } catch (e) {
    console.error("Erro ao processar XML da NF-e:", e);
    // Retorna null para que o chamador saiba que este arquivo falhou
    return null;
  }
}
