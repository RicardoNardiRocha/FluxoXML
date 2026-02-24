"use client";

import { ClipboardCopy, Code, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_SCRIPT = `function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    var payload = JSON.parse(e.postData.contents);
    var incomingRows = payload.rows;

    incomingRows.forEach(function(row) {
      // 1. Pega cabeçalhos atuais (Sempre atualizado)
      var lastCol = Math.max(sheet.getLastColumn(), 1);
      var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });

      // 2. Se a planilha estiver vazia, cria os cabeçalhos base
      if (lastCol === 1 && (currentHeaders[0] === "" || currentHeaders[0] === "undefined")) {
        var baseHeaders = ["MÊS/ANO", "CNPJ/CPF", "EMPRESA", "QUANTIDADE XML", "TOTAL GERAL"];
        sheet.getRange(1, 1, 1, baseHeaders.length).setValues([baseHeaders]);
        currentHeaders = baseHeaders;
      }

      // 3. Identifica se a linha tem colunas novas (CFOPs novos)
      Object.keys(row).forEach(function(key) {
        var cleanKey = String(key).trim();
        if (currentHeaders.indexOf(cleanKey) === -1) {
          // Encontrou um CFOP novo! Insere antes do "TOTAL GERAL"
          var totalIdx = currentHeaders.indexOf("TOTAL GERAL");
          if (totalIdx !== -1) {
            sheet.insertColumnBefore(totalIdx + 1);
            sheet.getRange(1, totalIdx + 1).setValue(cleanKey);
          } else {
            sheet.getRange(1, sheet.getLastColumn() + 1).setValue(cleanKey);
          }
          // Atualiza a lista de cabeçalhos para as próximas chaves desta mesma linha
          currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
        }
      });

      // 4. Prepara os dados na ordem exata das colunas atuais da planilha
      var finalRowData = currentHeaders.map(function(header) {
        return row[header] !== undefined ? row[header] : "";
      });
      
      // 5. ADICIONA A LINHA (APPEND) - Nunca usa clear ou setValues na área de dados
      sheet.appendRow(finalRowData);
    });

    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Erro: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}`;

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzDg_zE6sbftBIWK_rS-7yAOm1FQ5pNmsP5I7BDqZEPh-VPk5ROOgQuLQtdcZD1kOep/exec";

export function CopyHelper() {
  const { toast } = useToast();

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: title,
      description: "Copiado para a área de transferência!",
      variant: "default",
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Acesso rápido a configurações">
          <ClipboardCopy className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <div className="space-y-1">
          <h4 className="font-medium leading-none">Acesso Rápido</h4>
          <p className="text-xs text-muted-foreground">Copie as informações para o Google Sheets.</p>
        </div>
        <div className="grid gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="justify-start gap-2"
            onClick={() => copyToClipboard(GOOGLE_SCRIPT, "Script Copiado")}
          >
            <Code className="h-4 w-4" />
            Copiar Script Google
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="justify-start gap-2"
            onClick={() => copyToClipboard(WEBHOOK_URL, "URL Copiada")}
          >
            <LinkIcon className="h-4 w-4" />
            Copiar Link Webhook
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}