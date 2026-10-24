/**
 * 薄封装 papaparse 的 CSV 编解码工具。
 * 两端通用（server / client），仅暴露本项目需要的最小 API。
 */
import Papa from "papaparse";

/** Excel 公式注入防护：以 = + - @ 或制表符/回车开头的单元格会被当公式执行 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const GUARDED_PREFIX = /^'(?=[=+\-@\t\r])/;

function guardCell(v: string): string {
  return FORMULA_PREFIX.test(v) ? `'${v}` : v;
}

/** 将二维数组（含 header 行）编码成 CSV 字符串 */
export function encodeCsv(
  headers: string[],
  rows: readonly (readonly (string | number | boolean | null)[])[],
): string {
  return Papa.unparse({
    fields: headers,
    data: rows.map((r) =>
      r.map((cell) => (typeof cell === "string" ? guardCell(cell) : (cell ?? ""))),
    ),
  });
}

/** CSV 解析结果（原始字符串二维数组 + headers 行） */
export interface CsvParseResult {
  headers: string[];
  /** 不含 header 的数据行，每行是字符串数组（空值为 ""） */
  rows: string[][];
  /** papaparse 报告的解析错误（如字段数不一致、未闭合引号） */
  errors: Papa.ParseError[];
}

/** 按行解析 CSV：返回 headers + 数据行（纯 string[][]，不做类型推断） */
export function parseCsv(text: string): CsvParseResult {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
    // 手动处理 BOM：papaparse 默认去掉 UTF-8 BOM 但遇到某些环境保留前导 \ufeff
  });
  const all = result.data;
  if (all.length === 0) return { headers: [], rows: [], errors: result.errors };

  // strip BOM 可能出现在第一个 header 上
  const headers = (all[0] ?? []).map((h) => h.replace(/^\ufeff/, "").trim());
  // 还原导出时加的公式防护前缀，保证"导出 → 导入"往返无损
  const rows = all.slice(1).map((row) =>
    row.map((c) => c.replace(GUARDED_PREFIX, "")),
  );

  return { headers, rows, errors: result.errors };
}

/**
 * 列名匹配：忽略空白和大小写。
 * 例："Customer Email" == "  customer_email "
 */
export function matchHeader(
  headers: readonly string[],
  candidates: readonly string[],
): number | null {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s_-]+/g, "");
  const targetNorms = candidates.map(norm);
  for (let i = 0; i < headers.length; i++) {
    const hn = norm(headers[i] ?? "");
    if (hn === "") continue;
    if (targetNorms.some((tn) => tn === hn)) return i;
  }
  return null;
}

/** 生成 "YYYYMMDD-HHmmss" 时间戳字符串（用于 CSV 文件名） */
export function csvTimestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "-" +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

/** CSV 里统一的日期格式：YYYY-MM-DD HH:mm */
export function formatCsvDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Customers 导出列（与导入契约一致，Created At 供参考） */
export const CUSTOMERS_CSV_HEADERS = [
  "Name",
  "Email",
  "Company",
  "Status",
  "Spent",
  "Created At",
] as const;

/** Orders 导出列（Order Number / Customer 仅供对照，导入时忽略） */
export const ORDERS_CSV_HEADERS = [
  "Order Number",
  "Customer",
  "Email",
  "Status",
  "Amount",
  "Payment Method",
  "Notes",
  "Created At",
] as const;

/** 下载触发（客户端）：生成 Blob + ObjectURL 并自动点击 */
export function triggerDownload(filename: string, csvContent: string): void {
  // 加 BOM 让 Excel 正确识别 UTF-8
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
