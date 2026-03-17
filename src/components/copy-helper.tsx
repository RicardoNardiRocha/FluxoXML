"use client";

import { ClipboardCopy, Code, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_SCRIPT = `function doPost(e) {
  var SPREADSHEET_ID = "1M-EjwxL6xzNN1Zrmv88yI_iXD4kHuI_fXsNfeg6Ia0M";
  var SHEET_NAME = "DB"; // troque pelo nome real da aba
  var LOG_SHEET_NAME = "LOG";

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.insertSheet(LOG_SHEET_NAME);
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!e) throw new Error("Objeto 'e' não recebido.");
    if (!e.postData) throw new Error("postData não recebido.");
    if (!e.postData.contents) throw new Error("postData.contents vazio.");

    logSheet.appendRow([
      new Date(),
      "RAW_PAYLOAD",
      e.postData.contents
    ]);

    var payload = JSON.parse(e.postData.contents);

    if (!payload.rows) {
      throw new Error("Payload sem 'rows'. Conteúdo: " + e.postData.contents);
    }

    if (!Array.isArray(payload.rows)) {
      throw new Error("'rows' não é array.");
    }

    var incomingRows = payload.rows;

    if (incomingRows.length === 0) {
      throw new Error("'rows' está vazio.");
    }

    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(function(h) { return String(h).trim(); });

    if (lastCol === 1 && (currentHeaders[0] === "" || currentHeaders[0] === "undefined")) {
      var baseHeaders = ["MÊS/ANO", "CNPJ/CPF", "EMPRESA", "QUANTIDADE XML", "TOTAL GERAL"];
      sheet.getRange(1, 1, 1, baseHeaders.length).setValues([baseHeaders]);
      currentHeaders = baseHeaders;
    }

    incomingRows.forEach(function(originalRow) {
      var row = {};
      Object.keys(originalRow).forEach(function(key) {
        row[String(key).trim()] = originalRow[key];
      });

      Object.keys(row).forEach(function(key) {
        var cleanKey = String(key).trim();
        if (currentHeaders.indexOf(cleanKey) === -1) {
          var totalIdx = currentHeaders.indexOf("TOTAL GERAL");
          if (totalIdx !== -1) {
            sheet.insertColumnBefore(totalIdx + 1);
            sheet.getRange(1, totalIdx + 1).setValue(cleanKey);
          } else {
            sheet.getRange(1, sheet.getLastColumn() + 1).setValue(cleanKey);
          }

          currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
            .map(function(h) { return String(h).trim(); });
        }
      });

      var finalRowData = currentHeaders.map(function(header) {
        return row[header] !== undefined ? row[header] : "";
      });

      sheet.appendRow(finalRowData);
    });

    logSheet.appendRow([
      new Date(),
      "SUCESSO",
      "Linhas recebidas: " + incomingRows.length
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: "Sucesso" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logSheet.appendRow([
      new Date(),
      "ERRO",
      error.toString(),
      e && e.postData ? e.postData.contents : "sem payload"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}`;

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwysEpdJsLiy0IrjtgA7HPBP3tpOIyYuD2lnxm_cam9qmNMU5oaAwfhSvAG3SwKEOA2/exec";

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