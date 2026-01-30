"use client";

import { useEffect, useState } from "react";
import { parseCompanyDocs, readCompanyDocsFromFile, loadCompanyDocs, saveCompanyDocs } from "@/lib/company-docs";
import { useToast } from "@/hooks/use-toast";

type Props = {
  onChange: (docs: string[]) => void;
};

export function CompanyDocsPanel({ onChange }: Props) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const docs = loadCompanyDocs();
    setCount(docs.length);
    onChange(docs);
  }, [onChange]);

  const handleSave = () => {
    const docs = parseCompanyDocs(text);
    saveCompanyDocs(docs);
    setCount(docs.length);
    onChange(docs);
    toast({
      title: "Lista de CNPJs/CPFs salva",
      description: `Total: ${docs.length}. Agora você pode importar os arquivos XML.`,
      variant: "success",
    });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const docs = await readCompanyDocsFromFile(file);
    saveCompanyDocs(docs);
    setCount(docs.length);
    onChange(docs);
    toast({
      title: "Lista carregada do arquivo",
      description: `Total: ${docs.length}.`,
      variant: "success",
    });
  };

  const handleClear = () => {
    saveCompanyDocs([]);
    setCount(0);
    setText("");
    onChange([]);
    toast({
      title: "Lista apagada",
      description: "Nenhum CNPJ/CPF definido.",
      variant: "success",
    });
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">CNPJs/CPFs da(s) sua(s) empresa(s)</div>
          <div className="text-sm opacity-70">Define para quais empresas as notas serão filtradas • Total salvo: {count}</div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm cursor-pointer rounded-md border px-3 py-2 hover:bg-muted">
            Importar TXT/CSV
            <input
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <button onClick={handleClear} className="text-sm rounded-md border px-3 py-2 hover:bg-muted">
            Limpar
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cole aqui os CNPJs ou CPFs do(s) emissor(es) (saídas) ou destinatário(s) (entradas) das notas."
        className="w-full min-h-[120px] rounded-md border p-3 text-sm"
      />

      <div className="flex justify-end">
        <button onClick={handleSave} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
          Salvar lista
        </button>
      </div>
    </div>
  );
}
