import "server-only";

import { createClient } from "@/lib/supabase/server";

// profiles 表探测结果（供 health 检查等场景使用）
export type ProfilesProbeResult =
  | { ok: true; state: "exists" | "missing"; message: string }
  | { ok: false; state: "unreachable" | "misconfigured"; message: string };

// 探测 profiles 表是否可访问。
// 注意：不要用 head: true——HEAD 请求无响应体，表不存在时 supabase-js
// 解析不到 PGRST205 错误体，会误判为"表存在"。
export async function probeProfilesTable(): Promise<ProfilesProbeResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error === null) {
      return { ok: true, state: "exists", message: "profiles table exists" };
    }
    if (error.code === "PGRST205") {
      return {
        ok: true,
        state: "missing",
        message: "connected; profiles table not created yet (expected at phase 0)",
      };
    }
    return {
      ok: false,
      state: "misconfigured",
      message: `${error.code}: ${error.message}`,
    };
  } catch (e) {
    return {
      ok: false,
      state: "unreachable",
      message: e instanceof Error ? e.message : "unknown error",
    };
  }
}
