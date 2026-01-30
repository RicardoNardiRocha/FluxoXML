export const COMPANY_DOCS_STORAGE_KEY = "contabilidade_company_docs_v1";

function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

export function parseCompanyDocs(raw: string): string[] {
  // Aceita CNPJ (14) e CPF (11), separados por quebra de linha, vírgula, ponto e vírgula, espaço etc.
  const tokens = raw.split(/[\s,;|]+/g).map(onlyDigits).filter(Boolean);
  const docs = tokens.filter(d => d.length === 14 || d.length === 11);
  return Array.from(new Set(docs));
}

export function loadCompanyDocs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = window.localStorage.getItem(COMPANY_DOCS_STORAGE_KEY);
    if (!v) return [];
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr.map(String).map(onlyDigits).filter(d => d.length === 11 || d.length === 14) : [];
  } catch {
    return [];
  }
}

export function saveCompanyDocs(docs: string[]): void {
  if (typeof window === "undefined") return;
  const cleaned = Array.from(new Set(docs.map(String).map(onlyDigits).filter(d => d.length === 11 || d.length === 14)));
  window.localStorage.setItem(COMPANY_DOCS_STORAGE_KEY, JSON.stringify(cleaned));
}

export async function readCompanyDocsFromFile(file: File): Promise<string[]> {
  const text = await file.text();
  return parseCompanyDocs(text);
}