import type { NFe } from "./data";

const NFE_NS = "http://www.portalfiscal.inf.br/nfe";

function firstEl(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): Element | undefined {
  if (!xml) return undefined;

  const listNS = (xml as any).getElementsByTagNameNS?.(ns, tag) as HTMLCollectionOf<Element> | undefined;
  if (listNS && listNS.length) return listNS[0] as Element;

  const list = (xml as any).getElementsByTagName?.(tag) as HTMLCollectionOf<Element> | undefined;
  if (list && list.length) return list[0] as Element;

  return undefined;
}

function allEls(xml: Element | Document | null | undefined, tag: string, ns = NFE_NS): Element[] {
  if (!xml) return [];

  const listNS = (xml as any).getElementsByTagNameNS?.(ns, tag) as HTMLCollectionOf<Element> | undefined;
  if (listNS && listNS.length) return Array.from(listNS);

  const list = (xml as any).getElementsByTagName?.(tag) as HTMLCollectionOf<Element> | undefined;
  return list && list.length ? Array.from(list) : [];
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
  empresaDoc?: string; // ✅ doc do cliente atribuído
  perspectiva: "entrada" | "saida" | "terceiro";
  cfops: number[];
  cfopResumo: Record<number, { vProd: number; qtdItens: number }>;
};

export type ParseResult =
  | { kind: "nfe"; nfe: NFe; meta: ParseMeta }
  | { kind: "cancelamento"; chave: string };

export function processNFeXML(
  xmlText: string,
  opts?: { companyDocs?: string[] } // CNPJs/CPFs (somente dígitos) da(s) empresa(s) do seu "universo"
): ParseResult | null {
  try {
    const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (xmlDoc.querySelector("parsererror")) return null;

    // =========================
    // 1) EVENTO (Cancelamento)
    // =========================
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

    // =========================
    // 2) NF-e
    // =========================
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

    // Chave
    const idAttr = attr(infNFe, "Id");
    const chave =
      idAttr?.startsWith("NFe")
        ? idAttr.slice(3)
        : tagText(firstEl(rootEl, "infProt"), "chNFe") ?? `temp-${Math.random()}`;

    // Situação (protocolo)
    const cStat = tagText(firstEl(rootEl, "infProt"), "cStat");
    const situacao: NFe["situacao"] = cStat === "100" ? "Autorizada" : "Autorizada";

    // Docs / tpNF
    const tpNF = tagText(ide, "tpNF") as "0" | "1" | undefined;
    const emitCNPJ = onlyDigits(tagText(emit, "CNPJ"));
    const destCNPJ = onlyDigits(tagText(dest, "CNPJ"));
    const destCPF = onlyDigits(tagText(dest, "CPF"));

    const companyDocsArr = (opts?.companyDocs ?? []).map(onlyDigits).filter(Boolean);
    const companySet = new Set(companyDocsArr);

    // Perspectiva do SEU universo:
    let perspectiva: ParseMeta["perspectiva"] = "terceiro";
    let empresaDoc: string | undefined;

    if (companySet.size) {
      if (destCNPJ && companySet.has(destCNPJ)) {
        perspectiva = "entrada";
        empresaDoc = destCNPJ;
      } else if (destCPF && companySet.has(destCPF)) {
        perspectiva = "entrada";
        empresaDoc = destCPF;
      } else if (emitCNPJ && companySet.has(emitCNPJ)) {
        // se a empresa está no emitente: tpNF=1 é saída, tpNF=0 é entrada (NF de entrada própria)
        perspectiva = tpNF === "1" ? "saida" : "entrada";
        empresaDoc = emitCNPJ;
      } else {
        perspectiva = "terceiro";
      }
    }

    // CFOP por item (não só primeiro det)
    const dets = allEls(infNFe, "det");
    const cfopResumo: ParseMeta["cfopResumo"] = {};
    const cfops: number[] = [];

    for (const det of dets) {
      const prod = firstEl(det, "prod");
      const cf = int(tagText(prod ?? det, "CFOP"));
      if (!cf) continue;

      const vProd = num(tagText(prod ?? det, "vProd"));
      cfops.push(cf);

      if (!cfopResumo[cf]) cfopResumo[cf] = { vProd: 0, qtdItens: 0 };
      cfopResumo[cf].vProd += vProd;
      cfopResumo[cf].qtdItens += 1;
    }

    // CFOP principal = maior vProd somado
    const cfopPrincipal =
      Object.entries(cfopResumo).sort((a, b) => b[1].vProd - a[1].vProd)[0]?.[0] ?? "0";

    // Finalidade / devolução
    const finNFe = tagText(ide, "finNFe");
    const natOp = (tagText(ide, "natOp") ?? "").toLowerCase();
    const isDevolucao =
      finNFe === "4" ||
      natOp.includes("devolu") ||
      cfops.some((c) => c === 1202 || c === 2202);

    const nfe: NFe = {
      id: chave,
      numero: int(tagText(ide, "nNF")),
      serie: int(tagText(ide, "serie")),
      dataEmissao: tagText(ide, "dhEmi") ?? tagText(ide, "dEmi") ?? new Date().toISOString(),

      // ✅ atribuição do cliente
      empresaDoc: empresaDoc,

      emitente: {
        nome: tagText(emit, "xNome") ?? "Não identificado",
        cnpj: tagText(emit, "CNPJ") ?? "N/A",
        ie: tagText(emit, "IE") ?? "N/A",
        uf: tagText(enderEmit, "UF") ?? "N/A",
      },
      destinatario: {
        nome: tagText(dest, "xNome") ?? "Consumidor Final",
        uf: tagText(enderDest, "UF") ?? "N/A",
      },
      cfop: int(cfopPrincipal),
      situacao,
      finalidade: isDevolucao ? "Devolução" : "Normal",
      valorTotal: num(tagText(icmsTot, "vNF")),
      baseCalculoICMS: num(tagText(icmsTot, "vBC")),
      valorICMS: num(tagText(icmsTot, "vICMS")),
    };

    return {
      kind: "nfe",
      nfe,
      meta: {
        chave,
        tpNF,
        emitCNPJ: emitCNPJ || undefined,
        destCNPJ: destCNPJ || undefined,
        destCPF: destCPF || undefined,
        empresaDoc,
        perspectiva,
        cfops: Array.from(new Set(cfops)),
        cfopResumo,
      },
    };
  } catch {
    return null;
  }
}