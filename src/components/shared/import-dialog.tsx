"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Download, X } from "lucide-react";
import { parseCsv, triggerDownload } from "@/lib/csv";
import { encodeCsv } from "@/lib/csv";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ImportResult } from "@/lib/actions/imports";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** CSV 文件的 MIME accept 值 */
  accept?: string;
  /** 展示给用户的列名（用于预览表头） */
  columnLabels: readonly string[];
  /** action 调用函数 */
  actionFn: (orgId: string, formData: FormData) => Promise<ImportResult>;
  orgId: string;
  /** i18n namespace key（如 "customers.import"） */
  tNamespace: string;
}

interface ParsedFile {
  file: File;
  headers: string[];
  rows: string[][];
}

export default function ImportDialog({
  open,
  onOpenChange,
  accept = ".csv,text/csv,application/vnd.ms-excel",
  columnLabels,
  actionFn,
  orgId,
  tNamespace,
}: ImportDialogProps) {
  const t = useTranslations(tNamespace);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const reset = useCallback(() => {
    setParsed(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const onOpenChangeWrapped = (next: boolean) => {
    if (next === false) reset();
    onOpenChange(next);
  };

  const handleFile = useCallback(async (file: File) => {
    setResult(null);
    if (!/\.csv$/i.test(file.name)) {
      toast.error(t("errors.notCsv"));
      return;
    }
    const text = await file.text();
    const p = parseCsv(text);
    if (p.headers.length === 0) {
      toast.error(t("errors.emptyFile"));
      return;
    }
    setParsed({ file, headers: p.headers, rows: p.rows });
  }, [t]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onImport = () => {
    if (!parsed) return;
    setResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", parsed.file);
      const res = await actionFn(orgId, fd);
      setResult(res);
      if (res.ok) {
        toast.success(t("toasts.success", { count: res.inserted }));
      } else if (res.errors.length === 0 && res.inserted === 0) {
        toast.error(t("toasts.nothing"));
      }
      // 部分成功或错误：result 里会显示，不用 toast 额外说明
    });
  };

  const onDownloadErrors = () => {
    if (!result || result.ok || result.errors.length === 0) return;
    const headers = ["Row", "Field", "Error"];
    const rows = result.errors.map((e) => [
      String(e.row),
      e.field ?? "",
      translateError(e.message, tNamespace),
    ]);
    triggerDownload(`import-errors-${Date.now()}.csv`, encodeCsv(headers, rows));
  };

  const rowCount = parsed?.rows.length ?? 0;
  const hasFile = parsed !== null && !result;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapped}>
      <DialogContent className="max-w-2xl gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base">{t("title")}</DialogTitle>
          <DialogDescription className="mt-1">{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
          {!parsed && !result && (
            <label
              className={[
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40",
              ].join(" ")}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("dropHint")}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="underline">{t("browse")}</span>
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={onInputChange}
              />
            </label>
          )}

          {hasFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm">
                <FileSpreadsheet className="size-4 text-primary" />
                <span className="flex-1 truncate font-medium">
                  {parsed!.file.name}
                </span>
                <span className="text-muted-foreground">
                  {t("preview", { count: rowCount })}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="cursor-pointer"
                  onClick={reset}
                  aria-label={t("clear")}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("previewHint")}
              </p>
              <div className="max-h-64 overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium text-muted-foreground">#</th>
                      {parsed!.headers.map((h, i) => (
                        <th key={i} className="px-2 py-1 text-left font-medium truncate max-w-40">
                          {h || `col-${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed!.rows.slice(0, 10).map((row, ri) => (
                      <tr key={ri} className="border-t border-border/50">
                        <td className="px-2 py-1 text-muted-foreground">{ri + 1}</td>
                        {parsed!.headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 truncate max-w-40" title={row[ci]}>
                            {row[ci] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsed!.rows.length > 10 && (
                      <tr>
                        <td
                          colSpan={parsed!.headers.length + 1}
                          className="px-2 py-2 text-center text-muted-foreground"
                        >
                          … {parsed!.rows.length - 10} {t("moreRows")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("requiredHint")}: {columnLabels.slice(0, 3).join(", ")}
              </div>
            </div>
          )}

          {result && <ResultPanel result={result} t={t} onDownloadErrors={onDownloadErrors} />}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChangeWrapped(false)}
          >
            {t("cancel")}
          </Button>
          {parsed && !result && (
            <Button
              className="cursor-pointer"
              disabled={isPending}
              onClick={onImport}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("importing")}
                </>
              ) : (
                t("submit", { count: rowCount })
              )}
            </Button>
          )}
          {result && (
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={reset}
            >
              {t("importAnother")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= helpers =============

function ResultPanel({
  result,
  t,
  onDownloadErrors,
}: {
  result: ImportResult;
  t: (key: string, opts?: Record<string, string | number>) => string;
  onDownloadErrors: () => void;
}) {
  const hasErrors = !result.ok && result.errors.length > 0;

  return (
    <div className="space-y-3">
      {result.ok ? (
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{t("result.success", { count: result.inserted })}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("result.detailAll", { total: result.totalRows })}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          {result.inserted > 0 ? (
            <AlertCircle className="size-5 text-chart-2 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-3">
            {result.inserted > 0 ? (
              <p className="font-medium">
                {t("result.partial", { inserted: result.inserted, count: result.errors.length })}
              </p>
            ) : (
              <p className="font-medium">{t("result.failed", { count: result.errors.length })}</p>
            )}
            {hasErrors && (
              <>
                <ErrorTable errors={result.errors} t={t} />
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={onDownloadErrors}>
                  <Download className="size-4" />
                  {t("downloadErrors")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorTable({
  errors,
  t,
}: {
  errors: { row: number; field?: string; message: string }[];
  t: (key: string, opts?: Record<string, string | number>) => string;
}) {
  const showAll = errors.length <= 10;
  const visible = showAll ? errors : errors.slice(0, 10);
  return (
    <div className="rounded border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Row</th>
            <th className="px-2 py-1 text-left font-medium">Field</th>
            <th className="px-2 py-1 text-left font-medium">{t("error")}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((e, i) => (
            <tr key={i} className="border-t border-border/50">
              <td className="px-2 py-1">{e.row}</td>
              <td className="px-2 py-1 text-muted-foreground">{e.field ?? "-"}</td>
              <td className="px-2 py-1">{translateError(e.message, "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!showAll && (
        <p className="px-2 py-1 text-xs text-muted-foreground border-t border-border/50">
          … {errors.length - 10} {t("moreErrors")}
        </p>
      )}
    </div>
  );
}

/** 将 action 返回的英文错误码翻译成用户可读消息。共享给 dialog 用。 */
function translateError(code: string, _namespace: string): string {
  // 用硬编码映射（避免在这个共享 helper 里再调 useTranslations）
  const MAP: Record<string, string> = {
    no_file: "No file uploaded",
    empty_file: "File is empty",
    not_csv: "File is not a CSV",
    missing_column_email: "CSV must contain an Email column",
    missing_column_name: "CSV must contain a Name column",
    missing_column_company: "CSV must contain a Company column",
    required: "This field is required",
    tooLong: "Text is too long",
    invalidAmount: "Enter a valid amount",
    invalidStatus: "Status value not recognized",
    invalidEmail: "Enter a valid email address",
    invalidCustomer: "No customer with this email in the organization",
    duplicateEmail: "Email already exists in the organization",
    network: "Network error, please try again",
    forbidden: "No permission to import",
  };
  return MAP[code] ?? code;
}
