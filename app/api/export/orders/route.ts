import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/api/orders";
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

    const all = await getOrders(orgId);
    const idSet = mode === "selected" && idsParam
      ? new Set(idsParam.split(","))
      : null;
    const rows = idSet ? all.filter((o) => idSet.has(o.id)) : all;

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

    return new NextResponse(csv, {
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
