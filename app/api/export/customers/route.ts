import { NextRequest, NextResponse } from "next/server";
import { getCustomers } from "@/lib/api/customers";
import { CUSTOMERS_CSV_HEADERS, csvTimestamp, encodeCsv, formatCsvDate } from "@/lib/csv";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const mode = searchParams.get("mode");
    const idsParam = searchParams.get("ids");

    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const all = await getCustomers(orgId);
    const idSet = mode === "selected" && idsParam
      ? new Set(idsParam.split(","))
      : null;
    const rows = idSet ? all.filter((c) => idSet.has(c.id)) : all;

    const csv = encodeCsv([...CUSTOMERS_CSV_HEADERS], rows.map((c) => [
      c.name,
      c.email,
      c.company,
      c.status,
      c.spent,
      formatCsvDate(c.createdAt),
    ]));

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": `attachment; filename="customers-${csvTimestamp()}.csv"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
