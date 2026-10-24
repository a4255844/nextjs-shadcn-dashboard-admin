import { NextRequest, NextResponse } from "next/server";
import { getOrdersForExport } from "@/lib/api/orders";
import { ORDERS_CSV_HEADERS, csvTimestamp, encodeCsv, formatCsvDate } from "@/lib/csv";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const mode = searchParams.get("mode");
    const idsParam = searchParams.get("ids");

    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    // selected 模式直接按 id 查（org_id 已限定，RLS 再兜底），不再拉全表后内存过滤
    const ids =
      mode === "selected" && idsParam
        ? idsParam.split(",").filter((id) => id !== "")
        : null;
    const rows = await getOrdersForExport(orgId, ids);

    const csv = encodeCsv([...ORDERS_CSV_HEADERS], rows.map((o) => [
      o.number,
      o.customerName,
      o.customerEmail,
      o.status,
      o.amount.toFixed(2),
      o.paymentMethod ?? "",
      o.notes ?? "",
      formatCsvDate(o.createdAt),
    ]));

    return new NextResponse(`\ufeff${csv}`, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": `attachment; filename="orders-${csvTimestamp()}.csv"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
