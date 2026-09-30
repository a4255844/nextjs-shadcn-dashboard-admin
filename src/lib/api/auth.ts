import "server-only";

import { createClient } from "@/lib/supabase/server";

/** 当前登录用户（profile 信息已合并） */
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface ProfileRow {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

/**
 * 读取当前登录用户；未登录返回 null。
 * RSC 中调用安全（只读 cookie）。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return null;

  // TODO(phase 2): 用 Supabase CLI 生成 database.types.ts 注入客户端泛型后，
  // 移除这处手写收窄，直接获得编译期类型。
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();
  const profile = data as ProfileRow | null;

  return {
    id: user.id,
    email: user.email ?? "",
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}
