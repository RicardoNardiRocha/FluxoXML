import type { NFe } from './data';

function getTagValue(xml: Element | Document, tagName: string, namespace?: string): string | undefined {
  const elements = namespace ? xml.getElementsByTagNameNS(namespace, tagName) : xml.getElementsByTagName(tagName);
  return elements?.[0]?.textContent ?? undefined;
}

function getAttributeValue(xml: Element | Document, tagName:string, attribute: string, namespace?: string): string | undefined {
    const elements = namespace ? xml.getElementsByTagNameNS(namespace, tagName) : xml.getElementsByTagName(tagName);
    return elements?.[0]?.getAttribute(attribute) ?? undefined;
  }

export function processNFeXML(xmlText: string): NFe | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
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
    
    const rootEl = nfeProc || nfeNode;
    const infNFe = rootEl.getElementsByTagNameNS(NFeNamespace, 'infNFe')[0];
    if (!infNFe) {
      throw new Error("Tag <infNFe> não encontrada no XML.");
    }

    const ide = infNFe.getElementsByTagNameNS(NFeNamespace, 'ide')[0];
    const dest = infNFe.getElementsByTagNameNS(NFeNamespace, 'dest')[0];
    const enderDest = dest?.getElementsByTagNameNS(NFeNamespace, 'enderDest')[0];
    const total = infNFe.getElementsByTagNameNS(NFeNamespace, 'total')[0];
    const ICMSTot = total.getElementsByTagNameNS(NFeNamespace, 'ICMSTot')[0];
    
    const protNFe = rootEl.getElementsByTagNameNS(NFeNamespace, 'protNFe')[0];
    const infProt = protNFe?.getElementsByTagNameNS(NFeNamespace, 'infProt')[0];

    const id = infNFe.getAttribute('Id')?.replace('NFe', '') || `temp-${Math.random()}`;

    let situacao: 'Autorizada' | 'Cancelada' = 'Autorizada';
    const cStat = infProt ? getTagValue(infProt, 'cStat', NFeNamespace) : undefined;

    if (cStat === '101' || cStat === '135') { // 101 = Cancelamento Homologado, 135 = Evento Registrado
        situacao = 'Cancelada';
    } else {
        const evento = xmlDoc.getElementsByTagNameNS(NFeNamespace, 'evento');
        for (let i = 0; i < evento.length; i++) {
            const detEvento = evento[i].getElementsByTagNameNS(NFeNamespace, 'detEvento')[0];
            if (detEvento?.getAttribute('descEvento')?.toLowerCase().includes('cancelamento')) {
               const evCancStat = detEvento.getElementsByTagNameNS(NFeNamespace, 'cStat')[0]?.textContent;
               if(evCancStat === '135' || evCancStat === '101') { 
                situacao = 'Cancelada';
                break;
               }
            }
        }
    }
    
    if (situacao === 'Autorizada' && cStat !== '100' && cStat !== '150') { 
       console.warn(`NF-e ${id} com status não esperado: ${cStat}. Tratada como Autorizada.`);
    }

    const nfeData: NFe = {
      id: id,
      numero: parseInt(getTagValue(ide, 'nNF', NFeNamespace) || '0', 10),
      serie: parseInt(getTagValue(ide, 'serie', NFeNamespace) || '0', 10),
      dataEmissao: getTagValue(ide, 'dhEmi', NFeNamespace) || new Date().toISOString(),
      destinatario: {
        nome: getTagValue(dest, 'xNome', NFeNamespace) || 'Não identificado',
        uf: getTagValue(enderDest, 'UF', NFeNamespace) || 'N/A',
      },
      cfop: parseInt(getTagValue(infNFe.getElementsByTagNameNS(NFeNamespace, 'det')[0], 'CFOP', NFeNamespace) || '0', 10),
      situacao: situacao,
      valorTotal: parseFloat(getTagValue(ICMSTot, 'vNF', NFeNamespace) || '0'),
      baseCalculoICMS: parseFloat(getTagValue(ICMSTot, 'vBC', NFeNamespace) || '0'),
      valorICMS: parseFloat(getTagValue(ICMSTot, 'vICMS', NFeNamespace) || '0'),
    };

    return nfeData;

  } catch (e) {
    console.error("Erro ao processar XML da NF-e:", e);
    return null;
  }
}
