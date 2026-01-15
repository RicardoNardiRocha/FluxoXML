import type { NFe } from './data';

const NFE_NS = "http://www.portalfiscal.inf.br/nfe";

function firstEl(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): Element | undefined {
  if (!xml) return undefined;
  const list = xml.getElementsByTagNameNS(ns, tag);
  return list && list.length ? (list[0] as Element) : undefined;
}

function tagText(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): string | undefined {
  return firstEl(xml, tag, ns)?.textContent ?? undefined;
}

function attr(xml: Element | Document | null | undefined, attribute: string): string | undefined {
  return (xml as Element | undefined)?.getAttribute?.(attribute) ?? undefined;
}

function num(v: string | undefined, fallback = 0): number {
  const n = v ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function int(v: string | undefined, fallback = 0): number {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}


export type ParseResult =
  | { kind: "nfe"; nfe: NFe }
  | { kind: "cancelamento"; chave: string };

export function processNFeXML(xmlText: string): ParseResult | null {
  try {
    const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (xmlDoc.querySelector("parsererror")) return null;

    const infEvento = firstEl(xmlDoc, "infEvento");
    const tpEvento = tagText(infEvento, "tpEvento");
    const descEvento = tagText(firstEl(xmlDoc, "detEvento"), "descEvento")?.toLowerCase();

    const isCancelEvent = tpEvento === "110111" || (descEvento?.includes("cancel") ?? false);
    if (isCancelEvent) {
      const cStatEv =
        tagText(firstEl(firstEl(xmlDoc, "retEvento"), "infEvento"), "cStat") ??
        tagText(infEvento, "cStat");

      const chave = tagText(infEvento, "chNFe") ?? tagText(firstEl(xmlDoc, "infProt"), "chNFe");
      if (!chave) return null;

      if (cStatEv === "135" || cStatEv === "155" || cStatEv === "101" || cStatEv === "151") {
        return { kind: "cancelamento", chave };
      }

      return null;
    }

    const nfeProc = xmlDoc.getElementsByTagNameNS(NFE_NS, "nfeProc")[0] ?? xmlDoc.getElementsByTagName("nfeProc")[0];
    const nfeNode = xmlDoc.getElementsByTagNameNS(NFE_NS, "NFe")[0];
    const rootEl = (nfeProc || nfeNode) as Element | undefined;
    if (!rootEl) return null;

    const infNFe = firstEl(rootEl, "infNFe");
    if (!infNFe) return null;

    const ide = firstEl(infNFe, "ide");
    const emit = firstEl(infNFe, "emit");
    const dest = firstEl(infNFe, "dest");
    const enderDest = firstEl(dest, "enderDest");

    const total = firstEl(infNFe, "total");
    const icmsTot = firstEl(total, "ICMSTot");

    const idAttr = attr(infNFe, "Id");
    const chave = idAttr?.startsWith("NFe") ? idAttr.slice(3) : (tagText(firstEl(rootEl, "infProt"), "chNFe") ?? `temp-${Math.random()}`);

    const det0 = firstEl(infNFe, "det");
    const cfop = int(tagText(det0, "CFOP"));

    const nfe: NFe = {
      id: chave,
      numero: int(tagText(ide, "nNF")),
      serie: int(tagText(ide, "serie")),
      dataEmissao: tagText(ide, "dhEmi") ?? tagText(ide, "dEmi") ?? new Date().toISOString(),
      emitente: {
        nome: tagText(emit, "xNome") ?? "Não identificado",
        cnpj: tagText(emit, "CNPJ") ?? "N/A",
        ie: tagText(emit, "IE") ?? "N/A",
      },
      destinatario: {
        nome: tagText(dest, "xNome") ?? "Consumidor Final",
        uf: tagText(enderDest, "UF") ?? "N/A",
      },
      cfop,
      situacao: "Autorizada",
      valorTotal: num(tagText(icmsTot, "vNF")),
      baseCalculoICMS: num(tagText(icmsTot, "vBC")),
      valorICMS: num(tagText(icmsTot, "vICMS")),
    };

    return { kind: "nfe", nfe };
  } catch {
    return null;
  }
}
