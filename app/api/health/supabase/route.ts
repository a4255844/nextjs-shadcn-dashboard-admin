import { NextResponse } from "next/server";
import { probeProfilesTable } from "@/lib/api/profiles";

// 第 0 阶段验收端点：GET /api/health/supabase
// 查询逻辑收敛在 src/lib/api/ 数据访问层，本 route 只负责 HTTP 映射。
export async function GET() {
  const probe = await probeProfilesTable();

  return NextResponse.json(
    {
      ok: probe.ok,
      supabase: probe.ok ? "reachable" : probe.state,
      detail: probe.message,
    },
    { status: probe.ok ? 200 : 500 },
  );
}
