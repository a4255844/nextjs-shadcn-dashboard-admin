"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// 浏览器端 Supabase 客户端（Client Components 中使用）。
// anon key 本来就是公开的，安全边界靠 RLS，不靠隐藏 key。
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
