// Supabase 环境变量读取（信任边界：进程环境 -> 类型化值）
// 懒加载：不要在模块顶层求值，保证无 env 时 next build 不炸，运行时才报错。

function requireEnv(name: string, value: string | undefined): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.example to .env.local and fill in your Supabase project values.`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  // 必须以静态字面量访问 process.env.NEXT_PUBLIC_*：Next.js 在编译时
  // 把这种访问替换成真实值内联进浏览器 bundle；动态索引 process.env[name]
  // 无法被替换，在浏览器端恒为 undefined。
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getSupabaseAnonKey(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
