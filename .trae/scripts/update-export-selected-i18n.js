// 一次性脚本：把 export.current 换成 export.selected（带 {count}），
// 新增 table.select 勾选 aria key，toasts.exportedFiltered -> exportedSelected，
// 顺带把 export 块与相关 toast 的英文占位翻译成各语言。
// 用法：node .trae/scripts/update-export-selected-i18n.js
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "..", "messages");

const L = {
  en: {
    orders: {
      export: { label: "Export", selected: "Export selected ({count})", all: "Export all orders" },
      select: { all: "Select all", row: "Select row" },
      toasts: { exportedAll: "Exported {count} orders", exportedSelected: "Exported {count} selected orders", exportFailed: "Export failed. Please try again." },
      importLabel: "Import",
    },
    customers: {
      export: { label: "Export", selected: "Export selected ({count})", all: "Export all customers" },
      select: { all: "Select all", row: "Select row" },
      toasts: { exportedAll: "Exported {count} customers", exportedSelected: "Exported {count} selected customers", exportFailed: "Export failed. Please try again." },
      importLabel: "Import",
    },
  },
  zh: {
    orders: {
      export: { label: "导出", selected: "导出勾选（{count}）", all: "导出全部订单" },
      select: { all: "全选", row: "选择此行" },
      toasts: { exportedAll: "已导出 {count} 条订单", exportedSelected: "已导出 {count} 条勾选订单", exportFailed: "导出失败，请重试" },
      importLabel: "导入",
    },
    customers: {
      export: { label: "导出", selected: "导出勾选（{count}）", all: "导出全部客户" },
      select: { all: "全选", row: "选择此行" },
      toasts: { exportedAll: "已导出 {count} 位客户", exportedSelected: "已导出 {count} 位勾选客户", exportFailed: "导出失败，请重试" },
      importLabel: "导入",
    },
  },
  de: {
    orders: {
      export: { label: "Export", selected: "Auswahl exportieren ({count})", all: "Alle Bestellungen exportieren" },
      select: { all: "Alle auswählen", row: "Zeile auswählen" },
      toasts: { exportedAll: "{count} Bestellungen exportiert", exportedSelected: "{count} ausgewählte Bestellungen exportiert", exportFailed: "Export fehlgeschlagen. Bitte erneut versuchen." },
      importLabel: "Importieren",
    },
    customers: {
      export: { label: "Export", selected: "Auswahl exportieren ({count})", all: "Alle Kunden exportieren" },
      select: { all: "Alle auswählen", row: "Zeile auswählen" },
      toasts: { exportedAll: "{count} Kunden exportiert", exportedSelected: "{count} ausgewählte Kunden exportiert", exportFailed: "Export fehlgeschlagen. Bitte erneut versuchen." },
      importLabel: "Importieren",
    },
  },
  es: {
    orders: {
      export: { label: "Exportar", selected: "Exportar selección ({count})", all: "Exportar todos los pedidos" },
      select: { all: "Seleccionar todo", row: "Seleccionar fila" },
      toasts: { exportedAll: "{count} pedidos exportados", exportedSelected: "{count} pedidos seleccionados exportados", exportFailed: "Error al exportar. Inténtalo de nuevo." },
      importLabel: "Importar",
    },
    customers: {
      export: { label: "Exportar", selected: "Exportar selección ({count})", all: "Exportar todos los clientes" },
      select: { all: "Seleccionar todo", row: "Seleccionar fila" },
      toasts: { exportedAll: "{count} clientes exportados", exportedSelected: "{count} clientes seleccionados exportados", exportFailed: "Error al exportar. Inténtalo de nuevo." },
      importLabel: "Importar",
    },
  },
  ar: {
    orders: {
      export: { label: "تصدير", selected: "تصدير المحدد ({count})", all: "تصدير جميع الطلبات" },
      select: { all: "تحديد الكل", row: "تحديد الصف" },
      toasts: { exportedAll: "تم تصدير {count} من الطلبات", exportedSelected: "تم تصدير {count} من الطلبات المحددة", exportFailed: "فشل التصدير. حاول مرة أخرى." },
      importLabel: "استيراد",
    },
    customers: {
      export: { label: "تصدير", selected: "تصدير المحدد ({count})", all: "تصدير جميع العملاء" },
      select: { all: "تحديد الكل", row: "تحديد الصف" },
      toasts: { exportedAll: "تم تصدير {count} من العملاء", exportedSelected: "تم تصدير {count} من العملاء المحددين", exportFailed: "فشل التصدير. حاول مرة أخرى." },
      importLabel: "استيراد",
    },
  },
};

// 重建对象，保持 key 顺序：export 后紧跟 select；toasts 中 exportedAll 后紧跟 exportedSelected
function patchTableNs(tableObj, cfg) {
  const out = {};
  for (const [k, v] of Object.entries(tableObj)) {
    if (k === "export") {
      out.export = cfg.export;
      out.select = cfg.select;
    } else if (k === "import") {
      out.import = { ...v, label: cfg.importLabel };
    } else {
      out[k] = v;
    }
  }
  return out;
}

function patchToasts(toastsObj, cfg) {
  const out = {};
  for (const [k, v] of Object.entries(toastsObj)) {
    if (k === "exportedFiltered") continue;
    out[k] = v;
    if (k === "exportedAll") out.exportedSelected = cfg.toasts.exportedSelected;
  }
  out.exportedAll = cfg.toasts.exportedAll;
  out.exportFailed = cfg.toasts.exportFailed;
  return out;
}

for (const locale of Object.keys(L)) {
  const file = path.join(DIR, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const cfg = L[locale];

  const orders = json.pages.orders;
  orders.table = patchTableNs(orders.table, cfg.orders);
  orders.toasts = patchToasts(orders.toasts, cfg.orders);

  const customers = json.customers;
  customers.table = patchTableNs(customers.table, cfg.customers);
  customers.toasts = patchToasts(customers.toasts, cfg.customers);

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`updated ${locale}.json`);
}
