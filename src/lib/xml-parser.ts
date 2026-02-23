
import type { NFe } from "./data";

const NFE_NS = "http://www.portalfiscal.inf.br/nfe";

/**
 * Funções auxiliares para navegação no DOM do XML
 */
function firstEl(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): Element | undefined {
  if (!xml) return undefined;
  const list = xml.getElementsByTagNameNS?.(ns, tag);
  return list?.[0];
}

function allEls(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): Element[] {
  if (!xml) return [];
  const list = xml.getElementsByTagNameNS?.(ns, tag);
  return list ? Array.from(list) : [];
}

function tagText(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): string | undefined {
  return firstEl(xml, tag, ns)?.textContent?.trim() ?? undefined;
}

function attr(xml: Element | Document | null | undefined, attribute: string): string | undefined {
  return (xml as Element | undefined)?.getAttribute?.(attribute) ?? undefined;
}

function onlyDigits(v?: string): string {
  return (v ?? "").replace(/\D/g, "");
}

function num(v: string | undefined, fallback = 0): number {
  const n = v ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function int(v: string | undefined, fallback = 0): number {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export type ParseMeta = {
  chave: string;
  tpNF?: "0" | "1";
  emitCNPJ?: string;
  destCNPJ?: string;
  destCPF?: string;
  empresaDoc?: string;
  perspectiva: "entrada" | "saida" | "terceiro";
  cfops: number[];
  cfopResumo: Record<number, { vProd: number; qtdItens: number }>;
};

export type ParseResult =
  | { kind: "nfe"; nfe: NFe; meta: ParseMeta }
  | { kind: "cancelamento"; chave: string };

/**
 * Função principal para processar o conteúdo de um arquivo XML de NF-e
 */
export function processNFeXML(
  xmlText: string,
  opts?: { companyDocs?: string[] }
): ParseResult | null {
  try {
    const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (xmlDoc.querySelector("parsererror")) return null;

    // 1) Verificação de Cancelamento (Evento)
    const infEvento = firstEl(xmlDoc, "infEvento");
    const tpEvento = tagText(infEvento, "tpEvento");
    if (tpEvento === "110111") {
      const chave = tagText(infEvento, "chNFe") || tagText(firstEl(xmlDoc, "infProt"), "chNFe");
      if (chave) return { kind: "cancelamento", chave };
    }

    // 2) Processamento da NF-e
    const nfeProc = firstEl(xmlDoc, "nfeProc");
    const nfeNode = firstEl(xmlDoc, "NFe");
    const rootEl = (nfeProc || nfeNode) as Element | undefined;
    if (!rootEl) return null;

    const infNFe = firstEl(rootEl, "infNFe");
    if (!infNFe) return null;

    const ide = firstEl(infNFe, "ide");
    const emit = firstEl(infNFe, "emit");
    const enderEmit = firstEl(emit, "enderEmit");
    const dest = firstEl(infNFe, "dest");
    const enderDest = firstEl(dest, "enderDest");
    const total = firstEl(infNFe, "total");
    const icmsTot = firstEl(total, "ICMSTot");

    // Identificação Básica
    const idAttr = attr(infNFe, "Id");
    const chave = idAttr?.startsWith("NFe") 
      ? idAttr.slice(3) 
      : tagText(firstEl(rootEl, "infProt"), "chNFe") || `temp-${Math.random()}`;

    const tpNF = tagText(ide, "tpNF") as "0" | "1" | undefined;
    const emitCNPJ = onlyDigits(tagText(emit, "CNPJ"));
    const destCNPJ = onlyDigits(tagText(dest, "CNPJ"));
    const destCPF = onlyDigits(tagText(dest, "CPF"));

    // Lógica de Perspectiva (Entrada/Saída/Terceiro)
    const companyDocsArr = (opts?.companyDocs ?? []).map(onlyDigits).filter(Boolean);
    const companySet = new Set(companyDocsArr);

    let perspectiva: ParseMeta["perspectiva"] = "terceiro";
    let empresaDoc: string | undefined;

    if (companySet.size > 0) {
      if ((destCNPJ && companySet.has(destCNPJ)) || (destCPF && companySet.has(destCPF))) {
        perspectiva = "entrada";
        empresaDoc = destCNPJ || destCPF;
      } else if (emitCNPJ && companySet.has(emitCNPJ)) {
        perspectiva = tpNF === "1" ? "saida" : "entrada";
        empresaDoc = emitCNPJ;
      }
    } else {
      perspectiva = tpNF === '1' ? 'saida' : 'entrada';
    }

    // Processamento de Itens e CFOPs
    const dets = allEls(infNFe, "det");
    const cfopResumo: ParseMeta["cfopResumo"] = {};
    const cfops: number[] = [];

    for (const det of dets) {
      const prod = firstEl(det, "prod");
      const cf = int(tagText(prod, "CFOP"));
      if (!cf) continue;

      const vProd = num(tagText(prod, "vProd"));
      cfops.push(cf);

      if (!cfopResumo[cf]) cfopResumo[cf] = { vProd: 0, qtdItens: 0 };
      cfopResumo[cf].vProd += vProd;
      cfopResumo[cf].qtdItens += 1;
    }

    // O CFOP Principal da nota é aquele que representa o maior valor financeiro
    const cfopPrincipal = Object.entries(cfopResumo)
      .sort((a, b) => b[1].vProd - a[1].vProd)[0]?.[0] || "0";

    // Finalidade e Verificação de Devolução
    const finNFe = tagText(ide, "finNFe");
    const natOp = (tagText(ide, "natOp") ?? "").toLowerCase();
    const isDevolucao = finNFe === "4" || natOp.includes("devolu") || 
                       cfops.some(c => [1202, 2202, 5202, 6202, 1411, 2411, 5411, 6411].includes(c));

    const nfe: NFe = {
      id: chave,
      numero: int(tagText(ide, "nNF")),
      serie: int(tagText(ide, "serie")),
      dataEmissao: tagText(ide, "dhEmi") ?? tagText(ide, "dEmi") ?? new Date().toISOString(),
      empresaDoc,
      emitente: {
        nome: tagText(emit, "xNome") ?? "Desconhecido",
        cnpj: onlyDigits(tagText(emit, "CNPJ")),
        ie: tagText(emit, "IE") ?? "N/A",
        uf: tagText(enderEmit, "UF") ?? "SP",
      },
      destinatario: {
        nome: tagText(dest, "xNome") ?? "Consumidor Final",
        cnpj: onlyDigits(tagText(dest, "CNPJ") || tagText(dest, "CPF")),
        ie: tagText(dest, "IE") ?? "N/A",
        uf: tagText(enderDest, "UF") ?? "SP",
      },
      cfop: int(cfopPrincipal),
      situacao: "Autorizada",
      finalidade: isDevolucao ? "Devolução" : "Normal",
      valorTotal: num(tagText(icmsTot, "vNF")),
      baseCalculoICMS: num(tagText(icmsTot, "vBC")),
      valorICMS: num(tagText(icmsTot, "vICMS")),
    };

    return { kind: "nfe", nfe, meta: { chave, tpNF, emitCNPJ, destCNPJ, perspectiva, cfops, cfopResumo } };
  } catch {
    return null;
  }
}
