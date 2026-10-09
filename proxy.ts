import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";
import { getSupabaseAnonKey, getSupabaseUrl } from "./src/lib/supabase/env";

const handleI18nRouting = createIntlMiddleware(routing);

/** 受保护路径（不含 locale 前缀）：未登录一律重定向到登录页 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/customers",
  "/tickets",
  "/profile",
  "/settings",
];

/** 仅未登录可访问的页面：已登录访问时跳转 dashboard */
const AUTH_PAGES = ["/login"];

/**
 * 去掉 pathname 里的 locale 前缀。
 * /en/dashboard -> { locale: "en", path: "/dashboard" }
 * /dashboard    -> { locale: null, path: "/dashboard" }
 */
function splitLocalePrefix(pathname: string): {
  locale: string | null;
  path: string;
} {
  const first = pathname.split("/")[1] ?? "";
  if ((routing.locales as readonly string[]).includes(first)) {
    const rest = pathname.slice(1 + first.length);
    return { locale: first, path: rest === "" ? "/" : rest };
  }
  return { locale: null, path: pathname };
}

function matchesAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export default async function proxy(request: NextRequest) {
  // 1. 创建绑定到"请求-响应"cookie 对的 Supabase 客户端。
  //    官方警告：createServerClient 与 getUser() 之间不得插入其他 await。
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 2. 校验会话。getClaims() 在本地用 JWKS 公钥验证 JWT 签名（首次拉取后
  //    缓存公钥），与 getUser() 同样能防伪造 cookie，但不产生每次导航的
  //    服务端网络往返；token 过期时同样会自动刷新并在 setAll 里重写
  //    cookie（会话续期就在这里发生）。
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  // 3. 路由保护（按去掉 locale 前缀后的路径判断）。
  const { locale, path } = splitLocalePrefix(request.nextUrl.pathname);
  const effectiveLocale = locale ?? routing.defaultLocale;
  const redirectTo = (pathname: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    // query 必须走 search：若混入 pathname，"?" 会被编码成 "%3F" 导致 404
    if (search) url.search = search;
    const response = NextResponse.redirect(url);
    // 重定向响应也要带上可能已刷新的会话 cookie
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => response.cookies.set({ ...c }));
    return response;
  };

  if (matchesAny(path, PROTECTED_PREFIXES) && !user) {
    const loginPath = `/${effectiveLocale}/login`;
    return redirectTo(loginPath, `?redirect=${encodeURIComponent(path)}`);
  }
  if (matchesAny(path, AUTH_PAGES) && user) {
    return redirectTo(`/${effectiveLocale}/dashboard`);
  }

  // 4. 交给 next-intl 处理 locale 路由，并把 Supabase 刷新的 cookie 合并进最终响应。
  const intlResponse = handleI18nRouting(request);
  supabaseResponse.cookies
    .getAll()
    .forEach((c) => intlResponse.cookies.set({ ...c }));
  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
