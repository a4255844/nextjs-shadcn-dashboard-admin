import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// 服务端 Supabase 客户端（RSC / Route Handler / Server Action 中使用）。
// 每次请求调用一次，不要模块级单例——cookie 是请求级上下文。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 在纯 RSC 中调用时 set 会抛错——可安全忽略，
            // 前提是 proxy(原 middleware) 里已做会话刷新（第 1 阶段接入）。
          }
        },
      },
    },
  );
}
