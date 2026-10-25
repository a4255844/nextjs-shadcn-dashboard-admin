import { NextRequest, NextResponse } from "next/server";
import { getAllCustomers } from "@/lib/api/customers";
import { hasPermissionInOrg } from "@/lib/api/roles";
import { CUSTOMER_SCOPE_KEYS, parseCustomerScope } from "@/lib/permissions";
import { parseStatus } from "@/components/dashboards/customers/types";
import { CUSTOMERS_CSV_HEADERS, csvTimestamp, encodeCsv, formatCsvDate } from "@/lib/csv";

// 分群作用域绑定的状态，由服务端推导，不信任客户端传入的 status
const SCOPE_STATUS = { high_value: "vip", at_risk: "atRisk" } as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const mode = searchParams.get("mode");
    const idsParam = searchParams.get("ids");
    // 三个子菜单各自独立授权；分群作用域的状态由服务端决定，
    // 否则只有 customers.high_value.export 的人可以借 scope 导出全部客户。
    const scope = parseCustomerScope(searchParams.get("scope"));
    const scopeStatus = scope === "all" ? null : SCOPE_STATUS[scope];
    const status = scopeStatus ?? parseStatus(searchParams.get("status"));

    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    // 服务端权限校验：按作用域校验导出权限（RLS 仍为兜底）
    if (!(await hasPermissionInOrg(orgId, CUSTOMER_SCOPE_KEYS[scope].export))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // selected 模式直接按 id 查（org_id 已限定，RLS 再兜底），不再拉全表后内存过滤
    const ids =
      mode === "selected" && idsParam
        ? idsParam.split(",").filter((id) => id !== "")
        : null;
    const rows = await getAllCustomers(orgId, ids, status);

    const csv = encodeCsv([...CUSTOMERS_CSV_HEADERS], rows.map((c) => [
      c.name,
      c.email,
      c.company,
      c.status,
      c.spent,
      formatCsvDate(c.createdAt),
    ]));

    return new NextResponse(`\ufeff${csv}`, {
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
